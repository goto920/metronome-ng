// 25ms ごとにメインスレッドへ tick メッセージを送るだけの超軽量 Worker
let timerId: number | null = null;
const interval = 25;

self.onmessage = (e: MessageEvent) => {
  if (e.data === 'start') {
    if (timerId !== null) clearInterval(timerId);
    timerId = self.setInterval(() => {
      self.postMessage('tick');
    }, interval);
  } else if (e.data === 'stop') {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }
};
