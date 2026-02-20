# Project History: SassyCam

## Session: February 18, 2026 (DLL Hell & Build Engineering)
... (Previous history retained)

## Session: February 19, 2026 (v0.0.3 - The Future Update)
- Implemented latest 2026 models, Overlay, Splash, and Web Login.
- Released v0.0.3 (Hotfixed).

## Session: February 19, 2026 (v0.0.4 - Emotional Damage)

### Objectives
- Default to stable `gemini-2.5-flash` model.
- Implement "Emotional Damage" mode (>95% sass).
- Scale roast length with sass level (more sass = longer rant).
- Release v0.0.4.

### Actions Taken
1.  **AI Logic**:
    -   Modified `src/core/ai_manager.py` to scale `max_words` instruction from 20 words (Mild) to 120 words (Emotional Damage).
    -   Renamed "Nuclear" prompt mode to "EMOTIONAL DAMAGE - MAXIMUM PAIN" for levels >= 95.
2.  **Configuration**:
    -   Updated `config.json` default Gemini model to `models/gemini-2.5-flash` (prefix required for `google.generativeai` client).
    -   Updated `src/core/model_registry.py` to reflect the new default.
3.  **UI**:
    -   Updated `src/ui/widgets/sass_meter.py`: Changed label for >95% to "EMOTIONAL DAMAGE".
    -   Fixed CSS syntax error in Overlay widget.
4.  **Documentation**:
    -   Updated `README.md` to v0.0.4, added "GitHub Description" block, and documented Emotional Damage mode.
5.  **Release**:
    -   Bumped version in `main.py`, `build_v2.py`, `release_helper.py`.
    -   Built and tagged v0.0.4.

### Key Files
-   `src/core/ai_manager.py`: Length scaling logic.
-   `src/ui/widgets/sass_meter.py`: Label updates.

### Status
-   **Version:** v0.0.4
-   **Build:** Released.
