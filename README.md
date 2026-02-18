# 📸 SassyCam v0.0.1

**The AI Webcam that roasts you—with love (mostly).**

[![GitHub license](https://img.shields.io/github/license/vhaloo/SassyCam)](https://github.com/vhaloo/SassyCam/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/vhaloo/SassyCam)](https://github.com/vhaloo/SassyCam/stargazers)
[![Python Version](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)

SassyCam is a sentient desktop companion that turns your webcam into a judgmental (but affectionate) critic. Using high-end AI vision and local speech processing, it watches you, listens to your excuses, and delivers punchy, context-aware commentary on your life, posture, and room cleanliness.

---

## ✨ Key Features

### 👁️ Visual Roasting (Vision AI)
Powered by **Google Gemini 1.5 Flash**, SassyCam analyzes your webcam feed in real-time. It doesn't just see a face; it sees your unbrushed hair, your messy background laundry, and that "I haven't slept in 48 hours" expression.

### 👂 Active Listening (Local STT)
Integrating **OpenAI Whisper (Tiny/Medium)**, the app listens to your spoken reactions. If you try to argue back, SassyCam incorporates your "pathetic excuses" into its next roast. Processing happens **locally** on your machine for privacy and speed.

### 🗣️ Smooth Vocal Delivery (Local TTS)
No robotic voices here. We use **Kokoro TTS**, a state-of-the-art local text-to-speech engine that delivers roasts with human-like intonation and clarity.

### 📊 Sass-O-Meter
Fully adjustable intensity levels:
- **Mild:** Friendly banter.
- **Passive-Aggressive:** Your typical office colleague.
- **Ruthless:** No filter.
- **Soul-Crushing:** You might actually clean your room after this.

### 🤖 Robot Integration (ROS 2)
SassyCam is now **ROS 2 compatible**. You can enable the **ROS 2 Bridge** in Settings to turn your robot into a judgmental sidekick.
- **Publisher:** Publishes the AI roasts as `std_msgs/String` to a configurable topic (default: `/sassy_cam/roast`).
- **Use Case:** Perfect for integration with a robot's speech synthesis or facial expression system.

---

## 🚀 Getting Started

### 🟢 For Non-Technical Users (Easy Way)

1. **Download:** Grab the latest `SassyCam_Release.zip` from the [Releases](https://github.com/vhaloo/SassyCam/releases) page.
2. **Extract:** Right-click the zip and select "Extract All".
3. **Run:** Double-click `Launch_SassyCam.bat` or `SassyCam.exe` inside the folder.
4. **Setup:**
   - On the first run, the app will download its "AI Brains" (~400MB).
   - Click **Settings** (top-right).
   - Enter your **Gemini API Key**. (See "How to get a Key" below).
   - Select your Camera and Microphone.
   - Click **Save**.

### 👨‍💻 For Developers (Building from Source)

**1. Prerequisites**
- **Python 3.9+**
4. **Hardware:** A working Webcam and Microphone.

### 🤖 For Robots (Optional)
If you wish to use the **ROS 2 Bridge**:
- Ensure you have a working **ROS 2** installation (Humble, Iron, or Jazzy recommended).
- Install `rclpy` in your Python environment.
- Enable the bridge in SassyCam **Settings**.

---

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

**4. Build Executable (Windows)**
```bash
build_release.bat
```

---

## 🔑 Obtaining a Gemini API Key

SassyCam requires a Google Gemini API Key to function. It is currently **free** for individual use.

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **"Create API Key"**.
4. Copy the key and paste it into SassyCam's **Settings** menu.

---

## 🛠️ Configuration & Customization

The **Settings** panel offers deep control over the experience:
- **Camera Index:** Instantly switch between multiple webcams.
- **Audio Input:** Choose which mic hears your shame.
- **Audio Output:** Choose which speakers deliver the sass.
- **Whisper Model:** Choose "tiny" for speed or "medium" for better understanding.
- **Auto-Sass Interval:** Set how often the AI roasts you while you're idle (10s to 5m).
- **Mic Sensitivity:** Adjust the threshold to ensure the AI only hears you, not your keyboard.

---

## 🏗️ Technical Architecture

- **GUI Framework:** `PyQt6` (Hardware accelerated, high-performance polling).
- **Vision Model:** `Gemini 1.5 Flash` (API-based, pinned for stability).
- **Audio Processing:** `OpenAI Whisper` (Local ONNX/CPU).
- **Voice Synthesis:** `Kokoro-ONNX` (Local high-fidelity TTS).
- **Hardware Access:** `OpenCV` (Camera) and `SoundDevice` (Audio).

### **Gemini Versioning**
This project explicitly pins **Gemini 1.5 Flash** as the primary vision engine. This version was chosen for its extreme speed and cost-effectiveness. The app performs a version-compatibility check on startup to ensure your API key supports this model.

---

## 🤝 Contributing

We love contributors! If you want to make SassyCam even more disrespectful or optimize the local models:
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/CoolNewSass`).
3. Commit your Changes (`git commit -m 'Added extra sarcasm'`).
4. Push to the Branch (`git push origin feature/CoolNewSass`).
5. Open a Pull Request.

---

## 📜 License & Disclaimer

**License:** Distributed under the **MIT License**. See `LICENSE` for more information.

**Disclaimer:** SassyCam is for **entertainment purposes only**. The "sass" generated is random and AI-driven. If you are sensitive to criticism regarding your appearance or environment, please use the "Mild" setting or refrain from use. We are not responsible for any ego damage sustained.

---

**Built with 🔥 by [Vhaloo](https://github.com/vhaloo)**
