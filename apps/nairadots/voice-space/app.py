"""NairaDots language voice demo for a Hugging Face ZeroGPU Gradio Space.

Models:
  * ASR: Axiveri/NaijaVox-2.0 (Yoruba, Hausa, Igbo, Nigerian Pidgin, Nigerian English)
  * TTS: Modularcomputing/dynamic-accent-preview (English + four Nigerian languages)

Set NAIRADOTS_SERVICE_TOKEN as a Space secret. Server callers must send it in
the X-NairaTag-Service-Token header. Do not expose this token in browser code.
"""

from __future__ import annotations

import hmac
import os
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import gradio as gr
import numpy as np
import spaces
import torch
from huggingface_hub import snapshot_download
from scipy.signal import resample_poly
from transformers import (
    PreTrainedTokenizerFast,
    WhisperFeatureExtractor,
    WhisperForConditionalGeneration,
    WhisperProcessor,
)


ASR_MODEL_ID = "Axiveri/NaijaVox-2.0"
TTS_MODEL_ID = "Modularcomputing/dynamic-accent-preview"
COSYVOICE_COMMIT = "074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc"
ROOT = Path(__file__).resolve().parent
CACHE = Path(os.environ.get("HF_HOME", str(Path.home() / ".cache" / "huggingface")))
COSYVOICE_DIR = ROOT / "CosyVoice"
TTS_HANDLE = None

LANGUAGES = {
    "Yoruba": {"asr": "<|yo|>", "tts": "yor"},
    "Nigerian Pidgin": {"asr": "<|pcm|>", "tts": "pcm"},
    "Hausa": {"asr": "<|ha|>", "tts": "hau"},
    "Igbo": {"asr": "<|ig|>", "tts": "ibo"},
    "Nigerian English": {"asr": "<|en|>", "tts": "eng"},
}


def _clone_cosyvoice() -> None:
    if not (COSYVOICE_DIR / "cosyvoice").is_dir():
        subprocess.run(
            ["git", "clone", "--recursive", "https://github.com/FunAudioLLM/CosyVoice.git", str(COSYVOICE_DIR)],
            check=True,
            timeout=900,
        )
    subprocess.run(["git", "-C", str(COSYVOICE_DIR), "checkout", COSYVOICE_COMMIT], check=True, timeout=120)
    subprocess.run(
        ["git", "-C", str(COSYVOICE_DIR), "submodule", "update", "--init", "--recursive"],
        check=True,
        timeout=900,
    )


def _load_asr():
    model_dir = snapshot_download(repo_id=ASR_MODEL_ID, cache_dir=str(CACHE))
    try:
        processor = WhisperProcessor.from_pretrained(model_dir)
        vocabulary = processor.tokenizer.get_vocab()
        if "<|pcm|>" not in vocabulary or "<|ig|>" not in vocabulary:
            raise ValueError("The model tokenizer is missing the Pidgin/Igbo tokens.")
    except Exception:
        # NaijaVox documents this tokenizer fallback for its custom language IDs.
        feature_extractor = WhisperFeatureExtractor.from_pretrained(model_dir)
        tokenizer = PreTrainedTokenizerFast(tokenizer_file=str(Path(model_dir) / "tokenizer.json"))
        tokenizer.add_special_tokens({
            "additional_special_tokens": [
                token for token in [
                    "<|startoftranscript|>", "<|endoftext|>", "<|transcribe|>", "<|notimestamps|>",
                    "<|en|>", "<|yo|>", "<|ha|>", "<|ig|>", "<|pcm|>",
                ] if token not in tokenizer.get_vocab()
            ]
        })
        processor = WhisperProcessor(feature_extractor=feature_extractor, tokenizer=tokenizer)

    model = WhisperForConditionalGeneration.from_pretrained(
        model_dir,
        torch_dtype=torch.float16,
        low_cpu_mem_usage=True,
    )
    model.to("cuda")
    model.eval()
    return model, processor, processor.tokenizer.get_vocab()


