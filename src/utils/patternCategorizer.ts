import type { MetronomePattern } from '../types/metronome';

// ==========================================
// 1. ドラムパターンのジャンル定義 (Jim Riley 10章)
// ==========================================
export const DRUM_GENRES = [
  'All',
  'Pop Drumming',
  'Blues',
  'Swing / Jazz',
  'Country',
  'Early Rock & Motown',
  'Dance & Electronic',
  'Funk & Fusion',
  'Odd-Time Signatures',
  'Metal & Double Bass',
  'Grooves from Around the World',
  'Other',
] as const;

export type DrumGenre = (typeof DRUM_GENRES)[number];

export function categorizeDrumPattern(name: string): DrumGenre {
  const n = name.toLowerCase();

  if (n.includes('odd') || n.includes('7/8') || n.includes('5/4') || n.includes('9/8') || n.includes('11/8') || n.includes('13/16')) {
    return 'Odd-Time Signatures';
  }
  if (n.includes('blues') || (n.includes('shuffle') && !n.includes('funk'))) {
    return 'Blues';
  }
  if (n.includes('swing') || n.includes('jazz') || n.includes('waltz') || n.includes('ride')) {
    return 'Swing / Jazz';
  }
  if (n.includes('country') || n.includes('train')) {
    return 'Country';
  }
  if (n.includes('motown') || n.includes('earlyrock') || (n.includes('rock') && !n.includes('pop'))) {
    return 'Early Rock & Motown';
  }
  if (n.includes('dance') || n.includes('disco') || n.includes('electronic') || n.includes('techno') || n.includes('house')) {
    return 'Dance & Electronic';
  }
  if (n.includes('funk') || n.includes('fusion') || n.includes('16beat')) {
    return 'Funk & Fusion';
  }
  if (n.includes('metal') || n.includes('double') || n.includes('blast')) {
    return 'Metal & Double Bass';
  }
  if (
    n.includes('latin') || n.includes('bossa') || n.includes('samba') ||
    n.includes('afro') || n.includes('world') || n.includes('reggae') ||
    n.includes('tango') || n.includes('bata')
  ) {
    return 'Grooves from Around the World';
  }
  if (n.includes('pop') || n.includes('8beat') || n.includes('ballad')) {
    return 'Pop Drumming';
  }

  return 'Other';
}

// ==========================================
// 2. メトロノーム（Clicks）の拍子別分類
// ==========================================
export const CLICK_CATEGORIES = [
  'Standard (4/4, 2/4...)',
  'Triple & Compound (3/4, 6/8, 12/8...)',
  'Odd Meter (5/4, 7/8, 13/16...)',
  'Swing & Shuffle',
] as const;

export type ClickCategory = (typeof CLICK_CATEGORIES)[number];

export function categorizeClickPattern(pattern: MetronomePattern): ClickCategory {
  const { name, numerator, denominator, swingVal } = pattern;

  if (swingVal !== undefined && swingVal > 1.5) {
    return 'Swing & Shuffle';
  }

  // 変拍子
  if ([5, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19].includes(numerator) && denominator !== 4 && denominator !== 8 && !name.includes('9/8')) {
    return 'Odd Meter (5/4, 7/8, 13/16...)';
  }
  if (numerator === 5 || numerator === 7 || numerator === 10 || numerator >= 13) {
    return 'Odd Meter (5/4, 7/8, 13/16...)';
  }

  // 3拍子・複合拍子
  if (numerator === 3 || numerator === 6 || numerator === 9 || numerator === 12) {
    return 'Triple & Compound (3/4, 6/8, 12/8...)';
  }

  // 標準
  return 'Standard (4/4, 2/4...)';
}
