# Google Flow adapter

Flow project: <https://flow.google.com/project/a1391c84-1baf-4bcc-9f5a-6445a30f97c7>

The pipeline uses Flow for short visual inserts, not for the entire 22-second
edit. Generate a silent 4–8 second shot, download it, and let HyperFrames keep
the local voice, typography, timing and final export consistent.

## Credit-aware plan for 1,050 credits

Google's current Flow help lists these per-generation costs; the prompt-box
settings are the final authority because costs and models can change:

- Veo 3.1 Lite, 8s: 10 credits (non-Ultra).
- Veo 3.1 Fast, 8s: 20 credits.
- Veo 3.1 Quality, 8s: 100 credits.
- Gemini Omni Flash, 10s: 15 credits at 720p or 7 credits at 360p.
- Edits to uploaded or generated videos through Omni Flash: 40 credits.

Some Flow requests return more than one generation, so keep a buffer. A safe
first allocation is 6 Fast look tests (120), 25 Fast hero shots (500), 3
Quality finalists (300), and 130 credits uncommitted for retries. Do not spend
the buffer until the first exported shots have passed the local visual check.

## Prompt shape

Use one subject, one camera move and one lighting idea per generation. Keep text,
logos, dialogue, music and UI out of the generated plate; those layers are more
reliable in the local template.

```text
Vertical 9:16 cinematic B-roll, 8 seconds, silent.
Subject: [one concrete subject].
Action: [one readable physical action].
Camera: [one move, e.g. slow push-in or locked-off macro].
Light and palette: warm editorial daylight, deep charcoal shadows, one orange accent.
Composition: leave the lower third calm for captions, no text, no logos, no watermark-like graphics.
Continuity: end on a stable frame that can cut into a typography beat.
```

For the first test set, use three visually distinct shots: a wide establishing
shot, a close detail and a final stable hero frame. One Flow shot per short is
enough; the rest of the story is carried by the local script and edit.

## Import

```bash
npm run import:flow -- \
  --file ~/Downloads/flow-shot.mp4 \
  --slug eiffel-hero \
  --model veo-3.1-fast \
  --prompt "Vertical 9:16 ..." \
  --job jobs/eiffelturm-sommer.json
```

The importer copies the file to `assets/flow/`, writes a sidecar with the
prompt/model/duration, and sets `flowVideo` on the selected job. The template
keeps Flow video muted so the local narration remains authoritative.

Flow exports include an invisible SynthID watermark. It is part of the source
asset and is not altered by this pipeline.