def _load_tts():
    global TTS_HANDLE
    tts_repo = Path(snapshot_download(repo_id=TTS_MODEL_ID, cache_dir=str(CACHE)))
    _clone_cosyvoice()
    sys.path.insert(0, str(COSYVOICE_DIR))
    sys.path.insert(0, str(tts_repo))
    import infer  # supplied by the Dynamic Accent model repository

    cv3_dir = snapshot_download(repo_id="FunAudioLLM/Fun-CosyVoice3-0.5B-2512", cache_dir=str(CACHE))
    args = SimpleNamespace(
        model_dir=str(CACHE / "pretrained" / "CosyVoice2-0.5B"),
        cosyvoice_dir=str(COSYVOICE_DIR),
        lm="",
        flow="",
        prompts=str(tts_repo / "prompts" / "prompts.json"),
        voices=str(tts_repo / "prompts" / "voices.json"),
        dtype="auto",
        stitch=False,
        rate="default",
        voice="anchor_male",
        frontend="codeswitch",
        frontend_lang="eng",
        no_diacritics=False,
        experimental_translate=False,
        cv3_dir=cv3_dir,
    )
    TTS_HANDLE = infer.build("flash", args)
    return TTS_HANDLE


# ZeroGPU supports model initialization at module scope; actual inference is
# wrapped in @spaces.GPU below so hardware is allocated only while working.
asr_model, asr_processor, asr_vocab = _load_asr()
tts_engine = _load_tts()


def _authorize(request: gr.Request) -> None:
    expected = os.environ.get("NAIRADOTS_SERVICE_TOKEN", "")
    supplied = (request.headers or {}).get("x-nairatag-service-token", "")
    if not expected or not hmac.compare_digest(str(supplied), expected):
        raise gr.Error("This voice endpoint is available to the NairaDots server only.")


@spaces.GPU(duration=120)
def transcribe(audio, language: str, request: gr.Request):
    _authorize(request)
    if audio is None:
        raise gr.Error("Add a short voice recording first.")
    sample_rate, samples = audio
    samples = np.asarray(samples, dtype=np.float32)
    if samples.ndim == 2:
        samples = samples.mean(axis=1)
    if samples.size == 0:
        raise gr.Error("The recording is empty.")
    if samples.size / max(int(sample_rate), 1) > 60:
        raise gr.Error("Please keep voice clips under 60 seconds.")
    if sample_rate != 16000:
        from math import gcd
        divisor = gcd(int(sample_rate), 16000)
        samples = resample_poly(samples, 16000 // divisor, int(sample_rate) // divisor).astype(np.float32)

    token = asr_vocab[LANGUAGES[language]["asr"]]
    decoder_ids = torch.tensor([[
        asr_vocab["<|startoftranscript|>"],
        token,
        asr_vocab["<|transcribe|>"],
        asr_vocab["<|notimestamps|>"],
    ]], device="cuda")
    features = asr_processor.feature_extractor(
        samples, sampling_rate=16000, return_tensors="pt"
    ).input_features.to("cuda", dtype=asr_model.dtype)
    with torch.inference_mode():
        output = asr_model.generate(
            input_features=features,
            decoder_input_ids=decoder_ids,
            max_new_tokens=448,
        )
    return asr_processor.tokenizer.decode(output[0], skip_special_tokens=True).strip()


@spaces.GPU(duration=120)
def speak(text: str, language: str, request: gr.Request):
    _authorize(request)
    text = str(text or "").strip()
    if not text:
        raise gr.Error("Enter a reply to speak.")
    if len(text) > 1200:
        raise gr.Error("Keep spoken replies under 1,200 characters.")
    language_tag = LANGUAGES[language]["tts"]
    tagged_text = f"<{language_tag}>{text}</{language_tag}>"
    waveform = np.asarray(tts_engine.say(tagged_text, seed=0), dtype=np.float32)
    return int(tts_engine.sr), waveform


with gr.Blocks(title="NairaDots Nigerian Language Voice") as demo:
    gr.Markdown(
        "# NairaDots Voice Model Gateway\n"
        "NaijaVox transcription and Dynamic Accent speech generation for Yoruba, "
        "Nigerian Pidgin, Hausa, Igbo, and Nigerian English."
    )
    with gr.Tab("Speech to text"):
        asr_language = gr.Dropdown(list(LANGUAGES), value="Yoruba", label="Spoken language")
        audio_input = gr.Audio(type="numpy", sources=["microphone", "upload"], label="Voice clip")
        transcript = gr.Textbox(label="Transcript")
        gr.Button("Transcribe").click(
            transcribe, [audio_input, asr_language], transcript, api_name="transcribe"
        )
    with gr.Tab("Text to speech"):
        tts_language = gr.Dropdown(list(LANGUAGES), value="Yoruba", label="Reply language")
        text_input = gr.Textbox(lines=4, max_lines=8, label="Reply text")
        audio_output = gr.Audio(label="Spoken reply", autoplay=False)
        gr.Button("Generate speech").click(
            speak, [text_input, tts_language], audio_output, api_name="speak"
        )

demo.queue(default_concurrency_limit=1).launch()
