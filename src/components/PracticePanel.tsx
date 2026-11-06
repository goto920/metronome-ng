import { useState } from 'react';
import { Sliders, ChevronDown, ChevronUp, Timer, Zap, VolumeX } from 'lucide-react';
import type { MetronomeConfig } from '../audio/MetronomeEngine';
import { translations, type Lang } from '../utils/i18n';

interface PracticePanelProps {
  config: MetronomeConfig;
  updateConfig: (partial: Partial<MetronomeConfig>) => void;
  isPlaying: boolean;
  timeRemaining: number;
  barsRemaining: number;
  lang: Lang;
}

export const BAR_LIMIT_OPTIONS = [0, 2, 4, 8, 16, 32, 64, 128, 256] as const;

export function PracticePanel({
  config,
  updateConfig,
  isPlaying,
  timeRemaining,
  barsRemaining,
  lang,
}: PracticePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = translations[lang];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      {/* 開閉トグルヘッダー */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900 hover:bg-zinc-800/80 active:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-black tracking-wider text-zinc-200">
            {t.practiceTools}
          </span>
        </div>

        {/* 稼働中インジケーター */}
        <div className="flex items-center gap-2">
          {isPlaying && config.timerSeconds > 0 && (
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
              {formatTime(timeRemaining)}
            </span>
          )}
          {isPlaying && config.timerBars > 0 && (
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
              {barsRemaining} {t.bars.toUpperCase()}
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </div>
      </button>

      {/* パネル本体 */}
      {isOpen && (
        <div className="p-4 space-y-5 border-t border-zinc-800/80 text-xs text-zinc-300">
          {/* 1. 練習タイマー */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-zinc-400">
              <Timer className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.timer}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">{t.timeLimit}</label>
                <select
                  value={config.timerSeconds}
                  onChange={(e) => updateConfig({ timerSeconds: parseInt(e.target.value, 10) })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                >
                  <option value={0}>{t.off}</option>
                  <option value={30}>30 {t.sec}</option>
                  <option value={60}>1 {t.min}</option>
                  <option value={120}>2 {t.min}</option>
                  <option value={180}>3 {t.min}</option>
                  <option value={300}>5 {t.min}</option>
                  <option value={600}>10 {t.min}</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">{t.barLimit}</label>
                <select
                  value={config.timerBars}
                  onChange={(e) => updateConfig({ timerBars: parseInt(e.target.value, 10) })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                >
                  <option value={0}>{t.off}</option>
                  {BAR_LIMIT_OPTIONS.filter((b) => b > 0).map((b) => (
                    <option key={b} value={b}>
                      {b} {t.bars}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. スウィング ＆ 裏拍音量 */}
          <div className="space-y-3 pt-1 border-t border-zinc-800">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-zinc-400">{t.swing}</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {config.swingVal === 1.5
                    ? t.straight
                    : config.swingVal === 2.0
                    ? t.triplet
                    : config.swingVal.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={1.2}
                max={2.4}
                step={0.05}
                value={config.swingVal}
                onChange={(e) => updateConfig({ swingVal: parseFloat(e.target.value) })}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-1">
                <span>{t.tight}</span>
                <span>{t.straight}</span>
                <span>{t.triplet}</span>
                <span>{t.heavy}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-zinc-400">{t.evenVol}</span>
                <span className="font-mono text-zinc-400">{Math.round(config.evenVol * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={1.0}
                step={0.05}
                value={config.evenVol}
                onChange={(e) => updateConfig({ evenVol: parseFloat(e.target.value) })}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          {/* 3. 自動テンポ加減速 */}
          <div className="space-y-2 pt-1 border-t border-zinc-800">
            <div className="flex items-center gap-1.5 font-bold text-zinc-400">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.autoIncrement}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">{t.changeBpm}</label>
                <select
                  value={config.increment}
                  onChange={(e) => updateConfig({ increment: parseInt(e.target.value, 10) })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                >
                  <option value={-5}>-5 bpm</option>
                  <option value={-2}>-2 bpm</option>
                  <option value={-1}>-1 bpm</option>
                  <option value={0}>0 ({t.off})</option>
                  <option value={1}>+1 bpm</option>
                  <option value={2}>+2 bpm</option>
                  <option value={3}>+3 bpm</option>
                  <option value={5}>+5 bpm</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">{t.everyBars}</label>
                <select
                  value={config.perBars}
                  onChange={(e) => updateConfig({ perBars: parseInt(e.target.value, 10) })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                >
                  <option value={0}>{t.off}</option>
                  <option value={1}>1 {t.bars}</option>
                  <option value={2}>2 {t.bars}</option>
                  <option value={4}>4 {t.bars}</option>
                  <option value={8}>8 {t.bars}</option>
                  <option value={16}>16 {t.bars}</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. ランダム小節ミュート */}
          <div className="space-y-2 pt-1 border-t border-zinc-800">
            <div className="flex items-center gap-1.5 font-bold text-zinc-400">
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              <span>{t.randomMute}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">{t.muteDuration}</label>
                <select
                  value={config.muteBars}
                  onChange={(e) => updateConfig({ muteBars: parseInt(e.target.value, 10) })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                >
                  <option value={0}>{t.off}</option>
                  <option value={1}>1 {t.bars}</option>
                  <option value={2}>2 {t.bars}</option>
                  <option value={4}>4 {t.bars}</option>
                  <option value={8}>8 {t.bars}</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">{t.probability}</label>
                <select
                  value={config.muteProb}
                  onChange={(e) => updateConfig({ muteProb: parseFloat(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                >
                  <option value={0.0}>0%</option>
                  <option value={0.2}>20%</option>
                  <option value={0.3}>30%</option>
                  <option value={0.5}>50%</option>
                  <option value={0.7}>70%</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
