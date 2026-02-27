# Project History: SassyCam

## Session: February 27, 2026 (v0.1.2 - The Interactive Gallery Update)

### Objectives
- Transform SassyCam into an interactive art gallery.
- Implement timeline selection and external viewing.
- Fix audio-related crashes and stabilize Gemini REST integration.
- Ensure perfect subtitle alignment within the caricature frame.

### Actions Taken
1.  **UI Interactivity**:
    -   Implemented `ClickableLabel` with `clicked` and `doubleClicked` signals.
    -   Added horizontal gallery logic to populate thumbnails on startup.
    -   Enabled single-click to swap main view and double-click to open in OS viewer.
    -   Automated viewport scaling in `resizeEvent`.
2.  **Subtitle Engineering**:
    -   Parented `OverlayWidget` to the main image label.
    -   Implemented static, mood-based CSS styling (Devotion pink, Roast red).
3.  **Backend Stability**:
    -   Corrected Gemini model ID to `gemini-3.1-flash-image-preview`.
    -   Refactored `TTSManager` and `AudioManager` handshake to prevent type errors.
4.  **Distribution**:
    -   Updated README with detailed setup and troubleshooting for beginners.
    -   Built and packaged standalone v0.1.2 Windows binary.

### Status
-   **Version:** v0.1.2
-   **Build:** Stable & Released.

## Session: February 27, 2026 (v0.1.0 - The Devotion & Vision Update)

### Objectives
- Implement negative Sass-O-Meter scale (-100 to 100).
- Add "Devotion Mode" for deep, environment-aware compliments.
- Integrate Gemini 3.1 Flash Image (Nano Banana 2) for concurrent caricature generation.
- Ensure visual resemblance in caricatures using multimodal image-to-image input.
- Sync subtitles with TTS duration.
- Fix PyTorch DLL crash issues caused by dependency conflicts.

### Actions Taken
1.  **UI Refactoring**:
    -   Modified `SassMeter` to handle -100 to 100 range.
    -   Added "DEVOTION" label and pink/lovely color palette for negative values.
    -   Added `QProgressBar` and caricature display `QLabel` to `MainWindow`.
    -   Updated `OverlayWidget` to remove auto-hide, syncing it with `TTSManager` status signals.
2.  **AI & Vision Logic**:
    -   Rewrote `AIManager._get_system_prompt` to include soul-focused, detailed compliment logic for negative sass levels.
    -   Implemented `generate_caricature` using the latest February 27, 2026 Gemini REST API (v1beta generateContent).
    -   Enabled multimodal image input for caricatures by sending the camera frame alongside the prompt.
3.  **Environment Stability**:
    -   Diagnosed and fixed "WinError 1114" DLL crash.
    -   Isolated OpenAI/Anthropic imports (Lazy Loading) to prevent Pydantic version conflicts with PyTorch.
    -   Cleaned and reinstalled compatible PyTorch CPU binaries.
4.  **Publishing**:
    -   Bumped version to v0.1.0.
    -   Updated `CHANGELOG.md` and `PROJECT_HISTORY.md`.
    -   Pushed latest features to GitHub.

### Key Files
-   `src/core/ai_manager.py`: Gemini 3.1 Multimodal REST implementation.
-   `src/ui/main_window.py`: Concurrency and UI orchestration.
-   `src/ui/widgets/sass_meter.py`: Negative scale logic.

### Status
-   **Version:** v0.1.0 (Major Release)
-   **Build:** Stable & Functional.
