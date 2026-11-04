import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioManager } from '../audio/AudioManager';
import { MetronomeEngine, type MetronomeConfig } from '../audio/MetronomeEngine';
import type { MetronomePattern } from '../types/metronome';
import rawClickPatterns from '../data/clickPatterns.json';
import rawDrumPatterns from '../data/drumPatterns.json';

const clickPatterns = rawClickPatterns as MetronomePattern[];
const drumPatterns = rawDrumPatterns as MetronomePattern[];

const defaultConfig: MetronomeConfig = {
  bpm: 120.0,
  pattern: clickPatterns[0] || {
    name: '4/4',
    type: 'clicks',
    numerator: 4,
    denominator: 4,
    pattern: [],
  },
  metroSound: '3cb2',
  voiceOn: false,
  voice: 'female',
  drumsOn: false,
  swingVal: 1.5,
  masterVol: 80,
  evenVol: 1.0,
  increment: 0,
  perBars: 0,
  muteBars: 0,
  muteProb: 0.0,
  minBpm: 30,
  maxBpm: 360,
};

export function useMetronome() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(defaultConfig.bpm);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentBar, setCurrentBar] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [config, setConfigState] = useState<MetronomeConfig>(defaultConfig);

  const engineRef = useRef<MetronomeEngine | null>(null);
  const tapTimesRef = useRef<number[]>([]);

  // 1. 初回音源ロード & エンジン初期化
  useEffect(() => {
    const audioManager = AudioManager.getInstance();
    
    audioManager.loadAllSounds((loaded, total) => {
      setLoadProgress(Math.round((loaded / total) * 100));
    }).then(() => {
      const engine = new MetronomeEngine(defaultConfig);

      // ビート同期コールバック（画面の点滅）
      engine.onBeat = (beat, bar, muted) => {
        setCurrentBeat(beat);
        setCurrentBar(bar);
        setIsMuted(muted);
      };

      // 自動加減速時のBPM反映
      engine.onTempoChange = (newBpm) => {
        setBpmState(newBpm);
      };

      engineRef.current = engine;
      setIsLoading(false);
    });

    return () => {
      engineRef.current?.destroy();
    };
  }, []);

  // 2. BPM変更
  const setBpm = useCallback((newBpm: number) => {
    const clamped = Math.max(
      defaultConfig.minBpm,
      Math.min(defaultConfig.maxBpm, Math.round(newBpm * 10) / 10)
    );
    setBpmState(clamped);
    if (engineRef.current) {
      engineRef.current.config.bpm = clamped;
    }
  }, []);

  // 3. 設定一括更新
  const updateConfig = useCallback((partial: Partial<MetronomeConfig>) => {
    setConfigState((prev) => {
      const next = { ...prev, ...partial };
      if (engineRef.current) {
        engineRef.current.config = next;
      }
      return next;
    });
  }, []);

  // 4. 再生 / 停止トグル
  const togglePlay = useCallback(async () => {
    if (!engineRef.current) return;

    if (isPlaying) {
      engineRef.current.stop();
      setIsPlaying(false);
      setCurrentBeat(0);
    } else {
      await engineRef.current.start();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  // 5. タップテンポ（ドラマー向けに3秒タイムアウト & 移動平均計算）
  const tapTempo = useCallback(() => {
    const now = performance.now();
    const taps = tapTimesRef.current;

    // 前回のタップから3秒以上空いていたらリセット
    if (taps.length > 0 && now - taps[taps.length - 1] > 3000) {
      tapTimesRef.current = [];
    }

    tapTimesRef.current.push(now);

    // 最大8回分のタップ履歴を保持
    if (tapTimesRef.current.length > 8) {
      tapTimesRef.current.shift();
    }

    if (tapTimesRef.current.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      // 平均間隔から BPM を算出
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = 60000 / avgInterval;
      setBpm(calculatedBpm);
    }
  }, [setBpm]);

  return {
    isLoading,
    loadProgress,
    isPlaying,
    bpm,
    currentBeat,
    currentBar,
    isMuted,
    config,
    clickPatterns,
    drumPatterns,
    setBpm,
    updateConfig,
    togglePlay,
    tapTempo,
  };
}
