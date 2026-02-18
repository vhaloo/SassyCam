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
Powered by **Google Gemini 1.5 Flash**, SassyCam analyzes your webcam feed in real-time. It sees your unbrushed hair, your messy background laundry, and your "I haven't slept" expression.

### 👂 Active Listening (Local STT)
Integrating **OpenAI Whisper (Tiny/Medium)**, the app listens to your spoken reactions. If you try to argue back, SassyCam incorporates your "pathetic excuses" into its next roast. Processing happens **locally** for privacy and speed.

### 🗣️ Smooth Vocal Delivery (Local TTS)
Uses **Kokoro TTS**, a state-of-the-art local text-to-speech engine that delivers roasts with human-like intonation and clarity.

### 📊 Sass-O-Meter & Boredom Detection
- **Adjustable Intensity:** From "Mild" banter to "Soul-Crushing" ruthlessness.
- **Boredom Timer:** If you stay silent for too long, SassyCam gets bored and initiates a roast automatically.

### 🤖 Robot Integration (ROS 2 Bridge)
SassyCam includes an optional **ROS 2 Bridge**. When enabled, every AI roast is published as a `std_msgs/String` to a configurable topic (default: `/sassy_cam/roast`), allowing your robots to join in on the fun.

---

## 🚀 Getting Started

SassyCam is fully cross-compatible with **Windows, macOS, and Linux**.

### 🟢 For Non-Technical Users (Easy Way)

1. **Download:** Grab the latest `SassyCam_Release` for your platform from the [Releases](https://github.com/vhaloo/SassyCam/releases) page.
2. **Extract:** Unzip the folder to your desktop.
3. **Run:**
   - **Windows:** Double-click `Launch_SassyCam.bat`.
   - **macOS/Linux:** Open a terminal in the folder and run `sh Launch_SassyCam.sh`.
4. **Setup:**
   - On the first run, the app will download its AI models (~400MB) and a local copy of FFmpeg if missing.
   - Click **Settings** (top-right).
   - Enter your **Gemini API Key**. (See "How to get a Key" below).
   - Click **Save** and start being judged.

### 👨‍💻 For Developers (Building from Source)

**1. Prerequisites**
- **Python 3.9+**
- **FFmpeg:** (Automatically handled by the app on first run if not found).
- **System Libraries (Linux Only):**
  - UI Support: `sudo apt install libxcb-cursor0`
  - Audio Support: `sudo apt install libportaudio2`
- **ROS 2 (Optional):** If you wish to use the bridge, ensure `rclpy` is installed.

**2. Installation**
```bash
git clone https://github.com/vhaloo/SassyCam.git
cd SassyCam
pip install -r requirements.txt
```

**3. Run**
```bash
python main.py
```

**4. Build Standalone Executable**
- **Windows:** Run `build_release.bat`.
- **macOS/Linux:** Run `sh build_release.sh`.

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
- **Hardware Selection:** Switch Cameras, Microphones, and Speakers instantly.
- **Whisper Model:** Choose "tiny" for speed or "medium" for accuracy.
- **Auto-Sass Interval:** Set the boredom timer (10s to 5m).
- **Mic Sensitivity:** Visual feedback via the "Mic Dot" helps you find the perfect threshold.
- **ROS 2 Bridge:** Toggle the robot interface and set your custom roast topic.

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

**Disclaimer:** SassyCam is for **entertainment purposes only**. We are not responsible for any ego damage sustained during use. Use the "Mild" setting if you're having a bad hair day.

---

**Built with 🔥 by [Vhaloo](https://github.com/vhaloo)**
