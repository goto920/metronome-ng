import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Play, Square, RotateCcw, Layers, BookmarkPlus } from 'lucide-react';
import type { MetronomePattern, LoopTableRow } from '../types/metronome';
import { CLICK_CATEGORIES, categorizeClickPattern } from '../utils/patternCategorizer';
// import { translations, type Lang } from '../utils/i18n';
import { type Lang } from '../utils/i18n';

interface CustomLoopPanelProps {
  clickPatterns: MetronomePattern[];
  drumPatterns: MetronomePattern[];
  loopTable: LoopTableRow[];
  onAddRow: (bar: MetronomePattern, repeat: number) => void;
  onDeleteRow: (index: number) => void;
  onStartLoop: () => void;
  onRewindLoop: () => void;
  onSaveAsSong: (title: string, table: LoopTableRow[]) => void; // ★セットリストへ保存
  isPlayingLoop: boolean;
  loopStatus: { seq: number; repeat: number; bar: number };
  lang: Lang;
}

export function CustomLoopPanel({
  clickPatterns,
  drumPatterns,
  loopTable,
  onAddRow,
  onDeleteRow,
  onStartLoop,
  onRewindLoop,
  onSaveAsSong,
  isPlayingLoop,
  loopStatus,
  lang,
}: CustomLoopPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'click' | 'drum'>('click');
  const [selectedPatternName, setSelectedPatternName] = useState(clickPatterns[0]?.name || '');
  const [repeatCount, setRepeatCount] = useState(1);
  const [loopSongTitle, setLoopSongTitle] = useState('');

//  const t = translations[lang]; // Not used
  const currentPatterns = selectedType === 'click' ? clickPatterns : drumPatterns;

  const handleAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    const found = currentPatterns.find((p) => p.name === selectedPatternName);
    if (found) {
      onAddRow(found, repeatCount);
    }
  };

  const handleSaveLoop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loopSongTitle.trim() || loopTable.length === 0) return;
    onSaveAsSong(loopSongTitle, loopTable);
    setLoopSongTitle('');
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      {/* 1. 開閉トグルヘッダー */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900 hover:bg-zinc-800/80 active:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-black tracking-wider text-zinc-200">
            {lang === 'ja' ? '変拍子カスタムループ' : 'CUSTOM LOOP (ODD METER)'}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-800">
            {loopTable.length} bars
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isPlayingLoop && (
            <span className="text-[11px] font-mono text-emerald-400 animate-pulse font-bold">
              LOOPING...
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
          {/* A. ループ専用 再生 / 停止 / 巻き戻しコントロール */}
          <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800">
            <div className="font-mono text-[11px] text-zinc-400 space-y-0.5">
              <div>SEQ: <span className="text-emerald-400 font-bold">{String(loopStatus.seq + 1).padStart(2, '0')}</span> / {loopTable.length}</div>
              <div>REP: <span className="text-emerald-400 font-bold">{String(loopStatus.repeat).padStart(2, '0')}</span> | BAR: <span className="text-white font-bold">{String(loopStatus.bar + 1).padStart(3, '0')}</span></div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onRewindLoop}
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:scale-95 transition-all"
                title="Rewind"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={onStartLoop}
                disabled={loopTable.length === 0}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs tracking-wider shadow-md transition-all disabled:opacity-30 ${
                  isPlayingLoop
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                }`}
              >
                {isPlayingLoop ? (
                  <>
                    <Square className="w-4 h-4 fill-current" /> STOP
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" /> LOOP START
                  </>
                )}
              </button>
            </div>
          </div>

          {/* B. シーケンサーテーブル一覧 */}
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {loopTable.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 font-mono text-[11px]">
                {lang === 'ja' ? 'カスタムループの行がありません' : 'No custom loop rows added'}
              </div>
            ) : (
              loopTable.map((row, idx) => {
                const isCurrentSeq = isPlayingLoop && loopStatus.seq === idx;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isCurrentSeq
                        ? 'bg-emerald-950/50 border-emerald-500/80 text-white ring-1 ring-emerald-500/50'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[11px] text-zinc-500 w-5 text-right shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="font-bold text-xs truncate flex items-center gap-1.5">
                          {isCurrentSeq && <Play className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400 shrink-0 animate-pulse" />}
                          <span className={isCurrentSeq ? 'text-emerald-400 font-black' : ''}>{row.bar.name}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {row.bar.type === 'drumkit' ? 'Drum' : 'Click'} &bull; Rep: <strong className="text-zinc-300">{row.repeat}</strong> bar(s)
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteRow(idx)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Delete Row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* C. 行追加フォーム */}
          <form onSubmit={handleAddRow} className="space-y-2 pt-2 border-t border-zinc-800">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('click');
                    setSelectedPatternName(clickPatterns[0]?.name || '');
                  }}
                  className={`flex-1 py-1 text-[11px] font-bold rounded transition-all ${
                    selectedType === 'click' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500'
                  }`}
                >
                  Click
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('drum');
                    setSelectedPatternName(drumPatterns[0]?.name || '');
                  }}
                  className={`flex-1 py-1 text-[11px] font-bold rounded transition-all ${
                    selectedType === 'drum' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500'
                  }`}
                >
                  Drum
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                <span className="text-[10px] text-zinc-400 font-bold">Rep:</span>
                <select
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(parseInt(e.target.value, 10))}
                  className="w-full bg-transparent text-xs text-white focus:outline-none font-mono"
                >
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n} className="bg-zinc-950">
                      {n} bar{n > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedPatternName}
                onChange={(e) => setSelectedPatternName(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              >
                {selectedType === 'click' ? (
                  CLICK_CATEGORIES.map((cat) => (
                    <optgroup key={cat} label={`── ${cat} ──`} className="bg-zinc-900 text-emerald-400">
                      {clickPatterns
                        .filter((p) => categorizeClickPattern(p) === cat)
                        .map((p) => (
                          <option key={p.name} value={p.name} className="bg-zinc-950 text-white font-mono">
                            {p.name} ({p.numerator}/{p.denominator})
                          </option>
                        ))}
                    </optgroup>
                  ))
                ) : (
                  drumPatterns.map((p) => (
                    <option key={p.name} value={p.name} className="bg-zinc-950 text-white font-mono">
                      {p.name} ({p.numerator}/{p.denominator})
                    </option>
                  ))
                )}
              </select>

              <button
                type="submit"
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs transition-colors shrink-0 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'ja' ? '追加' : 'Add'}</span>
              </button>
            </div>
          </form>

          {/* D. ★現在のカスタムループをセットリスト（曲）として保存するフォーム */}
          {loopTable.length > 0 && (
            <form onSubmit={handleSaveLoop} className="flex gap-2 pt-2.5 border-t border-zinc-800">
              <input
                type="text"
                placeholder={lang === 'ja' ? 'ループ曲名を入力...' : 'Loop song title...'}
                value={loopSongTitle}
                onChange={(e) => setLoopSongTitle(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shrink-0 shadow"
                title="Save to Active Setlist"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>{lang === 'ja' ? 'セットリストに保存' : 'Save to List'}</span>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
