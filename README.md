# 📸 SassyCam v0.0.2

**The AI Webcam that roasts you—with love (mostly).**

[![GitHub license](https://img.shields.io/github/license/vhaloo/SassyCam)](https://github.com/vhaloo/SassyCam/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/vhaloo/SassyCam)](https://github.com/vhaloo/SassyCam/stargazers)
[![Python Version](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/vhaloo/SassyCam)

SassyCam is a sentient desktop companion that turns your webcam into a judgmental (but affectionate) critic. Using high-end AI vision and local speech processing, it watches you, listens to your excuses, and delivers punchy, context-aware commentary on your life, posture, and room cleanliness.

---

## ✨ Key Features (v0.0.2)

### 👁️ Visual Roasting (Vision AI)
Powered by **Google Gemini 2.0 Flash** (or GPT-4o/Claude), SassyCam analyzes your webcam feed in real-time. It doesn't just see a face; it sees your unbrushed hair, your messy background laundry, and your "I haven't slept" expression.

### 🗣️ Multilingual & Auto-Switching
SassyCam **automatically detects** the language you are speaking and switches its roasting persona instantly!
- 🇺🇸 **English**
- 🇫🇷 **French**
- 🇯🇵 **Japanese**
- 🇨🇳 **Chinese**
- 🇪🇸 **Spanish**
- 🇰🇷 **Korean**

Using **OpenAI Whisper (Base Model)** for accurate detection and **Kokoro TTS** for high-quality local speech.

### 📊 Reactive Sass-O-Meter
The UI is now alive!
- **Audio Reactive:** The interface pulses and glows in sync with your voice.
- **Sass Intensity:**
    - **Mild:** Friendly banter.
    - **Savage (80%+):** Zero positivity allowed.
    - **Nuclear (98%+):** Ruthless destruction. "Fatality" mode engaged.

### 🧠 Multi-Brain Support
Choose your preferred AI provider in Settings:
- **Google Gemini:** `gemini-2.0-flash` (Recommended - Free, Fast, Vision Capable).
- **OpenAI:** `gpt-4o` (Premium, Best Vision).
- **Anthropic:** `claude-3.5-sonnet` (Creative).
- **Pollinations:** `No-Login` (Free, **Text/Blind Only** - cannot see you).

---

## 🚀 Installation

### 🟢 Windows (Easiest)

1. **Download:** Grab the [latest SassyCam_Windows_v0.0.2.zip](https://github.com/vhaloo/SassyCam/releases/latest).
2. **Extract:** Unzip the folder to a location of your choice.
3. **Run:** Double-click **`Launch_SassyCam.bat`**.
4. **Setup:** On the first run, click **Settings**, enter your **Gemini API Key**, and select your language.

### 🟠 macOS / Linux (Source)

Since we do not distribute binaries for macOS/Linux yet, you can run from source easily.

**Prerequisites:** Python 3.9+ installed.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vhaloo/SassyCam.git
   cd SassyCam
   ```

2. **Create a virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # macOS/Linux
   # .\venv\Scripts\activate # Windows (PowerShell)
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   *Note: On Linux, you may need `sudo apt-get install espeak-ng` for TTS support.*

4. **Run the app:**
   ```bash
   python main.py
   ```

---

## 🛠️ Configuration & Customization

The **Settings** panel offers deep control:

- **API Keys:** Enter keys for Gemini, OpenAI, or Anthropic. Keys are stored locally in `config.json`.
- **Response Language:** Manually override language or let it Auto-Detect.
- **Voice Selection:** Choose specific voice models (e.g., `af_bella`, `am_michael`) for your selected language.
- **Hardware Selection:** Switch Cameras, Microphones, and Speakers instantly.
- **Auto-Sass Interval:** Set the boredom timer (Default: 15s). SassyCam will roast you automatically if you are silent.
- **Mic Sensitivity:** Visual feedback via the "Mic Dot" helps you find the perfect threshold.

### `config.json`
Advanced users can edit `config.json` directly in the app root to tweak hidden settings like `system_prompt_override` or `max_history`.

---

## 🤝 Contributing

We welcome contributions! Whether it's adding new sassy prompts, fixing bugs, or porting to new platforms.

1. **Fork** the repository.
2. **Create a Branch** (`git checkout -b feature/NewSass`).
3. **Commit** your changes.
4. **Push** to the branch.
5. **Open a Pull Request**.

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 📜 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

---

**Disclaimer:** SassyCam is for **entertainment purposes only**. We are not responsible for emotional damage, bruised egos, or sudden realizations that you need to clean your room.

**Built with 🔥 by [Vhaloo](https://github.com/vhaloo)**
