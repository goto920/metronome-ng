// WebKit 互換型
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export interface SoundBufferInfo {
  buffer: AudioBuffer;
  startOffset: number; // 先頭無音を飛ばしたジャストな再生開始位置（秒）
}

export class AudioManager {
  private static instance: AudioManager | null = null;
  public context: AudioContext;
  private soundMap: Map<string, SoundBufferInfo> = new Map();
  private isUnlocked: boolean = false;

  private constructor() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContextClass();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * iOS / Safari のユーザー操作による Web Audio アンロック
   */
  public async unlock(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    if (!this.isUnlocked) {
      // 1フレームの無音バッファを再生して iOS のオーディオスタックを完全起動
      const buffer = this.context.createBuffer(1, 1, 22050);
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.context.destination);
      source.start(0);
      this.isUnlocked = true;
    }
  }

  /**
   * Vite の import.meta.glob で sounds フォルダ内の mp3 を一括読み込み
   */
  public async loadAllSounds(onProgress?: (loaded: number, total: number) => void): Promise<void> {
    const soundModules = import.meta.glob<{ default: string }>(
      '../assets/sounds/*.mp3',
      { eager: true }
    );

    const entries = Object.entries(soundModules);
    const total = entries.length;
    let loaded = 0;

    const loadPromises = entries.map(async ([path, module]) => {
      // パスからファイル名（拡張子なし）を取り出す（例: '../assets/sounds/snare.mp3' -> 'snare'）
      const soundName = path.split('/').pop()?.replace('.mp3', '');
      if (!soundName) return;

      try {
        const response = await fetch(module.default);
        const arrayBuffer = await response.arrayBuffer();
        
        // 旧 Safari 互換コールバック形式でも動作するように Promise ラップ
        const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
          this.context.decodeAudioData(arrayBuffer, resolve, reject);
        });

        // 先頭の無音フレームを検出してオフセット（秒）を計算
        const startOffset = this.detectLeadingSilence(audioBuffer);

        this.soundMap.set(soundName, {
          buffer: audioBuffer,
          startOffset,
        });
      } catch (err) {
        console.warn(`Failed to load sound: ${soundName}`, err);
      } finally {
        loaded++;
        onProgress?.(loaded, total);
      }
    });

    await Promise.all(loadPromises);
    console.log(`Loaded ${this.soundMap.size} sounds.`);
  }

  /**
   * 先頭の無音（エンコーダ遅延など）を検出するロジック
   */
  private detectLeadingSilence(buffer: AudioBuffer, threshold = 0.005): number {
    const channelData = buffer.getChannelData(0); // 第1チャンネルを走査
    const sampleRate = buffer.sampleRate;
    
    // 最初の 50ms 分のサンプル（先頭遅延の最大想定）をチェック
    const maxSearchSamples = Math.min(channelData.length, Math.floor(sampleRate * 0.05));

    for (let i = 0; i < maxSearchSamples; i++) {
      if (Math.abs(channelData[i]) > threshold) {
        // 音が立ち上がった位置（秒単位）
        return i / sampleRate;
      }
    }
    return 0;
  }

  public getSound(name: string): SoundBufferInfo | undefined {
    return this.soundMap.get(name);
  }

  public hasSound(name: string): boolean {
    return this.soundMap.has(name);
  }
}
