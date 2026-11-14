import { useState } from 'react';
import { ListMusic, ChevronDown, ChevronUp, Plus, Trash2, ArrowUp, ArrowDown, Play, ChevronLeft, ChevronRight, RotateCcw, Info } from 'lucide-react';
import type { SetlistData, SetlistSong } from '../hooks/useSetlist';
import { translations, type Lang } from '../utils/i18n';

interface SetlistPanelProps {
  setlists: SetlistData[];
  activeList: SetlistData | undefined;
  activeSongId: string | null;
  currentBpm: number;
  currentPatternName: string;
  currentMode: 'metronome' | 'drums';
  onSelectList: (id: string) => void;
  onSelectSong: (song: SetlistSong) => void;
  onCreateList: (name: string) => void;
  onDeleteList: (id: string) => void;
  onResetSamples: () => void;
  onAddCurrent: (title: string) => void;
  onDeleteSong: (id: string) => void;
  onMoveSong: (idx: number, dir: 'up' | 'down') => void;
  onNextSong: () => void;
  onPrevSong: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  lang: Lang;
}

export function SetlistPanel({
  setlists,
  activeList,
  activeSongId,
  currentBpm,
  currentPatternName,
  currentMode,
  onSelectList,
  onSelectSong,
  onCreateList,
  onDeleteList,
  onResetSamples,
  onAddCurrent,
  onDeleteSong,
  onMoveSong,
  onNextSong,
  onPrevSong,
  hasNext,
  hasPrev,
  lang,
}: SetlistPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newListName, setNewListName] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);

  const t = translations[lang];

  const handleAddSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSongTitle.trim()) return;
    onAddCurrent(newSongTitle);
    setNewSongTitle('');
  };

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    onCreateList(newListName);
    setNewListName('');
    setIsCreatingList(false);
  };

  const handleReset = () => {
    if (window.confirm(t.resetConfirm)) {
      onResetSamples();
    }
  };

  const activeSong = activeList?.songs.find((s) => s.id === activeSongId);
  const listNameLower = (activeList?.name || '').toLowerCase();
  const isSampleList = activeList?.id === 'sample_setlist' || listNameLower.includes('sample');
  const isDefaultList = activeList?.id === 'default_setlist' || listNameLower === 'default';
  const isProtected = activeList?.isProtected || isSampleList || isDefaultList;

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      {/* 1. 開閉トグルヘッダー */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900 hover:bg-zinc-800/80 active:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-black tracking-wider text-zinc-200">
            {t.setlist}
          </span>
          {activeList && (
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-800">
              {activeList.name} ({activeList.songs.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeSong && (
            <span className="text-[11px] font-mono text-emerald-400 font-bold truncate max-w-[140px]">
              {activeSong.title}
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </div>
      </button>

      {/* 2. パネル本体 */}
      {isOpen && (
        <div className="p-4 space-y-4 border-t border-zinc-800/80 text-xs text-zinc-300">
          {/* A. ライブ用 PREV / NEXT ナビゲーションバー */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
            <button
              onClick={onPrevSong}
              disabled={!hasPrev}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-black text-zinc-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> {t.prevSong}
            </button>
            <button
              onClick={onNextSong}
              disabled={!hasNext}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 active:bg-emerald-500/40 border border-emerald-500/40 disabled:opacity-30 disabled:pointer-events-none text-xs font-black text-emerald-400 transition-colors"
            >
              {t.nextSong} <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* B. セットリスト選択 & 管理 */}
          <div className="flex items-center gap-2">
            <select
              value={activeList?.id}
              onChange={(e) => onSelectList(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
            >
              {setlists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.songs.length})
                </option>
              ))}
            </select>

            {isSampleList && (
              <button
                onClick={handleReset}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 active:scale-95 transition-all"
                title={t.resetSamples}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => setIsCreatingList(!isCreatingList)}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:scale-95 transition-all"
              title={t.newList}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {!isProtected && (
              <button
                onClick={() => activeList && onDeleteList(activeList.id)}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-rose-950/60 hover:text-rose-400 text-zinc-500 active:scale-95 transition-all"
                title={t.deleteList}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 新規リスト作成フォーム */}
          {isCreatingList && (
            <form onSubmit={handleCreateList} className="flex gap-2">
              <input
                type="text"
                placeholder={t.listNamePlaceholder}
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1 rounded-lg bg-emerald-500 text-zinc-950 font-bold text-xs"
              >
                {t.add}
              </button>
            </form>
          )}

          {/* C. 曲リスト */}
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {activeList?.songs.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 font-mono text-[11px]">
                {t.emptySongs}
              </div>
            ) : (
              activeList?.songs.map((song, idx) => {
                const isActive = activeSongId === song.id;
                return (
                  <div
                    key={song.id}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-white shadow-sm'
                        : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-800/50 text-zinc-300'
                    }`}
                  >
                    <button
                      onClick={() => onSelectSong(song)}
                      className="flex-1 flex items-center gap-2 text-left min-w-0"
                    >
                      <span className="font-mono text-[10px] text-zinc-500 w-4 text-right shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="font-bold text-xs truncate flex items-center gap-1.5">
                          {isActive && <Play className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400 shrink-0" />}
                          <span className={isActive ? 'text-emerald-400 font-black' : ''}>{song.title}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-2">
                          <span className="text-zinc-400 font-bold">{song.bpm} BPM</span>
                          <span>&bull;</span>
                          <span>{song.patternName}</span>
                          {song.swingVal && song.swingVal !== 1.5 && (
                            <>
                              <span>&bull;</span>
                              <span className="text-emerald-500">SW {song.swingVal}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => onMoveSong(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-zinc-500 hover:text-white disabled:opacity-20"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onMoveSong(idx, 'down')}
                        disabled={idx === (activeList?.songs.length ?? 0) - 1}
                        className="p-1 text-zinc-500 hover:text-white disabled:opacity-20"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onDeleteSong(song.id)}
                        className="p-1 text-zinc-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* D. ★現在設定のプレビュー ＆ 新規曲追加フォーム */}
          <div className="pt-2.5 border-t border-zinc-800 space-y-2">
            {/* 登録内容のプレビューバッジ */}
            <div className="flex items-center justify-between text-[10px] px-1 bg-zinc-950/80 border border-zinc-800/80 rounded-lg py-1.5 px-2.5 text-zinc-400">
              <span className="flex items-center gap-1">
                <Info className="w-3 h-3 text-emerald-400 shrink-0" />
                {t.saveHint}:
              </span>
              <span className="font-mono text-emerald-400 font-bold tracking-tight">
                {currentBpm} BPM &bull; {currentPatternName} ({currentMode === 'drums' ? t.drumKit : t.metronome})
              </span>
            </div>

            <form onSubmit={handleAddSong} className="flex gap-2">
              <input
                type="text"
                placeholder={t.songTitlePlaceholder}
                value={newSongTitle}
                onChange={(e) => setNewSongTitle(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-300 font-bold text-xs transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.add}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
