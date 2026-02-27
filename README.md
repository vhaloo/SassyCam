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
Sliding left triggers **Devotion Mode**. SassyCam becomes your biggest fan, focusing on your inner beauty and radiant soul, woven into specific visual details like your clothing and decor.

### 🎨 Gemini 3.1 Multimodal Caricatures
Native integration with **Gemini 3.1 Flash Image**. SassyCam sends your actual camera frame to the AI to ensure the caricature matches your features and environment perfectly.

---

## 🛠️ Step-by-Step Setup (For Beginners)

### 1. Prerequisites
You need two free tools installed on your computer:
-   **Python 3.10+**: [Download here](https://www.python.org/downloads/) (Crucial: Check "Add Python to PATH" during installation).
-   **Git**: [Download here](https://git-scm.com/downloads).

### 2. Get an API Key
SassyCam needs a "brain" to see and talk. 
-   Go to **[Google AI Studio](https://aistudio.google.com/)**.
-   Click **"Get API Key"** and copy your free key.

### 3. Install SassyCam

#### **🪟 Windows (Easiest Method)**
1.  Download [Install_SassyCam.bat](https://github.com/vhaloo/SassyCam/blob/master/Install_SassyCam.bat).
2.  Double-click it. It will handle the entire installation and launch the app for you.

#### **🍎 macOS / 🐧 Linux**
1.  Open your **Terminal**.
2.  Paste this and press Enter:
    ```bash
    git clone https://github.com/vhaloo/SassyCam.git && cd SassyCam && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python main.py
    ```

---

## 🎮 How to Use

1.  **Launch**: Once open, the app will initialize your camera and load the AI models locally.
2.  **The Sass-O-Meter**: 
    -   **Drag Left (-100 to 0)**: Compliment/Devotion Mode.
    -   **Drag Right (0 to 100)**: Roast/Sass Mode.
3.  **Talk to it**: Just start speaking! SassyCam listens for your voice and will respond to what you say.
4.  **Get a Drawing**: Every time SassyCam speaks, it will concurrently generate a caricature. You can also manually click **"Generate Caricature"** to refresh the drawing based on the last response.
5.  **Settings**: Click the "Settings" button to paste your API Key, change your voice, or switch cameras.

---

## ❓ Troubleshooting (Common Issues)

-   **"WinError 1114" (DLL Load Failed)**: This usually means a conflict with your graphics drivers or Python version. Ensure you are using Python 3.10-3.14 and have updated your Windows updates.
-   **Black Screen / No Camera**: Go to **Settings** and try a different **Camera Index** (0, 1, or 2).
-   **No Sound**: Ensure your output device is correct in **Settings**. The first time you use a new voice, it may take 10-20 seconds to download the voice file.
-   **No Caricature**: Ensure your **Gemini API Key** is correctly entered in Settings.

---

## 🤝 How to Contribute

We love community improvements! 
1.  **Report Bugs**: Open an [Issue](https://github.com/vhaloo/SassyCam/issues) describing what happened.
2.  **Suggest Features**: Want a "British Butler" mode? Tell us in the issues!
3.  **Code**: 
    -   Fork the repository.
    -   Create a new branch (`git checkout -b feature/cool-new-thing`).
    -   Commit your changes and push to GitHub.
    -   Open a **Pull Request**.

---

**Built with 🔥 by [Vhaloo](https://github.com/vhaloo)**
