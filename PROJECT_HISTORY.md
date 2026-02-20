# Project History: SassyCam

## Session: February 18, 2026 (DLL Hell & Build Engineering)
... (Previous history retained)

## Session: February 19, 2026 (v0.0.3 - The Future Update)

### Objectives
- Research and integrate the latest 2026 AI models.
- Implement "Web Login" / No-Key access.
- Add visual Sass Overlay (subtitles) with dynamic styling.
- Add Startup Splash Screen.
- Release v0.0.3.

### Actions Taken
1.  **Model Research (2026):**
    -   Verified latest models via search:
        -   **Google:** `gemini-3.1-pro`, `gemini-3-flash`.
        -   **OpenAI:** `gpt-5.1-chat-latest`, `gpt-5.2`.
        -   **Anthropic:** `claude-3-opus-4.6`, `claude-3-sonnet-4.6`.
    -   Updated `src/core/model_registry.py` and `src/core/ai_manager.py` to use these strings.

2.  **UI Enhancements:**
    -   **Overlay:** Created `src/ui/widgets/overlay.py`. Uses `QGraphicsDropShadowEffect` and dynamic stylesheets (Comic Sans vs Impact) based on Sass Level. Implemented screen shake for "Nuclear" mode.
    -   **Splash:** Created `src/ui/widgets/splash.py`. A frameless, transparent window with a progress bar and witty loading text ("Polishing the lens...").
    -   **Integration:** Updated `MainWindow` to show Splash on init and close it when Camera is ready. Added Overlay as a child of the video feed.

3.  **Threading & Signals:**
    -   Refactored `MainWindow` to use a `pyqtSignal(str, int)` for passing AI responses from the worker thread to the UI thread. This ensures the Overlay updates safely.

4.  **Auth / "Web Login":**
    -   Clarified "No Key" requirement: Implemented via the **Pollinations** provider (already present, but highlighted).
    -   Updated `README.md` to feature this as the "Web Login / Proxy" option.

5.  **Configuration:**
    -   Set default Sass Level to **10%** in `config.json`.
    -   Updated `requirements.txt` (fixed binary format issue).

### Key Files
-   `src/ui/widgets/overlay.py`: The visual subtitle engine.
-   `src/ui/widgets/splash.py`: The startup loader.
-   `src/core/ai_manager.py`: Updated logic for 2026 models.

### Status
-   **Version:** v0.0.3
-   **Build:** Ready for release.
