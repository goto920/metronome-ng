import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AudioManager } from '../audio/AudioManager';
import { MetronomeEngine, type MetronomeConfig } from '../audio/MetronomeEngine';
import type { MetronomePattern, LoopTableRow } from '../types/metronome';
import {
  categorizeDrumPattern,
  DRUM_GENRES,
  type DrumGenre,
} from '../utils/patternCategorizer';

import rawClickPatterns from '../data/clickPatterns.json';
import rawDrumPatterns from '../data/drumPatterns.json';

const clickPatterns = rawClickPatterns as MetronomePattern[];
const drumPatterns = rawDrumPatterns as MetronomePattern[];

const defaultClick = clickPatterns.find((p) => p.default) || clickPatterns[0];
const defaultDrum = drumPatterns.find((p) => p.default) || drumPatterns[0];

const defaultConfig: MetronomeConfig = {
  bpm: 120.0,
  pattern: defaultClick,
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
  timerSeconds: 0,
  timerBars: 0,
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

  // タイマー状態
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [barsRemaining, setBarsRemaining] = useState(0);

  // モードとパター選択状態
  const [mode, setModeState] = useState<'metronome' | 'drums'>('metronome');
  const [selectedClickPattern, setSelectedClickPattern] = useState<MetronomePattern>(defaultClick);
  const [selectedDrumPattern, setSelectedDrumPattern] = useState<MetronomePattern>(defaultDrum);
  const [selectedDrumGenre, setSelectedDrumGenre] = useState<DrumGenre>('All');

  // ★ カスタムループ（シーケンサー）用ステート
  const [loopTable, setLoopTable] = useState<LoopTableRow[]>([]);
  const [isPlayingLoop, setIsPlayingLoop] = useState(false);
  const [loopStatus, setLoopStatus] = useState({ seq: 0, repeat: 1, bar: 0 });

  const engineRef = useRef<MetronomeEngine | null>(null);
  const tapTimesRef = useRef<number[]>([]);

  useEffect(() => {
    const audioManager = AudioManager.getInstance();

    audioManager
      .loadAllSounds((loaded, total) => {
        setLoadProgress(Math.round((loaded / total) * 100));
      })
      .then(() => {
        const engine = new MetronomeEngine(defaultConfig);

        engine.onBeat = (beat, bar, muted) => {
          setCurrentBeat(beat);
          setCurrentBar(bar);
          setIsMuted(muted);
        };

        engine.onTempoChange = (newBpm) => {
          setBpmState(newBpm);
        };

        engine.onTimerTick = (tRemaining, bRemaining) => {
          setTimeRemaining(tRemaining);
          setBarsRemaining(bRemaining);
        };

        engine.onTimerEnd = () => {
          setIsPlaying(false);
          setIsPlayingLoop(false);
          setCurrentBeat(0);
        };

        // ★ カスタムループの進捗コールバック
        engine.onLoopStatus = (seq, repeat, bar) => {
          setLoopStatus({ seq, repeat, bar });
        };

        engineRef.current = engine;
        setIsLoading(false);
      });

    return () => {
      engineRef.current?.destroy();
    };
  }, []);

  const setMode = useCallback((newMode: 'metronome' | 'drums') => {
    setModeState(newMode);
    const isDrums = newMode === 'drums';
    const targetPattern = isDrums ? selectedDrumPattern : selectedClickPattern;

    // 通常モードに切り替えるときはカスタムループを停止
    if (isPlayingLoop && engineRef.current) {
      engineRef.current.stop();
      setIsPlayingLoop(false);
    }

    setConfigState((prev) => {
      const next = {
        ...prev,
        drumsOn: isDrums,
        pattern: targetPattern,
        swingVal: targetPattern.swingVal ?? 1.5,
      };
      if (engineRef.current) {
        engineRef.current.updatePattern(targetPattern, isDrums);
      }
      return next;
    });
  }, [selectedDrumPattern, selectedClickPattern, isPlayingLoop]);

  const selectClickPattern = useCallback((pattern: MetronomePattern) => {
    setSelectedClickPattern(pattern);
    setConfigState((prev) => {
      const next = {
        ...prev,
        drumsOn: false,
        pattern,
        swingVal: pattern.swingVal ?? 1.5,
      };
      if (engineRef.current) {
        engineRef.current.updatePattern(pattern, false);
      }
      return next;
    });
  }, []);

  const selectDrumPattern = useCallback((pattern: MetronomePattern) => {
    setSelectedDrumPattern(pattern);
    setConfigState((prev) => {
      const next = {
        ...prev,
        drumsOn: true,
        pattern,
        swingVal: pattern.swingVal ?? 1.5,
      };
      if (engineRef.current) {
        engineRef.current.updatePattern(pattern, true);
      }
      return next;
    });
  }, []);

  const selectDrumGenre = useCallback((genre: DrumGenre) => {
    setSelectedDrumGenre(genre);
    if (genre === 'All') return;

    const matched = drumPatterns.find((p) => categorizeDrumPattern(p.name) === genre);
    if (matched) {
      selectDrumPattern(matched);
    }
  }, [selectDrumPattern]);

  const filteredDrumPatterns = useMemo(() => {
    if (selectedDrumGenre === 'All') return drumPatterns;
    return drumPatterns.filter((p) => categorizeDrumPattern(p.name) === selectedDrumGenre);
  }, [selectedDrumGenre]);

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

  // 外部（セットリストの曲など）からカスタムループテーブルを直接セットする
  const setLoopTableExternal = useCallback((table: LoopTableRow[]) => {
    setLoopTable(table);
  }, []);

  const updateConfig = useCallback((partial: Partial<MetronomeConfig>) => {
    setConfigState((prev) => {
      const next = { ...prev, ...partial };
      if (engineRef.current) {
        engineRef.current.config = next;
      }
      return next;
    });
  }, []);

  // 通常再生 / 停止トグル
  const togglePlay = useCallback(async () => {
    if (!engineRef.current) return;

    // ループ再生中ならまずそれを止める
    if (isPlayingLoop) {
      engineRef.current.stop();
      setIsPlayingLoop(false);
    }

    if (isPlaying) {
      engineRef.current.stop();
      setIsPlaying(false);
      setCurrentBeat(0);
    } else {
      setTimeRemaining(config.timerSeconds);
      setBarsRemaining(config.timerBars);
      await engineRef.current.start();
      setIsPlaying(true);
    }
  }, [isPlaying, isPlayingLoop, config.timerSeconds, config.timerBars]);

  // ★ カスタムループ関連のアクション
  const addLoopRow = useCallback((bar: MetronomePattern, repeat: number) => {
    setLoopTable((prev) => [...prev, { bar, repeat }]);
  }, []);

  const deleteLoopRow = useCallback((index: number) => {
    setLoopTable((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const togglePlayLoop = useCallback(async () => {
    if (!engineRef.current || loopTable.length === 0) return;

    // 通常再生中なら止める
    if (isPlaying) {
      engineRef.current.stop();
      setIsPlaying(false);
    }

    if (isPlayingLoop) {
      engineRef.current.stop();
      setIsPlayingLoop(false);
      setCurrentBeat(0);
    } else {
      setIsPlayingLoop(true);
      engineRef.current.startCustomLoop(loopTable);
    }
  }, [isPlaying, isPlayingLoop, loopTable]);

  const rewindLoop = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
    setIsPlayingLoop(false);
    setLoopStatus({ seq: 0, repeat: 1, bar: 0 });
  }, []);

  const tapTempo = useCallback(() => {
    const now = performance.now();
    const taps = tapTimesRef.current;

    if (taps.length > 0 && now - taps[taps.length - 1] > 3000) {
      tapTimesRef.current = [];
    }

    tapTimesRef.current.push(now);

    if (tapTimesRef.current.length > 8) {
      tapTimesRef.current.shift();
    }

    if (tapTimesRef.current.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
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
    timeRemaining,
    barsRemaining,
    mode,
    selectedClickPattern,
    selectedDrumPattern,
    selectedDrumGenre,
    filteredDrumPatterns,
    drumGenres: DRUM_GENRES,
    clickPatterns,
    drumPatterns,
    // カスタムループ用
    loopTable,
    isPlayingLoop,
    loopStatus,
    addLoopRow,
    deleteLoopRow,
    togglePlayLoop,
    rewindLoop,
    setMode,
    selectClickPattern,
    selectDrumPattern,
    selectDrumGenre,
    setBpm,
    setLoopTableExternal,
    updateConfig,
    togglePlay,
    tapTempo,
  };
}
