# Project History: SassyCam

## Session: February 18, 2026 (DLL Hell & Build Engineering)

### Objectives
- Finalize the SassyCam repository for release.
- Optimize the build process for Windows (PyInstaller).
- Fix persistent `WinError 1114` (DLL initialization failed) for PyTorch in frozen builds.

### Actions Taken
1.  **Codebase Cleanup:**
    -   Fixed `tests/test_model_registry.py` regarding experimental models.
    -   Removed unused cryptography/Fernet code from `src/core/auth_manager.py`.
    -   Updated `src/core/tts_manager.py` to use correct Kokoro language codes and remove unsupported Korean.
    -   Updated `README.md` with release instructions.

2.  **Build Engineering (The PyTorch Saga):**
    -   **Initial Issue:** `WinError 1114` loading `c10.dll` -> `libiomp5md.dll`.
    -   **Attempt 1 (Hooks):** Added `collect_all('torch')` to `build_exe.py`. Result: PyInstaller infinite recursion/hang due to complex Torch dependencies.
    -   **Attempt 2 (Manual Copy - `build_v2.py`):**
        -   Created `build_v2.py` to run PyInstaller with `--exclude-module=torch`.
        -   Script manually copies the local `site-packages/torch` folder to `dist/SassyCam/_internal/torch` post-build.
        -   Manually copies `libiomp5md.dll` to the root `dist/SassyCam` folder.
        -   **Result:** Build succeeds without hanging.

3.  **Runtime Fixes (DLL Loading):**
    -   Even with the manual copy, `WinError 1114` persisted.
    -   **Solution:** Implemented a "Brute Force DLL Loader" in `main.py`.
        -   Recursively searches `_internal/torch/lib` and `_internal/lib`.
        -   Adds these paths to `os.environ['PATH']` AND `os.add_dll_directory()`.
        -   Uses `ctypes.CDLL()` to explicitly pre-load `libiomp5md.dll` and *all other* `.dll` files found in `torch/lib` before `import torch`.
    -   **Status:** App launches successfully in Dev mode (`python main.py`) and Release mode (`Launch_SassyCam.bat`).

### Key Files
-   `build_v2.py`: The robust build script (use this instead of `build_exe.py`).
-   `release_helper.py`: Automates `build_v2.py`, Zipping, and GitHub Release upload.
-   `main.py`: Contains the `setup_environment()` function for DLL pre-loading.
-   `requirements.txt`: Cleaned up dependencies.

### Current State
-   **Version:** v0.0.1
-   **Build Status:** Functional.
-   **Known Issues:** None blocking. `WinError 1114` is patched via `main.py`.

### Next Steps
-   Monitor user feedback for any other DLL missing errors (e.g., `tbb12.dll` was warned but seems non-fatal or handled).
-   Consider creating a proper installer (NSIS/Inno Setup) instead of a Zip if usage grows.

## Session: February 19, 2026 (v0.0.2 - The Reactive Update)

### Objectives
- Enhance app responsiveness and interactivity.
- Implement language auto-detection and switching.
- Refine Sass Meter visuals and logic.
- Release v0.0.2.

### Actions Taken
1.  **Dependency Fix**: Identified and fixed a `kokoro-onnx` error where single-letter language codes ('a') caused `espeak` crashes. Implemented proper ISO code mapping in `src/core/tts_manager.py`.
2.  **Reactivity**:
    -   Reduced default `auto_sass_interval` from 45s to **15s**.
    -   Connected `AudioManager` energy levels to `SassMeter`, making the UI pulse and glow with the user's voice.
3.  **Language Auto-Switch**:
    -   Updated `AudioManager` to return detected language codes from Whisper.
    -   Updated `MainWindow` to detect language changes (e.g., speaking French) and automatically switch the app's `language` and `voice_code` settings.
4.  **Sass Logic**:
    -   Updated `AIManager` prompts to remove all positivity above 80% sass.
    -   Implemented "Nuclear Roast" instructions at 100%.
    -   Added canned sassy responses for `429 Rate Limit` errors.
5.  **Release Prep**:
    -   Updated version to `0.0.2`.
    -   Created `CHANGELOG.md`.
    -   Updated `README.md`.
    -   Ensured `whisper_model` defaults to `base`.

### Key Files
-   `src/ui/widgets/sass_meter.py`: Enhanced `paintEvent` for gradients, shake, and audio reactivity.
-   `src/core/audio_manager.py`: Updated `_transcribe` to return `(text, language)`.
-   `src/ui/main_window.py`: Added language switching logic and verbose logs.

### Status
-   **Version:** v0.0.2
-   **Build:** Ready for packaging via `build_v2.py` / `release_helper.py`.
