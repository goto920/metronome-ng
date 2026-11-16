import { useState, useEffect, useCallback } from 'react';
import type { MetronomePattern, LoopTableRow } from '../types/metronome';
import rawSetListSample from '../data/setListSample.json';

export interface SetlistSong {
  id: string;
  title: string;
  bpm: number;
  mode: 'metronome' | 'drums' | 'loop'; // ★ 'loop' を追加
  patternName: string;
  metroSound?: string;
  swingVal?: number;
  table?: LoopTableRow[]; // ★ table を追加
}


export interface SetlistData {
  id: string;
  name: string;
  isProtected?: boolean; // 削除不可フラグ
  songs: SetlistSong[];
}

// ★キーを v2 に変更して古いテスト用キャッシュを一掃！
const STORAGE_KEY = 'metronome_ng_setlists_v2';

// サンプル曲の生成関数（table データを確実に引き継ぐように修正）
export function createSampleSongs(): SetlistSong[] {
  return rawSetListSample.items.map((item: any, idx: number) => {
    const isLoop = !!item.table && item.table.length > 0;
    const isDrum = item.bar?.type === 'drumkit';
    
    return {
      id: `sample_song_${idx}`,
      title: item.song,
      bpm: typeof item.bpm === 'string' ? parseFloat(item.bpm) : item.bpm,
      mode: isLoop ? 'loop' : (isDrum ? 'drums' : 'metronome'),
      patternName: isLoop ? 'Odd-Meter Loop' : (item.bar ? item.bar.name : '4/4'),
      swingVal: item.bar?.swingVal ?? 1.5,
      // ★ ここで json に含まれる変拍子テーブルを確実にコピーする
      table: item.table ? item.table.map((t: any) => ({
        bar: t.bar,
        repeat: t.repeat ?? 1,
      })) : undefined,
    };
  });
}

const initialLists: SetlistData[] = [
  {
    id: 'default_setlist',
    name: 'Default',
    isProtected: true,
    songs: [],
  },
  {
    id: 'sample_setlist',
    name: 'Sample Tracks',
    isProtected: true,
    songs: createSampleSongs(),
  },
];

export function useSetlist() {
  const [setlists, setSetlists] = useState<SetlistData[]>(initialLists);
  const [activeListId, setActiveListId] = useState<string>('default_setlist');
  const [activeSongId, setActiveSongId] = useState<string | null>(null);

  // 初期読み込み
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        let parsed = JSON.parse(saved) as SetlistData[];

        // Default と Sample Tracks の保護を確実に復旧
        parsed = parsed.map((l) => {
          const lower = l.name.toLowerCase();
          if (l.id === 'default_setlist' || lower === 'default') {
            return { ...l, id: 'default_setlist', name: 'Default', isProtected: true };
          }
          if (l.id === 'sample_setlist' || lower.includes('sample')) {
            return { ...l, id: 'sample_setlist', name: 'Sample Tracks', isProtected: true };
          }
          return l;
        });

        // リスト欠損防止
        if (!parsed.some((l) => l.id === 'default_setlist')) {
          parsed.unshift(initialLists[0]);
        }
        if (!parsed.some((l) => l.id === 'sample_setlist')) {
          parsed.push(initialLists[1]);
        }

        setSetlists(parsed);
        setActiveListId(parsed[0].id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return;
      }
    } catch (e) {
      console.warn('Failed to load setlists:', e);
    }

    // 保存データがない場合の完全初期化
    setSetlists(initialLists);
    setActiveListId(initialLists[0].id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialLists));
  }, []);

  const saveToStorage = useCallback((data: SetlistData[]) => {
    setSetlists(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const activeList = setlists.find((l) => l.id === activeListId) || setlists[0];

  const createSetlist = useCallback((name: string) => {
    if (!name.trim()) return;
    const newList: SetlistData = {
      id: `list_${Date.now()}`,
      name: name.trim(),
      songs: [],
    };
    const next = [...setlists, newList];
    saveToStorage(next);
    setActiveListId(newList.id);
  }, [setlists, saveToStorage]);

  const deleteSetlist = useCallback((id: string) => {
    const target = setlists.find((l) => l.id === id);
    if (!target) return;
    const lower = target.name.toLowerCase();
    // Default と Sample は絶対に削除させない
    if (target.isProtected || target.id === 'default_setlist' || target.id === 'sample_setlist' || lower === 'default' || lower.includes('sample')) {
      return;
    }

    const next = setlists.filter((l) => l.id !== id);
    saveToStorage(next);
    setActiveListId(next[0].id);
  }, [setlists, saveToStorage]);

  const resetSampleList = useCallback(() => {
    const next = setlists.map((l) => {
      if (l.id === 'sample_setlist' || l.name.toLowerCase().includes('sample')) {
        return {
          id: 'sample_setlist',
          name: 'Sample Tracks',
          isProtected: true,
          songs: createSampleSongs(),
        };
      }
      return l;
    });
    saveToStorage(next);
  }, [setlists, saveToStorage]);

  const addCurrentSong = useCallback((
    title: string,
    bpm: number,
    mode: 'metronome' | 'drums' | 'loop',
    pattern: MetronomePattern,
    metroSound: string,
    swingVal: number,
    table?: LoopTableRow[] // ★追加
  ) => {
    if (!title.trim() || !activeList) return;

    const newSong: SetlistSong = {
      id: `song_${Date.now()}`,
      title: title.trim(),
      bpm,
      mode,
      patternName: mode === 'loop' ? 'Odd-Meter Loop' : pattern.name,
      metroSound: mode === 'metronome' ? metroSound : undefined,
      swingVal,
      table, // ★追加
    };

    const next = setlists.map((l) => {
      if (l.id === activeList.id) {
        return { ...l, songs: [...l.songs, newSong] };
      }
      return l;
    });

    saveToStorage(next);
    setActiveSongId(newSong.id);
  }, [activeList, setlists, saveToStorage]);

  const deleteSong = useCallback((songId: string) => {
    if (!activeList) return;
    const next = setlists.map((l) => {
      if (l.id === activeList.id) {
        return { ...l, songs: l.songs.filter((s) => s.id !== songId) };
      }
      return l;
    });
    saveToStorage(next);
    if (activeSongId === songId) {
      setActiveSongId(null);
    }
  }, [activeList, setlists, activeSongId, saveToStorage]);

  const moveSong = useCallback((index: number, direction: 'up' | 'down') => {
    if (!activeList) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= activeList.songs.length) return;

    const songs = [...activeList.songs];
    const [moved] = songs.splice(index, 1);
    songs.splice(targetIdx, 0, moved);

    const next = setlists.map((l) => (l.id === activeList.id ? { ...l, songs } : l));
    saveToStorage(next);
  }, [activeList, setlists, saveToStorage]);

  const getAdjacentSong = useCallback((direction: 'next' | 'prev'): SetlistSong | null => {
    if (!activeList || activeList.songs.length === 0) return null;
    if (!activeSongId) return activeList.songs[0];

    const currentIdx = activeList.songs.findIndex((s) => s.id === activeSongId);
    if (currentIdx === -1) return activeList.songs[0];

    const nextIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (nextIdx < 0 || nextIdx >= activeList.songs.length) return null;

    return activeList.songs[nextIdx];
  }, [activeList, activeSongId]);

  return {
    setlists,
    activeList,
    activeListId,
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
  };
}
