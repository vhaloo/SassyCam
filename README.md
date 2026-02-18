# 📸 SassyCam - Easy Install Guide

SassyCam is a funny AI webcam that roasts you. This version is designed to be easy to install and run.

## 🟢 For Non-Technical Users (Windows)

1.  **Download:** Download the `SassyCam_Release.zip` file (if provided) or the source code.
2.  **Run:** Open the folder and double-click **`SassyCam.exe`** (inside the SassyCam folder) or **`Launch_SassyCam.bat`**.
3.  **First Time Setup:**
    *   The app might take a minute to start as it downloads necessary AI brains (Whisper & Kokoro).
    *   If you don't have "FFmpeg" installed, the app will automatically download it for you.
4.  **Settings:**
    *   Click the **Settings** button.
    *   Paste your **Gemini API Key**. (See below on how to get one).
    *   Click **Save**.

That's it! The camera will turn on, and the AI will start judging you.

---

## 🔑 How to get a Gemini API Key (It's Free)

1.  Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Sign in with your Google Account.
3.  Click **"Create API Key"**.
4.  Copy the key (it starts with `AIza...`).
5.  Paste it into SassyCam's settings.

---

## 🛠️ Troubleshooting

*   **"Black Screen":** Go to Settings and try changing the "Camera Index" (0, 1, 2...).
*   **"Mic Status is Grey":** Go to Settings and lower the "Mic Sensitivity" slider (slide left).
*   **"Error 404":** Your API Key might be invalid, or the `gemini-1.5-flash` model isn't available in your country yet.

---

## 👨‍💻 For Developers (Building from Source)

1.  `pip install -r requirements.txt`
2.  `python main.py`
3.  **To Build EXE:** Run `build_release.bat`.

---

**License:** MIT
