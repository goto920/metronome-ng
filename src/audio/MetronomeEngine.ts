import { AudioManager } from './AudioManager';
import type { MetronomePattern } from '../types/metronome';

export interface MetronomeConfig {
  bpm: number;
  pattern: MetronomePattern;
  metroSound: string;      // '3cb2', '1cg1', 'cv' など
  voiceOn: boolean;
  voice: 'female' | 'male';
  drumsOn: boolean;
  swingVal: number;        // 1.5 (Straight) 〜 2.0 (Heavy Swing)
  masterVol: number;       // 0 〜 100
  evenVol: number;         // 0.0 〜 1.0 (裏拍・ダウンビートの音量)
  increment: number;       // 自動テンポ変化量 (-10 〜 +10)
  perBars: number;         // 何小節ごとに変化させるか (0 = off)
  muteBars: number;        // ランダムミュート小節数 (0 = off)
  muteProb: number;        // ランダムミュート確率 (0.0 〜 1.0)
  minBpm: number;
  maxBpm: number;
}

export type BeatCallback = (beat: number, bar: number, isMuted: boolean) => void;
export type TempoChangeCallback = (newBpm: number) => void;

export class MetronomeEngine {
  private audioManager: AudioManager;
  private worker: Worker | null = null;

  // 設定状態
  public config: MetronomeConfig;

  // 再生ステータス
  public isPlaying: boolean = false;
  private nextNoteTime: number = 0;
  private currentNoteIndex: number = 0;
  private barCount: number = 0;

  // スケジューリング設定 (秒)
  private readonly lookahead: number = 0.1; // 100ms 先まで先読み
  private readonly scheduleAheadTime: number = 0.1;

  // 練習用内部ステータス
  private muteCount: number = 0;
  private isMuted: boolean = false;

  // コールバック
  public onBeat: BeatCallback | null = null;
  public onTempoChange: TempoChangeCallback | null = null;

  constructor(initialConfig: MetronomeConfig) {
    this.audioManager = AudioManager.getInstance();
    this.config = initialConfig;
    this.initWorker();
  }

  private initWorker(): void {
    // Vite の標準 Worker 読み込み構文
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

  public async start(): Promise<void> {
    if (this.isPlaying) return;

    await this.audioManager.unlock();

    this.isPlaying = true;
    this.currentNoteIndex = 0;
    this.barCount = 0;
    this.muteCount = 0;
    this.isMuted = false;

    // 押した瞬間の currentTime を起点にする（ゼロレイテンシー）
    this.nextNoteTime = this.audioManager.context.currentTime;

    this.worker?.postMessage('start');
  }

  public stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.worker?.postMessage('stop');
  }

  /**
   * Lookahead スケジューラ
   */
  private scheduler(): void {
    const ctx = this.audioManager.context;

    while (this.nextNoteTime < ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentNoteIndex, this.nextNoteTime);
      this.advanceNote();
    }
  }

  /**
   * 次の音符の時刻と小節進行の計算
   */
  private advanceNote(): void {
    const { bpm, pattern, swingVal } = this.config;
    const noteInterval = 60.0 / (bpm * (pattern.denominator / 4));

    // スウィング（奇数番目の裏拍をオフセット）
    let offset = 0;
    if (swingVal !== 1.5 && this.currentNoteIndex % 2 === 1) {
      offset = ((swingVal - 1.5) / 1.5) * noteInterval;
    }

    this.nextNoteTime += noteInterval + offset;
    this.currentNoteIndex++;

    // 小節の終わり
    if (this.currentNoteIndex >= pattern.numerator) {
      this.currentNoteIndex = 0;
      this.barCount++;
      this.handleBarTransition();
    }
  }

  /**
   * 小節更新時の練習機能処理（自動テンポ加減速 & ランダムミュート）
   */
  private handleBarTransition(): void {
    // 1. 自動テンポ加減速
    const { perBars, increment, minBpm, maxBpm, bpm } = this.config;
    if (perBars > 0 && this.barCount > 0 && this.barCount % perBars === 0) {
      let newBpm = Math.round((bpm + increment) * 10) / 10;
      if (newBpm > maxBpm) newBpm = maxBpm;
      if (newBpm < minBpm) newBpm = minBpm;
      this.config.bpm = newBpm;
      this.onTempoChange?.(newBpm);
    }

    // 2. ランダムミュート
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

  /**
   * 1つのノートの発音スケジュール
   */
  private scheduleNote(noteIndex: number, time: number): void {
    const { pattern, masterVol, evenVol, voiceOn, voice, metroSound, drumsOn } = this.config;
    const ctx = this.audioManager.context;
    const masterGain = masterVol / 100;

    // UI ビート同期の予約
    const timeUntilNote = Math.max(0, time - ctx.currentTime);
    setTimeout(() => {
      if (this.isPlaying) {
        this.onBeat?.(noteIndex, this.barCount, this.isMuted);
      }
    }, timeUntilNote * 1000);

    // ミュート小節の場合は発音しない（ただし音声カウントのみ鳴らす等の調整も可能）
    if (this.isMuted) return;

    // 裏拍/ダウンビートの音量補正
    let noteGainFactor = 1.0;
    if (pattern.triplet) {
      if (noteIndex % 3 !== 0) noteGainFactor = evenVol;
    } else {
      if (noteIndex % 2 === 1) noteGainFactor = evenVol;
    }

    // A. ドラムキット再生
    if (drumsOn && pattern.type === 'drumkit') {
      const tracks = pattern.pattern;
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        const val = track.values[noteIndex];
        if (val === 0) continue;

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
    const lastTrackIndex = tracks.length - 1;

    // 音声カウント（最後のトラックが voice の場合）
    const lastTrack = tracks[lastTrackIndex];
    if (voiceOn && lastTrack?.note === 'voice' && lastTrack.values[noteIndex] > 0) {
      const countNum = lastTrack.values[noteIndex];
      this.playSample(`${voice}_${countNum}`, time, masterGain * 0.7);
    }

    // クリック音（カウベル、コンガなど）
    for (let i = 0; i < lastTrackIndex; i++) {
      const val = tracks[i].values[noteIndex];
      if (val === 0) continue;

      const soundName = this.resolveClickSound(metroSound, i, lastTrackIndex);
      if (soundName) {
        const velocityGain = (val / 9.0) * masterGain * noteGainFactor;
        this.playSample(soundName, time, velocityGain);
      }
    }
  }

  /**
   * サンプル再生（先頭トリム適用）
   */
  private playSample(name: string, time: number, gain: number): void {
    const sound = this.audioManager.getSound(name);
    if (!sound) return;

    const ctx = this.audioManager.context;
    const source = ctx.createBufferSource();
    source.buffer = sound.buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(gain, time);

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    // オフトリム（startOffset）を適用してアタックのズレを解消！
    source.start(time, sound.startOffset);
  }

  /**
   * カウベル・コンガなどのサウンドマップ解決
   */
  private resolveClickSound(preset: string, trackIdx: number, totalTracks: number): string {
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
