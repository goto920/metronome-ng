import { AudioManager } from './AudioManager';
import type { MetronomePattern, LoopTableRow } from '../types/metronome';

export interface MetronomeConfig {
  bpm: number;
  pattern: MetronomePattern;
  metroSound: string;
  voiceOn: boolean;
  voice: 'female' | 'male';
  drumsOn: boolean;
  swingVal: number;
  masterVol: number;
  evenVol: number;
  increment: number;
  perBars: number;
  muteBars: number;
  muteProb: number;
  minBpm: number;
  maxBpm: number;
  timerSeconds: number;
  timerBars: number;
}

export type BeatCallback = (beat: number, bar: number, isMuted: boolean) => void;
export type TempoChangeCallback = (newBpm: number) => void;
export type TimerCallback = (timeRemaining: number, barsRemaining: number) => void;
export type LoopStatusCallback = (seq: number, repeat: number, bar: number) => void;

export class MetronomeEngine {
  private audioManager: AudioManager;
  private worker: Worker | null = null;

  public config: MetronomeConfig;
  public isPlaying: boolean = false;
  private nextNoteTime: number = 0;
  private currentNoteIndex: number = 0;
  private barCount: number = 0;

  private readonly scheduleAheadTime: number = 0.1;

  // 練習用ステータス
  private muteCount: number = 0;
  private isMuted: boolean = false;
  private startTime: number = 0;
  private timeRemaining: number = 0;
  private barsRemaining: number = 0;

  // ★ カスタムループ（シーケンサー）専用ステータス
  private isLoopMode: boolean = false;
  private loopTable: LoopTableRow[] = [];
  private loopSeqIndex: number = 0;     // 現在のテーブル行
  private loopRepeatCount: number = 1;  // 現在の行の繰り返し何回目か
  private loopBarCount: number = 0;     // ループモードでのトータル小節数

  // コールバック
  public onBeat: BeatCallback | null = null;
  public onTempoChange: TempoChangeCallback | null = null;
  public onTimerTick: TimerCallback | null = null;
  public onTimerEnd: (() => void) | null = null;
  public onLoopStatus: LoopStatusCallback | null = null; // ループの進捗通知

  constructor(initialConfig: MetronomeConfig) {
    this.audioManager = AudioManager.getInstance();
    this.config = initialConfig;
    this.initWorker();
  }

  private initWorker(): void {
    this.worker = new Worker(
      new URL('./scheduler.worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (e: MessageEvent) => {
      if (e.data === 'tick' && this.isPlaying) {
        this.scheduler();
      }
    };
  }

  public updatePattern(newPattern: MetronomePattern, isDrums: boolean): void {
    this.isLoopMode = false; // 通常パターンに変更されたらループモード解除
    this.config.pattern = newPattern;
    this.config.drumsOn = isDrums;
    this.config.swingVal = newPattern.swingVal !== undefined ? newPattern.swingVal : 1.5;

    if (this.currentNoteIndex >= newPattern.numerator) {
      this.currentNoteIndex = 0;
    }
  }

  /**
   * ★ カスタムループ（シーケンサー）モードのセットと開始
   */
  public startCustomLoop(table: LoopTableRow[]): void {
    if (!table || table.length === 0) return;

    this.isLoopMode = true;
    this.loopTable = table;
    this.loopSeqIndex = 0;
    this.loopRepeatCount = 1;
    this.loopBarCount = 0;

    // 最初の行のパターンを適用
    const firstRow = table[0];
    this.config.pattern = firstRow.bar;
    this.config.swingVal = firstRow.bar.swingVal ?? 1.5;

    this.start();
  }

  public async start(): Promise<void> {
    if (this.isPlaying) return;

    await this.audioManager.unlock();

    this.isPlaying = true;
    this.currentNoteIndex = 0;
    this.barCount = 0;
    this.muteCount = 0;
    this.isMuted = false;

    this.startTime = this.audioManager.context.currentTime;
    this.timeRemaining = this.config.timerSeconds;
    this.barsRemaining = this.config.timerBars;

    this.nextNoteTime = this.startTime;
    this.worker?.postMessage('start');

    if (this.isLoopMode) {
      this.onLoopStatus?.(this.loopSeqIndex, this.loopRepeatCount, this.loopBarCount);
    }
  }

  public stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.worker?.postMessage('stop');
  }

