# Changelog

All notable changes to this project will be documented in this file.

## [0.0.2] - 2026-02-19

### Added
- **Language Auto-Switch**: Automatically detects spoken language (English, French, Japanese, Chinese, Spanish, Korean) and switches the app's language and voice settings on the fly.
- **Enhanced Reactivity**: 
    - Default "Auto-Sass" interval reduced to 15 seconds for faster roasting.
    - Sass Meter is now audio-reactive, pulsing and glowing with your voice.
- **Sass Meter Overhaul**:
    - New "SAVAGE" (80-95%) and "NUCLEAR" (98%+) sass levels.
    - Dynamic color gradients and shake effects at high sass levels.
    - "Fatality" and "Nuclear" labels for extreme settings.
- **Vicious Mode**: At >80% sass, the AI is instructed to be strictly negative. At 100%, it delivers a "Nuclear Roast" with zero mercy.
- **Verbose Logging**: detailed logs for language detection, sass triggers, and system status.

### Changed
- **Default Whisper Model**: Upgraded default from `tiny` to `base` for better accuracy.
- **Error Handling**: 
    - Graceful handling of API Rate Limits (429) with sassy canned responses instead of raw error dumps.
    - Improved language code mapping for Kokoro TTS to prevent "espeak" errors.
- **Configuration**: `config.json` now defaults to `base` whisper model and 15s interval.

### Fixed
- **TTS Crash**: Resolved `kokoro-onnx` crashing with single-letter language codes by mapping them to ISO codes (e.g., 'a' -> 'en-us').
- **Dll Load Issues**: Hardened DLL loading for PyTorch in frozen builds.

## [0.0.1] - 2026-02-17

### Added
- Initial Release.
- Real-time vision analysis with Gemini 2.0 Flash.
- Local Speech-to-Text with OpenAI Whisper.
- Local Text-to-Speech with Kokoro.
- Sass-O-Meter for adjustable roasting intensity.
