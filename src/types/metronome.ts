// パターン内の各トラック（例: snare, bass, voice, click0 等）
export interface PatternTrack {
  note: string;
  values: number[]; // 0: 休符, 1〜9: 音量/ベロシティ
}

// 1小節分のビートパターン定義
export interface MetronomePattern {
  name: string;
  type: 'clicks' | 'drumkit';
  numerator: number;     // 拍数（分子: 4, 7, 8 など）
  denominator: number;   // 音符の長さ（分母: 4, 8, 16 など）
  default?: boolean;
  triplet?: boolean;
  swingVal?: number;
  pattern: PatternTrack[];
}

// カスタムループの1行（小節）
export interface LoopTableRow {
  bar: MetronomePattern;
  repeat: number;
}

// セットリストのアイテム
export interface SongItem {
  song: string;
  bpm: string | number;
  bar?: MetronomePattern;
  table?: LoopTableRow[];
}

export interface SetList {
  name: string;
  items: SongItem[];
}
