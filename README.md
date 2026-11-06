# Metronome Next Generation (metronome-ng)

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue)](https://goto920.github.io/metronome-ng/)

**[English]**  
A high-precision, low-latency, drummer-first web metronome and groove machine. Built from the ground up for serious groove training, complex odd-time meters, and stage/studio rehearsals. Powered by Web Audio API, React 19, TypeScript, and Tailwind CSS.

**[日本語]**  
ドラマー・演奏者のための練習用・超高精度メトロノーム＆グルーヴマシン。ゼロレイテンシーの即時発音、本物の生ドラムセットからサンプリングした高音質ドラムパターン、ハネ（スウィング）調整、変拍子対応、体内時計特訓用の小節ミュート機能など、徹底的に演奏者目線で設計されています。

---

## 🚀 Live Demo / 実機デモ
👉 **https://goto920.github.io/metronome-ng/**  
*(PC, Mac, iPad, iPhone, Android 対応。古い iOS 12 端末でも動作するよう設計されています)*

---

## ✨ Features / 主な特徴

- **Rock-Solid Timing (Lookahead Dual-Clock Scheduler)**
  - Web Audio API のハードウェアクロックと Web Worker を組み合わせた Chris Wilson 氏の「二重時計方式」を採用。
  - バックグラウンド再生やタブ切り替え時でも一切リズムがヨレません。
- **Zero-Latency Start & Auto-Attack Trimming**
  - スタートボタンを押した瞬間の `currentTime` に直ちに第1拍目を予約。
  - MP3 特有のエンコーダー遅延（先頭の無音）を自動検出し、カウベル・ドラム・音声カウントのアタックをジャストに揃えます。
- **200+ Drum Grooves (Jim Riley's Survival Guide)**
  - 名著『Survival Guide for the Modern Drummer』(Jim Riley 著) に準拠した 10 ジャンル（Pop, Blues, Swing, Country, Rock/Motown, Dance, Funk/Fusion, Odd-Time, Metal, World）のドラムパターンを網羅。
- **Odd-Time & Poly-Meters (変拍子・複合拍子)**
  - 5/4, 7/8, 9/8, 11/8, 13/16, 17/16 などのプログレッシブな変拍子に対応。
- **Swing / Shuffle Ratio Control**
  - ストレートから 3連符シャッフル（2:1 比率）、レヴィー・スウィングまで自在に調整。
- **Drummer-Specific Practice Tools**
  - **Random Bar Mute**: 指定確率でランダムに小節をミュートし、体内時計を鍛えるブラインド練習。
  - **Auto Tempo Increment**: X 小節ごとにテンポを自動で加減速。
  - **Down Beat / Offbeat Volume**: 拍の頭や裏拍の音量を調整。
- **PWA & Offline Ready**
  - 電波の届かない地下スタジオや防音室でもオフラインで完全に動作します。

---

## 🛠 Tech Stack / 技術スタック

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS v4
- **Audio Core**: Web Audio API + Web Worker (Chris Wilson Lookahead pattern)
- **Legacy Browser Support**: `@vitejs/plugin-legacy` (iOS 12.5.6 / Safari 12+)
- **Icons**: Lucide React

---

## 💻 Development / 開発手順

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# プロダクションビルド
npm run build

# GitHub Pages へのデプロイ
npm run deploy
```

## 📄 License / ライセンス
MIT License

Drum grooves based on the concepts from Survival Guide for the Modern Drummer by Jim Riley.

## 👏 Credits & Acknowledgments

Author: Kunio Goto (@goto920)

Development Assistance: Developed with the assistance of Google Gemini (AI Studio)

以上
