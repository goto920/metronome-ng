import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AudioManager } from '../audio/AudioManager';
import { MetronomeEngine, type MetronomeConfig } from '../audio/MetronomeEngine';
import type { MetronomePattern } from '../types/metronome';
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

  const [mode, setModeState] = useState<'metronome' | 'drums'>('metronome');
  const [selectedClickPattern, setSelectedClickPattern] = useState<MetronomePattern>(defaultClick);
  const [selectedDrumPattern, setSelectedDrumPattern] = useState<MetronomePattern>(defaultDrum);
  const [selectedDrumGenre, setSelectedDrumGenre] = useState<DrumGenre>('All');

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
          setCurrentBeat(0);
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
  }, [selectedDrumPattern, selectedClickPattern]);

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

  const updateConfig = useCallback((partial: Partial<MetronomeConfig>) => {
    setConfigState((prev) => {
      const next = { ...prev, ...partial };
      if (engineRef.current) {
        engineRef.current.config = next;
      }
      return next;
    });
  }, []);

  const togglePlay = useCallback(async () => {
    if (!engineRef.current) return;

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
  }, [isPlaying, config.timerSeconds, config.timerBars]);

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
    setMode,
    selectClickPattern,
    selectDrumPattern,
    selectDrumGenre,
    setBpm,
    updateConfig,
    togglePlay,
    tapTempo,
  };
}