  private scheduler(): void {
    try {
      const ctx = this.audioManager.context;

      if (!this.isLoopMode && this.config.timerSeconds > 0) {
        const elapsed = ctx.currentTime - this.startTime;
        const remaining = Math.max(0, Math.ceil(this.config.timerSeconds - elapsed));
        if (remaining !== this.timeRemaining) {
          this.timeRemaining = remaining;
          this.onTimerTick?.(this.timeRemaining, this.barsRemaining);
        }

        if (remaining <= 0) {
          this.stop();
          this.onTimerEnd?.();
          return;
        }
      }

      while (this.nextNoteTime < ctx.currentTime + this.scheduleAheadTime) {
        this.scheduleNote(this.currentNoteIndex, this.nextNoteTime);
        this.advanceNote();
      }
    } catch (err) {
      console.error('Scheduler error caught:', err);
    }
  }

  private advanceNote(): void {
    const { bpm, pattern, swingVal } = this.config;
    const denominator = pattern.denominator || 4;
    const numerator = pattern.numerator || 4;
    const baseInterval = 60.0 / (bpm * (denominator / 4));

    let interval = baseInterval;

    if (swingVal !== 1.5) {
      const offset = ((swingVal - 1.5) / 1.5) * baseInterval;
      if (this.currentNoteIndex % 2 === 0) {
        interval = baseInterval + offset;
      } else {
        interval = baseInterval - offset;
      }
    }

    this.nextNoteTime += interval;
    this.currentNoteIndex++;

    // 1小節（numerator拍）終わった瞬間
    if (this.currentNoteIndex >= numerator) {
      this.currentNoteIndex = 0;
      this.barCount++;
      this.handleBarTransition();
    }
  }

  private handleBarTransition(): void {
    // A. カスタムループモードの場合の小節・行送り処理
    if (this.isLoopMode && this.loopTable.length > 0) {
      this.loopBarCount++;
      const currentRow = this.loopTable[this.loopSeqIndex];

      // 現在の行の指定リピート回数に達したか？
      if (this.loopRepeatCount >= currentRow.repeat) {
        // 次の行へ進む
        this.loopSeqIndex++;
        if (this.loopSeqIndex >= this.loopTable.length) {
          this.loopSeqIndex = 0; // ループの先頭に戻る
        }
        this.loopRepeatCount = 1;

        // 次の行のパターンを反映
        const nextRow = this.loopTable[this.loopSeqIndex];
        this.config.pattern = nextRow.bar;
        this.config.swingVal = nextRow.bar.swingVal ?? 1.5;
      } else {
        this.loopRepeatCount++;
      }

      this.onLoopStatus?.(this.loopSeqIndex, this.loopRepeatCount, this.loopBarCount);
      return;
    }

    // B. 通常モードの小節タイマー
    if (this.config.timerBars > 0) {
      this.barsRemaining = Math.max(0, this.config.timerBars - this.barCount);
      this.onTimerTick?.(this.timeRemaining, this.barsRemaining);

      if (this.barsRemaining <= 0) {
        this.stop();
        this.onTimerEnd?.();
        return;
      }
    }

    // C. 自動テンポ加減速
    const { perBars, increment, minBpm, maxBpm, bpm } = this.config;
    if (perBars > 0 && this.barCount > 0 && this.barCount % perBars === 0) {
      let newBpm = Math.round((bpm + increment) * 10) / 10;
      if (newBpm > maxBpm) newBpm = maxBpm;
      if (newBpm < minBpm) newBpm = minBpm;
      this.config.bpm = newBpm;
      this.onTempoChange?.(newBpm);
    }

    // D. ランダムミュート
    const { muteBars, muteProb } = this.config;
    if (muteBars > 0 && muteProb > 0) {
      if (this.muteCount >= muteBars) {
        this.isMuted = false;
        this.muteCount = 0;
      } else if (this.isMuted) {
        this.muteCount++;
      } else if (Math.random() < muteProb) {
        this.isMuted = true;
        this.muteCount = 1;
      }
    } else {
      this.isMuted = false;
      this.muteCount = 0;
    }
  }

