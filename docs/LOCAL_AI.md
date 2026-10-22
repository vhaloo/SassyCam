# Free local AI and optional integrations

SassyCam 1.0 has no creator-owned API key. Missing providers produce actionable errors, never invented responses.

## Desktop: Ollama

Install a current version of [Ollama](https://ollama.com/download), start it, then install a compatible vision model, for example:

```sh
ollama pull gemma3:4b-it-q4_K_M
```

This example downloads about 3.4 GB. In Settings → Intelligence artificielle → Ollama, refresh the list and choose an installed vision model. CPU inference is possible but slower; performance depends on available RAM and GPU. One captured frame is sent per reaction, not a continuous webcam stream. Text-only models can answer typed words but cannot analyze photos. Older servers can reject current model formats; update Ollama if it requests an upgrade. The tested free default is the browser model, which does not require Ollama.

## Browser: Qwen 3.5 and lightweight fallback

Choose IA du navigateur and click Activer l’IA gratuite. The default is Apache-2.0 Qwen 3.5 0.8B, pinned to `8fe9dbe3fb39fe902e18df9be84b6a0ac77ae0f6`; its first download is approximately 900 MB, including the selected quantized language weights, vision encoder and runtime. SmolVLM 256M remains an English-trained lightweight fallback, pinned to `7e3e67edbbed1bf9888184d9df282b700a323964`. Downloading requires explicit activation. Weights and the version-pinned jsDelivr ONNX runtime are cached by the browser.

Image preprocessing, language generation and Whisper run in a dedicated worker. Auto acceleration uses compatible WebGPU. CPU selects SmolVLM automatically because the current browser WASM runtime lacks a quantized kernel required by Qwen. SmolVLM replies in English, including when another response language is selected; this limitation is disclosed before activation. Use Qwen on a compatible GPU or a personal provider for multilingual replies. Cancel terminates the worker immediately, and hiding the page releases its model resources. Modern browsers and sufficient memory are required. These small models have variable fluency, visual accuracy and humor quality; they are not equivalent to a large paid/cloud model.

## Images

Illustration locale applies a real photo treatment: contours, color quantization and styling. It is explicitly labelled **without generative AI** and requires no provider. Aquarelle and other artistic directions have their full effect with a generative provider; the local treatment remains a simple illustration.

For actual local generative portraits, install [ComfyUI](https://docs.comfy.org), use a compatible SD 1.5 or SDXL checkpoint with CLIP and VAE, and configure its loopback endpoint (default port 8188) and checkpoint name. SassyCam uploads the reference to that local server, queues a standard image-to-image graph, polls only its own prompt and reads the PNG. No checkpoint is silently downloaded. Flux and other architectures require different graphs and are not claimed compatible.

OpenAI and Gemini accept the reference photo through their native image-editing endpoints. They require the visitor's personal API key and an account entitled to the selected image model. Images are not covered by the desktop ChatGPT plan inference route.

## Voice

Desktop default recognition runs Whisper tiny in the app. Web offers native browser recognition where available, or local Whisper. Native speech services can send voice to the browser vendor, as disclosed in settings. Recording is one-shot and limited to 15 seconds. Stop, navigation, backgrounding and profile changes discard pending voice actions.

For Python Whisper or Kokoro, use a dedicated Python 3.11/3.12 environment:

```sh
python -m venv .venv-audio
# Windows:
.venv-audio\Scripts\python -m pip install -r requirements.txt
# macOS/Linux:
.venv-audio/bin/python -m pip install -r requirements.txt
```

Set `SASSYCAM_PYTHON` to its absolute Python executable before launching. Whisper downloads its chosen model on the first requested transcription. For Kokoro, place `kokoro-v1.0.onnx` and `voices-v1.0.bin` from the [official release](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0) in `~/.sassycam/models`, or point `SASSYCAM_KOKORO_DIR` at the original app's model folder. Kokoro does not download files automatically. Output-device selection applies to Kokoro; system speech uses the system's default output.

ROS 2 is desktop-only. Source your ROS environment, ensure its Python imports `rclpy` and `std_msgs`, and set `SASSYCAM_PYTHON` accordingly. Enable ROS in session settings. Each successful reaction publishes one String. No ROS installation is bundled.

## Original application

The Qt implementation remains in `legacy_main.py` and `src/`. Install `requirements-legacy.txt` in a separate environment and run `python main.py --legacy`. Modern startup never imports Torch, Whisper, Qt or OpenCV. Historical `config.json`, keyring profiles, `nanobanana-output` images and models are not deleted or silently migrated. Import selected originals into the modern gallery.
