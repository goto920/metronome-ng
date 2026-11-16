import { useState, useCallback, useEffect } from 'react';
import { Play, Square, Bell, Disc3, Volume2, Globe, HelpCircle, RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useMetronome } from './hooks/useMetronome';
import { useWakeLock } from './hooks/useWakeLock';
import { useSetlist, type SetlistSong } from './hooks/useSetlist';
import { PracticePanel } from './components/PracticePanel';
import { SetlistPanel } from './components/SetlistPanel';
import { CustomLoopPanel } from './components/CustomLoopPanel';
import { HelpModal } from './components/HelpModal';
import { CLICK_CATEGORIES, categorizeClickPattern } from './utils/patternCategorizer';
import { translations, getInitialLang, type Lang } from './utils/i18n';
import type { LoopTableRow } from './types/metronome';

export default function App() {
  const [lang, setLang] = useState<Lang>(getInitialLang);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const t = translations[lang];

  // PWA スマート更新検知フック (virtual:pwa-register/react)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
  });

  // スマホで他のアプリから戻ってきた時 (visibilitychange) に自動チェック
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.serviceWorker) {
        navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.exitPointerLock?.();
  }, []);

  const {
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
    drumGenres,
    clickPatterns,
    drumPatterns,
    // 変拍子カスタムループ用
    loopTable,
    isPlayingLoop,
    loopStatus,
    addLoopRow,
    deleteLoopRow,
    togglePlayLoop,
    rewindLoop,
    setLoopTableExternal,
    setMode,
    selectClickPattern,
    selectDrumPattern,
    selectDrumGenre,
    setBpm,
    updateConfig,
    togglePlay,
    tapTempo,
  } = useMetronome();

  // 画面スリープ防止 (Screen Wake Lock)
  useWakeLock(isPlaying || isPlayingLoop);

  // セットリスト管理フック
  const {
    setlists,
    activeList,
    activeSongId,
    setActiveListId,
    setActiveSongId,
    createSetlist,
    deleteSetlist,
    resetSampleList,
    addCurrentSong,
    deleteSong,
    moveSong,
    getAdjacentSong,
  } = useSetlist();

  const toggleLang = () => {
    const next: Lang = lang === 'ja' ? 'en' : 'ja';
    setLang(next);
    localStorage.setItem('metronome_lang', next);
  };

  const loadSong = useCallback((song: SetlistSong) => {
    setActiveSongId(song.id);
    setBpm(song.bpm);

    if (song.mode === 'loop' && song.table) {
      // ★ 変拍子ループ曲の場合、カスタムループテーブルに流し込む
      setLoopTableExternal(song.table);
      
      if (song.table.length > 0 && song.table[0].bar) {
        const firstBar = song.table[0].bar;
        if (firstBar.type === 'drumkit') {
          setMode('drums');
          const found = drumPatterns.find((p) => p.name === firstBar.name) || firstBar;
          selectDrumPattern(found);
        } else {
          setMode('metronome');
          const found = clickPatterns.find((p) => p.name === firstBar.name) || firstBar;
          selectClickPattern(found);
        }
      }
    } else if (song.mode === 'drums') {
      const found = drumPatterns.find((p) => p.name === song.patternName) || drumPatterns[0];
      setMode('drums');
      selectDrumPattern(found);
    } else {
      const found = clickPatterns.find((p) => p.name === song.patternName) || clickPatterns[0];
      setMode('metronome');
      selectClickPattern(found);
    }

    if (song.swingVal !== undefined) {
      updateConfig({ swingVal: song.swingVal });
    }
    if (song.metroSound) {
      updateConfig({ metroSound: song.metroSound });
    }
  }, [drumPatterns, clickPatterns, setBpm, setMode, selectDrumPattern, selectClickPattern, updateConfig, setActiveSongId, setLoopTableExternal]);

  const nextSong = getAdjacentSong('next');
  const prevSong = getAdjacentSong('prev');

  const handleNext = () => {
    if (nextSong) loadSong(nextSong);
  };

  const handlePrev = () => {
    if (prevSong) loadSong(prevSong);
  };

  // ★ 欠落していた handleAddCurrent の定義を追加！
  const handleAddCurrent = (title: string) => {
    addCurrentSong(
      title,
      bpm,
      mode,
      config.pattern,
      config.metroSound,
      config.swingVal
    );
  };

  // ★ カスタムループをセットリストに保存するための関数
  const handleSaveLoopAsSong = (title: string, table: LoopTableRow[]) => {
    if (!activeList || table.length === 0) return;
    // ループ曲としてセットリストへ追加
    addCurrentSong(
      title,
      bpm,
      'loop',
      config.pattern,
      config.metroSound,
      config.swingVal,
      table
    );
  };

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
    <div className="flex min-h-screen flex-col items-center bg-zinc-950 text-zinc-100 select-none px-4 py-3 pb-8 relative">
      {/* PWA 新バージョン更新通知バナー */}
      {needRefresh && (
        <div className="fixed bottom-6 left-4 right-4 z-[9999] mx-auto max-w-sm flex items-center justify-between gap-3 bg-zinc-900 text-zinc-100 px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 pointer-events-auto">
          <div className="flex items-center gap-2 font-medium text-xs text-zinc-300">
            <RefreshCw className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>{t.pwaUpdateTitle}</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              await updateServiceWorker(true);
              window.location.reload();
            }}
            className="px-3 py-1.5 bg-emerald-500 text-zinc-950 rounded-xl text-xs font-bold shadow active:scale-95 transition-all shrink-0 cursor-pointer hover:bg-emerald-400"
          >
            {t.pwaUpdateBtn}
          </button>
        </div>
      )}

      {/* アプリケーション枠（中央寄せコンテナ） */}
      <div className="flex w-full max-w-md flex-1 flex-col justify-between gap-4">
       {/* 1. ヘッダー */}
        <header className="flex items-center justify-between border-b border-zinc-800/80 pb-3 pt-1">
          <h1 className="text-lg font-black tracking-wider text-emerald-400">
            METRONOME<span className="text-zinc-500">-NG</span>
          </h1>

          <div className="flex items-center gap-3">
            {/* 動的ステータス（小節数・ミュート状態） */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800/80">
              <span className="text-zinc-500">{t.bar}:</span>
              <strong className="text-emerald-400">{currentBar + 1}</strong>
              {isMuted && (
                <span className="text-rose-400 font-bold animate-pulse text-[10px] ml-1">
                  {t.muted}
                </span>
              )}
            </div>

            {/* 操作ボタングループ (言語、ヘルプ、リロード) */}
            <div className="flex items-center gap-1.5">
              {/* 言語切り替え */}
              <button
                onClick={toggleLang}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-xs font-bold text-zinc-200 border border-zinc-700 transition-colors"
                title="Change Language"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'ja' ? 'EN' : '日本語'}</span>
              </button>

              {/* ヘルプ (? ボタン) */}
              <button
                onClick={() => setIsHelpOpen(true)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 border border-zinc-700 transition-colors"
                title="Help"
              >
                <HelpCircle className="w-4 h-4 text-emerald-400" />
              </button>

              {/* リロード (🔄 ボタン) */}
              <button
                onClick={() => window.location.reload()}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 border border-zinc-700 transition-colors"
                title="Reload App"
              >
                <RefreshCw className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>
        </header>

        {/* 2. ビートインジケーター（視覚フラッシュ） */}
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: pattern.numerator }).map((_, i) => {
            const isActive = (isPlaying || isPlayingLoop) && currentBeat === i;
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
                className={`flex-1 h-3 rounded-full transition-all duration-75 ${bgColor}`}
              />
            );
          })}
        </div>

        {/* 3. BPM 表示 & 微調整ボタン & マスター音量 */}
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-7xl font-black tracking-tight text-white">
              {Math.floor(bpm)}
            </span>
            <span className="text-3xl font-bold text-zinc-500">
              .{(Math.round((bpm % 1) * 10))}
            </span>
            <span className="ml-2 text-sm font-bold text-zinc-400">{t.bpm}</span>
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
            className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-1"
          />

          <div className="flex items-center gap-2 w-full pt-1 px-1">
            <Volume2 className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={config.masterVol}
              onChange={(e) => updateConfig({ masterVol: parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="font-mono text-xs text-zinc-400 w-10 text-right shrink-0">
              {config.masterVol}%
            </span>
          </div>
        </div>

        {/* 4. クイック小節タイマー（Pre-count: ∞ / 2 / 4 / 8 / 16） */}
        <div className="space-y-1">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-zinc-400 tracking-wider">
              {t.quickBars}
            </span>
            {isPlaying && config.timerBars > 0 && (
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {barsRemaining} / {config.timerBars} {t.bars}
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[0, 2, 4, 8, 16].map((barCount) => {
              const isSelected = config.timerBars === barCount;
              return (
                <button
                  key={barCount}
                  onClick={() => updateConfig({ timerBars: barCount })}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {barCount === 0 ? '∞' : `${barCount}${lang === 'ja' ? '小節' : 'b'}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. START / STOP & TAP */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={togglePlay}
            className={`col-span-2 flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-2xl tracking-wide shadow-lg active:scale-98 transition-all ${
              isPlaying
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-950/40'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-8 h-8 fill-current" /> {t.stop}
              </>
            ) : (
              <>
                <Play className="w-8 h-8 fill-current" /> {t.start}
              </>
            )}
          </button>

          <button
            onClick={tapTempo}
            className="flex flex-col items-center justify-center rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-black text-lg active:scale-95 transition-all shadow-md active:bg-zinc-600"
          >
            {t.tap}
            <span className="text-[10px] font-normal text-zinc-400">{t.bpm}</span>
          </button>
        </div>

        {/* 6. モード切り替え & パターン選択エリア */}
        <div className="space-y-3 bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl shadow-xl">
          <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800/80">
            <button
              onClick={() => setMode('metronome')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-black tracking-wide rounded-lg transition-all ${
                mode === 'metronome'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" /> {t.metronome}
            </button>
            <button
              onClick={() => setMode('drums')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-black tracking-wide rounded-lg transition-all ${
                mode === 'drums'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Disc3 className="w-4 h-4" /> {t.drumKit}
            </button>
          </div>

          {mode === 'metronome' ? (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 mb-1 block">
                  {t.pattern}
                </label>
                <select
                  value={selectedClickPattern.name}
                  onChange={(e) => {
                    const found = clickPatterns.find((p) => p.name === e.target.value);
                    if (found) selectClickPattern(found);
                  }}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
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

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 mb-1 block">{t.sound}</label>
                  <select
                    value={config.metroSound}
                    onChange={(e) => updateConfig({ metroSound: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
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
                  <label className="text-[11px] font-bold text-zinc-400 mb-1 block">{t.voice}</label>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => updateConfig({ voiceOn: !config.voiceOn })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
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
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 mb-1 block">{t.genre}</label>
                  <select
                    value={selectedDrumGenre}
                    onChange={(e) => selectDrumGenre(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    {drumGenres.map((g) => (
                      <option key={g} value={g} className="text-white">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 mb-1 block">{t.voice}</label>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => updateConfig({ voiceOn: !config.voiceOn })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
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

              <div>
                <label className="text-[11px] font-bold text-zinc-400 mb-1 block">
                  {t.pattern} ({filteredDrumPatterns.length})
                </label>
                <select
                  value={selectedDrumPattern.name}
                  onChange={(e) => {
                    const found = filteredDrumPatterns.find((p) => p.name === e.target.value);
                    if (found) selectDrumPattern(found);
                  }}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
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

        {/* 7. セットリストパネル */}
        <SetlistPanel
          setlists={setlists}
          activeList={activeList}
          activeSongId={activeSongId}
          currentBpm={bpm}
          currentPatternName={config.pattern.name}
          currentMode={mode}
          onSelectList={setActiveListId}
          onSelectSong={loadSong}
          onCreateList={createSetlist}
          onDeleteList={deleteSetlist}
          onResetSamples={resetSampleList}
          onAddCurrent={handleAddCurrent}
          onDeleteSong={deleteSong}
          onMoveSong={moveSong}
          onNextSong={handleNext}
          onPrevSong={handlePrev}
          hasNext={!!nextSong}
          hasPrev={!!prevSong}
          lang={lang}
        />

        {/* 8. 練習コントロールパネル */}
        <PracticePanel
          config={config}
          updateConfig={updateConfig}
          isPlaying={isPlaying || isPlayingLoop}
          timeRemaining={timeRemaining}
          barsRemaining={barsRemaining}
          lang={lang}
        />

        {/* 9. 変拍子カスタムループパネル（一番下に配置） */}
        <CustomLoopPanel
          clickPatterns={clickPatterns}
          drumPatterns={drumPatterns}
          loopTable={loopTable}
          onAddRow={addLoopRow}
          onDeleteRow={deleteLoopRow}
          onStartLoop={togglePlayLoop}
          onRewindLoop={rewindLoop}
          onSaveAsSong={handleSaveLoopAsSong}
          isPlayingLoop={isPlayingLoop}
          loopStatus={loopStatus}
          lang={lang}
        />

        {/* 10. フッター */}
        <footer className="mt-4 text-center text-xs font-mono text-zinc-500 pb-2">
          <p className="font-semibold text-zinc-400 tracking-wider">
            Metronome Next Generation <span className="text-emerald-400/80">(metronome-ng)</span>
          </p>
          <p className="mt-1 text-[11px] text-zinc-600">
            Build: <span className="text-zinc-400 font-mono">{__BUILD_VERSION__}</span>
          </p>
          <p className="mt-1 text-[10px] text-zinc-600">
            Designed for drummers & musicians &bull; MIT License
          </p>
        </footer>
      </div>

      {/* クイックガイド モーダル */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        lang={lang}
      />
    </div>
  );
}
