import { Play, Square, Bell, Disc3 } from 'lucide-react';
import { useMetronome } from './hooks/useMetronome';
import { CLICK_CATEGORIES, categorizeClickPattern } from './utils/patternCategorizer';

export default function App() {
  const {
    isLoading,
    loadProgress,
    isPlaying,
    bpm,
    currentBeat,
    currentBar,
    isMuted,
    config,
    mode,
    selectedClickPattern,
    selectedDrumPattern,
    selectedDrumGenre,
    filteredDrumPatterns,
    drumGenres,
    clickPatterns,
    setMode,
    selectClickPattern,
    selectDrumPattern,
    selectDrumGenre,
    setBpm,
    updateConfig,
    togglePlay,
    tapTempo,
  } = useMetronome();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 text-white">
        <div className="text-xl font-bold tracking-wider text-emerald-400 mb-4 font-mono">
          metronome-ng
        </div>
        <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-150"
            style={{ width: `${loadProgress}%` }}
          />
        </div>
        <div className="mt-2 text-sm text-zinc-400">Loading samples... {loadProgress}%</div>
      </div>
    );
  }

  const { pattern } = config;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 select-none pb-8">
      {/* ヘッダー */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-900/50 backdrop-blur">
        <h1 className="text-lg font-black tracking-wider text-emerald-400">
          METRONOME<span className="text-zinc-500">-NG</span>
        </h1>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span>BAR: <strong className="text-emerald-400">{currentBar + 1}</strong></span>
          {isMuted && (
            <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded font-bold animate-pulse">
              MUTED
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between px-4 py-4 gap-6">
        {/* 1. ビートインジケーター（視覚フラッシュ） */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {Array.from({ length: pattern.numerator }).map((_, i) => {
            const isActive = isPlaying && currentBeat === i;
            const isFirstBeat = i === 0;

            let bgColor = 'bg-zinc-800';
            if (isActive) {
              bgColor = isMuted
                ? 'bg-zinc-600 ring-4 ring-zinc-500'
                : isFirstBeat
                ? 'bg-rose-500 ring-4 ring-rose-400/50 scale-110'
                : 'bg-emerald-400 ring-4 ring-emerald-300/50 scale-105';
            }

            return (
              <div
                key={i}
                className={`flex-1 h-4 rounded-full transition-all duration-75 ${bgColor}`}
              />
            );
          })}
        </div>

        {/* 2. BPM 表示 & 微調整ボタン */}
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-7xl font-black tracking-tight text-white">
              {Math.floor(bpm)}
            </span>
            <span className="text-3xl font-bold text-zinc-500">
              .{(Math.round((bpm % 1) * 10))}
            </span>
            <span className="ml-2 text-sm font-bold text-zinc-400">BPM</span>
          </div>

          <div className="grid grid-cols-6 gap-1.5 w-full">
            <button
              onClick={() => setBpm(bpm - 5)}
              className="py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 active:bg-zinc-700 text-sm font-bold"
            >
              -5
            </button>
            <button
              onClick={() => setBpm(bpm - 1)}
              className="py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 active:bg-zinc-700 text-sm font-bold"
            >
              -1
            </button>
            <button
              onClick={() => setBpm(bpm - 0.1)}
              className="py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 active:bg-zinc-700 text-xs font-bold text-zinc-400"
            >
              -0.1
            </button>
            <button
              onClick={() => setBpm(bpm + 0.1)}
              className="py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 active:bg-zinc-700 text-xs font-bold text-zinc-400"
            >
              +0.1
            </button>
            <button
              onClick={() => setBpm(bpm + 1)}
              className="py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 active:bg-zinc-700 text-sm font-bold"
            >
              +1
            </button>
            <button
              onClick={() => setBpm(bpm + 5)}
              className="py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 active:bg-zinc-700 text-sm font-bold"
            >
              +5
            </button>
          </div>

          <input
            type="range"
            min={config.minBpm}
            max={config.maxBpm}
            step={0.1}
            value={bpm}
            onChange={(e) => setBpm(parseFloat(e.target.value))}
            className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-2"
          />
        </div>

        {/* 3. START / STOP & TAP */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={togglePlay}
            className={`col-span-2 flex items-center justify-center gap-3 py-6 rounded-2xl font-black text-2xl tracking-wide shadow-lg active:scale-98 transition-all ${
              isPlaying
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-950/40'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-8 h-8 fill-current" /> STOP
              </>
            ) : (
              <>
                <Play className="w-8 h-8 fill-current" /> START
              </>
            )}
          </button>

          <button
            onClick={tapTempo}
            className="flex flex-col items-center justify-center rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-black text-lg active:scale-95 transition-all shadow-md active:bg-zinc-600"
          >
            TAP
            <span className="text-[10px] font-normal text-zinc-400">TEMPO</span>
          </button>
        </div>

        {/* 4. モード切り替え & パターン選択エリア */}
        <div className="space-y-4 bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl shadow-xl">
          {/* A. モードタブ (METRONOME vs DRUM KIT) */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800/80">
            <button
              onClick={() => setMode('metronome')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-black tracking-wide rounded-lg transition-all ${
                mode === 'metronome'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" /> METRONOME
            </button>
            <button
              onClick={() => setMode('drums')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-black tracking-wide rounded-lg transition-all ${
                mode === 'drums'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Disc3 className="w-4 h-4" /> DRUM KIT
            </button>
          </div>

          {/* B. モードごとの選択コントロール */}
          {mode === 'metronome' ? (
            /* --- METRONOME モード --- */
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 mb-1 block">
                  TIME SIGNATURE / PATTERN
                </label>
                <select
                  value={selectedClickPattern.name}
                  onChange={(e) => {
                    const found = clickPatterns.find((p) => p.name === e.target.value);
                    if (found) selectClickPattern(found);
                  }}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                >
                  {CLICK_CATEGORIES.map((cat) => (
                    <optgroup key={cat} label={`── ${cat} ──`} className="bg-zinc-900 text-emerald-400">
                      {clickPatterns
                        .filter((p) => categorizeClickPattern(p) === cat)
                        .map((p) => (
                          <option key={p.name} value={p.name} className="bg-zinc-950 text-white font-mono">
                            {p.name} ({p.numerator}/{p.denominator})
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* クリック音色 & 音声カウント */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 mb-1 block">SOUND</label>
                  <select
                    value={config.metroSound}
                    onChange={(e) => updateConfig({ metroSound: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="cb1">Cowbell 1</option>
                    <option value="cb2">Cowbell 2</option>
                    <option value="cb3">Cowbell 3</option>
                    <option value="2cb1">2-Cowbell 1</option>
                    <option value="3cb2">3-Cowbell 2</option>
                    <option value="1cg1">Conga 1</option>
                    <option value="2cg1">2-Conga 1</option>
                    <option value="cv">Clave</option>
                    <option value="hc">Hand Clap</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 mb-1 block">VOICE COUNT</label>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => updateConfig({ voiceOn: !config.voiceOn })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                        config.voiceOn
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-zinc-950 border-zinc-700 text-zinc-500'
                      }`}
                    >
                      {config.voiceOn ? 'ON' : 'OFF'}
                    </button>
                    {config.voiceOn && (
                      <select
                        value={config.voice}
                        onChange={(e) => updateConfig({ voice: e.target.value as 'female' | 'male' })}
                        className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 text-xs text-white"
                      >
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* --- DRUM KIT モード --- */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {/* 1. GENRE 選択 (Jim Riley 10章) */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 mb-1 block">GENRE (STYLE)</label>
                  <select
                    value={selectedDrumGenre}
                    onChange={(e) => selectDrumGenre(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-2.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    {drumGenres.map((g) => (
                      <option key={g} value={g} className="text-white">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. 音声カウント */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 mb-1 block">VOICE COUNT</label>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => updateConfig({ voiceOn: !config.voiceOn })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                        config.voiceOn
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-zinc-950 border-zinc-700 text-zinc-500'
                      }`}
                    >
                      {config.voiceOn ? 'ON' : 'OFF'}
                    </button>
                    {config.voiceOn && (
                      <select
                        value={config.voice}
                        onChange={(e) => updateConfig({ voice: e.target.value as 'female' | 'male' })}
                        className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 text-xs text-white"
                      >
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. PATTERN 選択（ジャンルで絞り込み済み） */}
              <div>
                <label className="text-[11px] font-bold text-zinc-400 mb-1 block">
                  DRUM PATTERN ({filteredDrumPatterns.length} available)
                </label>
                <select
                  value={selectedDrumPattern.name}
                  onChange={(e) => {
                    const found = filteredDrumPatterns.find((p) => p.name === e.target.value);
                    if (found) selectDrumPattern(found);
                  }}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                >
                  {filteredDrumPatterns.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} ({p.numerator}/{p.denominator})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
