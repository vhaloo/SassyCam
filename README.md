# 📸 SassyCam v0.0.1

**The AI Webcam that roasts you—with love (mostly).**

SassyCam is a modern desktop application that turns your webcam into a sentient, slightly judgmental companion. Built with a sleek neon-dark UI, it uses Gemini 1.5 Flash to analyze your appearance and surroundings, providing real-time "sass" while listening to your excuses via local Whisper transcription.

![SassyCam UI Placeholder](https://raw.githubusercontent.com/vhaloo/SassyCam/master/assets/preview_placeholder.png) *(UI Screenshot coming soon)*

---

## ✨ Features

- **👁️ Visual Roasting:** Advanced image analysis via Gemini 1.5 Flash to judge your posture, hair, lighting, and messy backgrounds.
- **👂 Active Listening:** Integrates **OpenAI Whisper (Local)** to hear what you say and incorporate it into the roast.
- **🗣️ High-Quality Voice:** Uses **Kokoro TTS (Local)** for buttery-smooth, context-aware vocal delivery.
- **📊 Sass-O-Meter:** Adjustable intensity from "Passive-Aggressive" to "Soul-Crushing."
- **🎛️ Full Customization:** Select your specific camera, microphone, and speaker outputs directly in the app.
- **💡 Boredom Detection:** If you're too quiet, SassyCam gets bored and initiates the roast.
- **🌑 Cyberpunk UI:** A responsive, hardware-accelerated GUI built with PyQt6.

---

## 🛠️ Prerequisites

Before running SassyCam, ensure you have the following:

1.  **Python 3.9+** installed on your system.
2.  **FFmpeg** (Required for Whisper audio processing):
    - **Windows:** `choco install ffmpeg` or download from [ffmpeg.org](https://ffmpeg.org/download.html).
    - **Mac:** `brew install ffmpeg`
    - **Linux:** `sudo apt install ffmpeg`
3.  **Google Gemini API Key:** Get one for free at [Google AI Studio](https://aistudio.google.com/).
4.  **Hardware:** A working Webcam and Microphone.

---

## 🚀 Installation

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/vhaloo/SassyCam.git
    cd SassyCam
    ```

2.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the Application:**
    ```bash
    python main.py
    ```

---

## ⚙️ Configuration & First Run

1.  **Model Downloads:** On the first launch, SassyCam will automatically download the **Kokoro TTS** models (~300MB) and the **Whisper Tiny** model (~75MB) to the `assets/` folder.
2.  **Setup Settings:**
    - Click the **Settings** button in the top right.
    - Paste your **Gemini API Key**.
    - Select your **Camera Index** (it will update the preview instantly).
    - Choose your **Audio Input** (Mic) and **Output** (Speakers).
    - Adjust **Mic Sensitivity** if the AI isn't hearing you (look for the Cyan Mic Dot).
3.  **Save** and start being judged.

---

## 🏗️ Architecture

- **Frontend:** PyQt6 (Hardware Accelerated)
- **Vision:** Google Gemini 1.5 Flash (via API)
- **Speech-to-Text:** OpenAI Whisper (Local)
- **Text-to-Speech:** Kokoro-ONNX (Local)
- **Camera Pipeline:** OpenCV (Threaded polling)

---

## 🤝 Contributing

Contributions to make SassyCam even meaner (or more efficient) are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Warning:** SassyCam is intended for entertainment purposes. If you are sensitive about your messy room or bedhead, use with caution!
