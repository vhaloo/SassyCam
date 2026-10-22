"""Optional local Whisper / Kokoro / ROS adapters. No model downloads at startup."""
import base64
import io
import json
import os
import sys
import tempfile


def run(action, data):
    if action == "transcribe":
        from faster_whisper import WhisperModel
        raw = base64.b64decode(data["audio"].split(",")[-1], validate=True)
        # Model paths/names are selected from a fixed allowlist; downloading is explicit in the settings UI.
        size = data.get("model", "tiny")
        if size not in ("tiny", "base", "small", "medium"):
            raise ValueError("Invalid model")
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(raw)
            filename = f.name
        try:
            model = WhisperModel(size, device="cpu", compute_type="int8")
            language = data.get("language", "fr")
            segments, _ = model.transcribe(filename, language=language if language in ("fr", "en", "es", "ja", "ko", "zh") else None, vad_filter=True)
            return {"text": " ".join(s.text.strip() for s in segments).strip()}
        finally:
            os.unlink(filename)
    if action == "speak":
        from kokoro_onnx import Kokoro
        import soundfile as sf
        model_dir = os.environ.get("SASSYCAM_KOKORO_DIR", os.path.join(os.path.expanduser("~"), ".sassycam", "models"))
        model = Kokoro(os.path.join(model_dir, "kokoro-v1.0.onnx"), os.path.join(model_dir, "voices-v1.0.bin"))
        language = {"fr": "fr-fr", "en": "en-us", "es": "es", "ja": "ja", "ko": "ko", "zh": "cmn"}.get(data.get("language"), "en-us")
        voice = data.get("voice", "ff_siwis")
        if voice not in ("ff_siwis", "af_heart", "af_bella", "af_nicole", "af_sarah", "am_adam", "am_michael", "jf_alpha", "kf_alpha", "zf_alpha", "ef_alpha"):
            voice = "ff_siwis"
        audio, rate = model.create(data["text"], voice=voice, speed=1.0, lang=language)
        out = io.BytesIO()
        sf.write(out, audio, rate, format="WAV")
        return {"audio": "data:audio/wav;base64," + base64.b64encode(out.getvalue()).decode("ascii")}
    if action == "ros":
        import rclpy
        from std_msgs.msg import String
        rclpy.init()
        node = rclpy.create_node("sassy_cam_node")
        try:
            pub = node.create_publisher(String, data["topic"], 10)
            # Brief discovery period so the first publication reaches existing subscribers.
            import time
            time.sleep(0.5)
            message = String()
            message.data = data["text"]
            pub.publish(message)
            rclpy.spin_once(node, timeout_sec=0.1)
            return {"published": True}
        finally:
            node.destroy_node()
            rclpy.shutdown()
    raise ValueError("Unknown adapter")


if __name__ == "__main__":
    try:
        # Native libraries may print diagnostics: preserve stdout for one JSON response.
        output = sys.stdout
        sys.stdout = sys.stderr
        result = run(sys.argv[1], json.load(sys.stdin))
        output.write(json.dumps(result, ensure_ascii=False))
    except Exception as exc:
        sys.__stdout__.write(json.dumps({"error": type(exc).__name__}))
        sys.exit(1)
