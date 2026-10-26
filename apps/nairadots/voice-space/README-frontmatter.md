Use this complete front matter in the Space's `README.md`. The Hugging Face
template requires the title, emoji, colors, SDK, SDK version, and app file.
This keeps the Space's existing title and theme while matching the Gradio
dependency pin and the model author's Python 3.10 setup:

```yaml
---
title: Gidioxx
emoji: 🌖
colorFrom: indigo
colorTo: gray
sdk: gradio
sdk_version: "5.49.1"
python_version: "3.10"
app_file: app.py
pinned: false
---
```

Then select **ZeroGPU** in the Space hardware settings. The Space currently
requests CPU Basic; the app loads CUDA models and cannot run on CPU Basic.