  private scheduleNote(noteIndex: number, time: number): void {
    const { pattern, masterVol, evenVol, voiceOn, voice, metroSound } = this.config;
    const ctx = this.audioManager.context;
    const masterGain = masterVol / 100;

    const timeUntilNote = Math.max(0, time - ctx.currentTime);
    setTimeout(() => {
      if (this.isPlaying) {
        this.onBeat?.(noteIndex, this.barCount, this.isMuted);
      }
    }, timeUntilNote * 1000);

    if (this.isMuted) return;

    let noteGainFactor = 1.0;
    if (pattern.triplet) {
      if (noteIndex % 3 !== 0) noteGainFactor = evenVol;
    } else {
      if (noteIndex % 2 === 1) noteGainFactor = evenVol;
    }

    // A. ドラムキット再生
    if (pattern.type === 'drumkit') {
      const tracks = pattern.pattern;
      if (!tracks) return;

      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        if (!track.values || noteIndex >= track.values.length) continue;

        const val = track.values[noteIndex];
        if (!val || val === 0 || isNaN(val)) continue;

        if (track.note === 'voice') {
          if (voiceOn) {
            this.playSample(`${voice}_${val}`, time, masterGain * 0.6);
          }
        } else {
          const velocityGain = (val / 9.0) * masterGain * noteGainFactor;
          this.playSample(track.note, time, velocityGain);
        }
      }
      return;
    }

    // B. メトロノーム（Clicks）再生
    const tracks = pattern.pattern;
    if (!tracks || tracks.length === 0) return;

    const lastTrackIndex = tracks.length - 1;
    const lastTrack = tracks[lastTrackIndex];

    if (
      voiceOn &&
      lastTrack?.note === 'voice' &&
      lastTrack.values &&
      noteIndex < lastTrack.values.length
    ) {
      const countNum = lastTrack.values[noteIndex];
      if (countNum > 0 && !isNaN(countNum)) {
        this.playSample(`${voice}_${countNum}`, time, masterGain * 0.7);
      }
    }

    for (let i = 0; i < lastTrackIndex; i++) {
      const track = tracks[i];
      if (!track.values || noteIndex >= track.values.length) continue;

      const val = track.values[noteIndex];
      if (!val || val === 0 || isNaN(val)) continue;

      const soundName = this.resolveClickSound(metroSound, i, lastTrackIndex);
      if (soundName) {
        const velocityGain = (val / 9.0) * masterGain * noteGainFactor;
        this.playSample(soundName, time, velocityGain);
      }
    }
  }

  private playSample(name: string, time: number, gain: number): void {
    if (!isFinite(gain) || gain <= 0 || !isFinite(time)) return;

    const sound = this.audioManager.getSound(name);
    if (!sound) return;

    try {
      const ctx = this.audioManager.context;
      const source = ctx.createBufferSource();
      source.buffer = sound.buffer;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(gain, time);

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.start(time, sound.startOffset);
    } catch (err) {
      console.warn(`Failed to play sample ${name}:`, err);
    }
  }

  private resolveClickSound(preset: string, trackIdx: number, _totalTracks: number): string {
    const isFirst = trackIdx === 0;

    switch (preset) {
      case 'cb1': return 'cowbell_higher';
      case 'cb2': return 'cowbell_high';
      case 'cb3': return 'cowbell_mid';
      case 'cb4': return 'cowbell_low';
      case 'cb5': return 'cowbell_lower';
      case '2cb1': return isFirst ? 'cowbell_higher' : 'cowbell_high';
      case '2cb2': return isFirst ? 'cowbell_high' : 'cowbell_mid';
      case '2cb3': return isFirst ? 'cowbell_mid' : 'cowbell_low';
      case '2cb4': return isFirst ? 'cowbell_low' : 'cowbell_lower';
      case '3cb1': return isFirst ? 'cowbell_higher' : (trackIdx === 1 ? 'cowbell_high' : 'cowbell_mid');
      case '3cb2': return isFirst ? 'cowbell_high' : (trackIdx === 1 ? 'cowbell_mid' : 'cowbell_low');
      case '3cb3': return isFirst ? 'cowbell_mid' : (trackIdx === 1 ? 'cowbell_low' : 'cowbell_lower');
      case '1cg1': return 'highConga';
      case '1cg2': return 'midConga';
      case '1cg3': return 'lowConga';
      case '2cg1': return isFirst ? 'highConga' : 'midConga';
      case '2cg2': return isFirst ? 'midConga' : 'lowConga';
      case '3cg':  return isFirst ? 'highConga' : (trackIdx === 1 ? 'midConga' : 'lowConga');
      case 'cv':   return 'clave';
      case 'hc':   return 'handClap';
      default:     return 'cowbell_high';
    }
  }

  public destroy(): void {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
  }
}
