# Clip Factory

Local-first pipeline for polished 9:16 Shorts, Reels and TikToks. One topic
becomes a structured script, local voiceover and a deterministic 22-second
HyperFrames composition. The current milestone is creation quality; publishing
and source-policy automation are intentionally separate.

## Quick start

Requirements: Node 20+, FFmpeg and Codex CLI. On macOS, `say` provides the free
TTS smoke test.

```bash
npm run check
npm run dev

# Generate a job with Codex + a local macOS voice
npm run create -- --topic "Warum Flugzeugfenster rund sind"

# Optional model override (default: gpt-5.6-luna)
npm run create -- --topic "Warum Flugzeugfenster rund sind" --model gpt-5.6-sol

# Generate without an AI call
npm run create -- --provider template --topic "Ein überraschender Fakt" --no-tts

# Rendering is an explicit step after preview
npm run render:job -- jobs/<slug>.json

# Einen aus Flow heruntergeladenen Hero-Shot importieren
npm run import:flow -- --file ~/Downloads/flow-shot.mp4 --slug eiffel-hero --job jobs/eiffelturm-sommer.json
```

Batch files are JSON arrays with the same fields as `jobs/example.json`:

```bash
npm run batch -- --input jobs/batch.json
npm run batch -- --input jobs/batch.json --render
```

## Model choices

The useful split is not “one model makes the whole clip”. Each stage gets the
cheapest model that is good at that job.

| Stage | Default now | Free/local upgrade | Notes |
|---|---|---|---|
| Script + hook | Codex CLI, configured model | Qwen 3.5 9B through Ollama on Zotac | JSON-schema output keeps the renderer stable. |
| Voice | macOS `say` | Kokoro on Mac/Zotac | `say` proves the pipeline; Kokoro is the quality target. |
| Edit + captions | HyperFrames + FFmpeg | same | Deterministic, batchable and more consistent than generative video. |
| Generated B-roll on RTX 4060 8GB | disabled | Wan 2.2 TI2V 5B through ComfyUI | Official ComfyUI docs say the 5B workflow fits 8GB with offloading. |
| Generated B-roll on Apple Silicon | disabled | LTX-Video Q8/MPS experiment | Use only for short inserts; it is not needed for every second of a clip. |

Current official references:

- [Wan 2.2 ComfyUI workflow](https://docs.comfy.org/tutorials/video/wan/wan2_2)
- [LTX-Video official repository](https://github.com/Lightricks/LTX-Video)
- [HunyuanVideo 1.5 official repository](https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5)
- [LTX-2 official repository](https://github.com/Lightricks/LTX-2)

LTX-2 and larger 14B/22B generators are not sensible defaults for the Zotac's
8GB VRAM. Cloud video APIs can be adapters later, but they destroy the near-zero
variable-cost target when used for entire 20–40 second clips.

Google Flow is now an optional B-roll backend. The exact credit plan and prompt
patterns are in [FLOW.md](FLOW.md); the imported MP4 is always composited and
captioned locally after download.

## Architecture

```text
topic
  -> scripts/create.mjs
     -> Codex JSON script
     -> local TTS
     -> jobs/<slug>.json
  -> HyperFrames variable composition
  -> visual check / preview
  -> explicit render
  -> renders/<slug>.mp4
```

The initial template uses a carbon-and-paper editorial look, oversized League
Gothic display type, IBM Plex Mono metadata, a single orange accent and four
beats: hook, setup, reveal and loop. New looks should be separate templates,
not dozens of flags inside one composition.

## Next adapters

1. `footage` background input with a consistent grade and crop strategy.
2. Kokoro TTS plus word timestamps for true spoken-word highlighting.
3. Optional ComfyUI/Wan B-roll generation for 2–4 second hero inserts.
