# SassyCam

**The AI Webcam that roasts you.**

SassyCam is a desktop application that watches you through your webcam, listens to your excuses, and delivers affectionately roasting commentary using advanced AI.

## Features

- **Visual Sass:** Uses Gemini 1.5 Flash to analyze your appearance and surroundings.
- **Audio Context:** Listens to what you say (via local Whisper) and incorporates it into the roast.
- **Sass-O-Meter:** Adjustable "Sass Level" from "Mildly Critical" to "Ruthless".
- **Local TTS:** Uses Kokoro (high-quality local TTS) to deliver the lines.
- **Modern UI:** Dark/Neon aesthetic built with PyQt6.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/SassyCam.git
    cd SassyCam
    ```

2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the application:**
    ```bash
    python main.py
    ```

## Configuration

On first run, click **Settings** to:
- Enter your **Gemini API Key** (Required for the sass).
- Select your preferred **Voice** (Kokoro voices).
- Adjust the **Sass Level**.

## Requirements

- Python 3.9+
- Webcam
- Microphone
- Internet connection (for Gemini API)

## License

MIT
