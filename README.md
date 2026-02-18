# 📸 SassyCam v0.0.1

**The AI Webcam that roasts you—with love (mostly).**

[![GitHub license](https://img.shields.io/github/license/vhaloo/SassyCam)](https://github.com/vhaloo/SassyCam/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/vhaloo/SassyCam)](https://github.com/vhaloo/SassyCam/stargazers)
[![Python Version](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/vhaloo/SassyCam)

SassyCam is a sentient desktop companion that turns your webcam into a judgmental (but affectionate) critic. Using high-end AI vision and local speech processing, it watches you, listens to your excuses, and delivers punchy, context-aware commentary on your life, posture, and room cleanliness.

---

## ✨ Key Features

### 👁️ Visual Roasting (Vision AI)
Powered by **Google Gemini 1.5 Flash**, SassyCam analyzes your webcam feed in real-time. It doesn't just see a face; it sees your unbrushed hair, your messy background laundry, and your "I haven't slept" expression.

### 👂 Active Listening (Local STT)
Integrating **OpenAI Whisper (Tiny/Medium)**, the app listens to your spoken reactions. If you try to argue back, SassyCam incorporates your "pathetic excuses" into its next roast. Processing happens **locally** for privacy and speed.

### 🗣️ Multilingual Vocal Delivery (Local TTS)
SassyCam now speaks multiple languages! Using **Kokoro TTS**, it delivers roasts with human-like intonation in:
- 🇺🇸 **English**
- 🇫🇷 **French**
- 🇯🇵 **Japanese**
- 🇰🇷 **Korean**
- 🇨🇳 **Chinese**
- 🇪🇸 **Spanish**

### 📊 Sass-O-Meter & Boredom Detection
- **Adjustable Intensity:** From "Mild" banter to "Soul-Crushing" ruthlessness.
- **Boredom Timer:** If you stay silent for too long, SassyCam gets bored and initiates a roast automatically.

---

## 🚀 Getting Started

SassyCam is fully cross-compatible with **Windows, macOS, and Linux**.

### 🟢 For Non-Technical Users (One-Click Install)

#### **Windows:**
1. **Download:** Clone or download this repository.
2. **Run:** Double-click **`install.bat`**. 
3. **Wait:** It will automatically set up a private environment, install everything, and launch the app.
4. **Setup:** On the first run, click **Settings**, enter your **Gemini API Key**, and select your language.

#### **macOS / Linux:**
1. Open a terminal in the folder.
2. Run `sh build_release.sh` to build or simply follow the Developer steps below.

---

## 🔑 Obtaining a Gemini API Key

SassyCam requires a Google Gemini API Key. It is currently **free** for individual use.

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **"Create API Key"**.
4. Copy the key and paste it into SassyCam's **Settings** menu.

---

## 🛠️ Configuration & Customization

The **Settings** panel offers deep control:
- **Response Language:** Switch between English, French, Spanish, etc.
- **Voice Selection:** Choose specific voice models for your selected language.
- **Hardware Selection:** Switch Cameras, Microphones, and Speakers instantly.
- **Auto-Sass Interval:** Set the boredom timer (10s to 5m).
- **Mic Sensitivity:** Visual feedback via the "Mic Dot" helps you find the perfect threshold.

---

## 🏗️ Technical Architecture

- **GUI Framework:** `PyQt6` (Hardware accelerated).
- **Vision Model:** `Gemini 1.5 Flash` (API-based, pinned for stability).
- **Audio Processing:** `OpenAI Whisper` (Local).
- **Voice Synthesis:** `Kokoro-ONNX` (Local).
- **Deployment:** `PyInstaller` for standalone executables.

---

## 📜 License & Disclaimer

**License:** Distributed under the **MIT License**.

**Disclaimer:** SassyCam is for **entertainment purposes only**. We are not responsible for any ego damage sustained during use.

---

**Built with 🔥 by [Vhaloo](https://github.com/vhaloo)**
