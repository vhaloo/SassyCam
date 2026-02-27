# 📸 SassyCam v0.1.0

**The AI Webcam that roasts you—or adores you.**

> **GitHub Description:** A sentient desktop companion that turns your webcam into a judgmental critic or an obsessive admirer. Powered by Gemini 3.1 Flash (Nano Banana 2), GPT-5, and Claude. Features multimodal image-to-image caricatures, dynamic audio-reactive UI, and persistent localized subtitles.

[![GitHub license](https://img.shields.io/github/license/vhaloo/SassyCam)](https://github.com/vhaloo/SassyCam/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/vhaloo/SassyCam)](https://github.com/vhaloo/SassyCam/stargazers)
[![Python Version](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/vhaloo/SassyCam)

SassyCam is a sentient desktop companion that turns your webcam into a judgmental (but affectionate) critic. Using high-end AI vision and local speech processing, it watches you, listens to your excuses, and delivers punchy, context-aware commentary on your life, posture, and room cleanliness.

---

## 🖼️ Screenshots

| Devotion Mode (-100) | Nuclear Roast (+100) |
| :---: | :---: |
| ![Devotion Mode](assets/screenshots/devotion_fixed.png) | ![Roast Mode](assets/screenshots/roast_fixed.png) |

---

## ✨ New in v0.1.0 (The Devotion & Vision Update)

### 💖 Devotion Mode (-100 to 0)
We've added a positive scale to the Sass-O-Meter. Sliding left triggers **Devotion Mode**.
- **Supportive AI:** SassyCam becomes your biggest fan, focusing on your inner beauty and radiant soul.
- **Environment Aware:** Compliments are woven into specific visual details like your clothing, lighting, and decor.

### 🎨 Gemini 3.1 Multimodal Caricatures
Native integration with the brand new **Nano Banana 2 (Gemini 3.1 Flash Image)**.
- **Image-to-Image:** SassyCam sends your actual camera frame to the AI to ensure the caricature matches your features and environment perfectly.
- **Dynamic Styles:** Generates varied art styles (Pencil, Watercolor, Charcoal, Digital) depending on the Sass Level.

### 🔊 Perfect Sync Subtitles
- **Hardware-Locked Timing:** Subtitles now appear and disappear in perfect sync with the audio hardware callback.
- **Persistent Text:** Subtitles stay on screen for the exact duration of the speech.

---

## 🚀 Quick Start (One-Liner Installation)

If you have **Git** and **Python 3.10+** installed, copy and paste the command for your OS into your terminal:

### 🪟 Windows
```powershell
git clone https://github.com/vhaloo/SassyCam.git && cd SassyCam && python -m venv venv && venv\Scripts\python.exe -m pip install -r requirements.txt && venv\Scripts\python.exe main.py
```

### 🍎 macOS
```bash
git clone https://github.com/vhaloo/SassyCam.git && cd SassyCam && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python main.py
```

### 🐧 Linux
```bash
git clone https://github.com/vhaloo/SassyCam.git && cd SassyCam && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python main.py
```

---

## 📦 Installation Options

### 🟢 Windows (One-Click Installer)
1.  **Download:** Download [Install_SassyCam.bat](https://github.com/vhaloo/SassyCam/blob/master/Install_SassyCam.bat) to any folder.
2.  **Run:** Double-click the file. It will automatically clone the repo, set up a virtual environment, install all dependencies, and launch the app.

### 🔵 Standalone Binary (Windows Only)
1.  **Download:** Grab the [latest SassyCam_v0.1.0_Windows.zip](https://github.com/vhaloo/SassyCam/releases/latest).
2.  **Extract & Run:** Unzip and double-click `SassyCam.exe`. No Python or Git required!

---

## 📋 Requirements

### Software
- **Python 3.10 - 3.14**: Required for source installation.
- **Git**: Required for cloning the repository.
- **Gemini API Key**: Essential for vision features and caricature generation. Get one for free at [Google AI Studio](https://aistudio.google.com/).

### Hardware
- **Webcam**: Any standard USB or integrated camera.
- **Microphone**: Required for "Hearing" mode and voice reactivity.
- **Speakers**: Required for Text-to-Speech (Kokoro engine).
- **RAM**: 8GB+ recommended (Whisper and Kokoro run locally).

---

## 🛠️ Configuration

### Sass-O-Meter Guide
- **-100 to -67:** **DEVOTION.** Poetic odes to your soul.
- **-66 to -34:** **FANBOY.** Enthusiastic hype-man.
- **-33 to -1:** **SWEET.** Mild support.
- **0 to 30%:** **MILD.** Passive-aggressive commentary.
- **31 to 70%:** **SASSY.** Standard SassyCam experience.
- **71 to 94%:** **SAVAGE.** Mean and personal.
- **95 to 100%:** **EMOTIONAL DAMAGE.** Absolute verbal destruction.

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

**Built with 🔥 by [Vhaloo](https://github.com/vhaloo)**
