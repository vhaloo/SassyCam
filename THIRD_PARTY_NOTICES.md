# Third-party components

SassyCam is MIT-licensed. Its distribution also contains Electron/Chromium and bundled frontend/runtime dependencies under their own licenses. Exact bundled dependency notices are included in `dist/third-party-licenses.txt` (source: `studio/public/third-party-licenses.txt`); Electron supplies its own LICENSE and Chromium notices.

Model weights are not included in application packages. Qwen 3.5 and SmolVLM weights are downloaded from their pinned Hugging Face repositories after explicit activation, under their respective Apache-2.0 model licenses. Whisper is loaded from its configured model repository on first use. Optional Ollama/ComfyUI models are installed separately and retain their own licenses and requirements.

The ONNX WebAssembly runtime and factory are version-pinned and cached in the browser. Its license text is included with the dependency notices. No claim of ownership is made over third-party code, models or user photographs.
