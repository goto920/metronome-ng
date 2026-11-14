import { X, HelpCircle } from 'lucide-react';
import { translations, type Lang } from '../utils/i18n';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
}

export function HelpModal({ isOpen, onClose, lang }: HelpModalProps) {
  if (!isOpen) return null;
  const t = translations[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md max-h-[85vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2 text-emerald-400">
            <HelpCircle className="w-5 h-5" />
            <h2 className="text-sm font-black tracking-wider text-zinc-100 uppercase">
              {t.helpTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* スクロール可能な本文 */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-zinc-300">
          {t.helpContent.map((item, idx) => (
            <div key={idx} className="bg-zinc-950/60 border border-zinc-800/80 p-3.5 rounded-xl space-y-1">
              <h3 className="font-bold text-emerald-400 text-xs">{item.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* フッター */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold text-xs transition-all shadow-md"
          >
            {t.helpClose}
          </button>
        </div>
      </div>
    </div>
  );
}
