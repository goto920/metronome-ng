import { useEffect, useRef } from 'react';

/**
 * 再生中に画面がスリープして消えるのを防ぐカスタムフック (Screen Wake Lock API)
 */
export function useWakeLock(enabled: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    // API がブラウザでサポートされているか確認
    if (!('wakeLock' in navigator)) return;

    let isSubscribed = true;

    const requestLock = async () => {
      try {
        if (wakeLockRef.current === null && document.visibilityState === 'visible') {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch (err) {
        // バッテリー低下時や非アクティブ時などは例外が発生することがあるため安全に無視
        console.warn('Wake Lock request failed:', err);
      }
    };

    const releaseLock = async () => {
      if (wakeLockRef.current !== null) {
        try {
          await wakeLockRef.current.release();
        } catch {
          // ignore
        }
        wakeLockRef.current = null;
      }
    };

    if (enabled) {
      requestLock();
    } else {
      releaseLock();
    }

    // タブが裏から表に戻ってきた時の再取得処理
    const handleVisibilityChange = () => {
      if (isSubscribed && enabled && document.visibilityState === 'visible') {
        requestLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isSubscribed = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseLock();
    };
  }, [enabled]);
}
