# DynaTech — "The Business Keeps Working" — Production Manifest

Final export: `DynaTech_Rothschild_AI_Agent_FINAL.mp4` (Higgsfield media id `6d0bc4a1-88f6-437f-85b0-8035f36a76ca`)
URL: https://d2ol7oe51mr4n9.cloudfront.net/user_3HDy8S0ESwqlZLxFMMOyUNfSDLy/6d0bc4a1-88f6-437f-85b0-8035f36a76ca.mp4
Format: 1080x1920, 24 fps, H.264 + AAC 48 kHz stereo, loudnorm I=-14 LUFS / TP -1 dB, runtime 40.1 s.

## Reference map (storyboard image → Higgsfield media id → film step)
| image | role | media id | film step |
|---|---|---|---|
| img5_shoes | REF_SHOES | f76e7442-0249-4b8d-939d-ee96b799e814 | 1 (composition only; legs frame cropped from img1) |
| img1_walk_phone | REF_WALK_PHONE / REF_LOOK | c3ee096c-e471-47d9-9b39-689c740483ff | 2 |
| img4_pre_collision | REF_PRE_COLLISION | 937ed3b8-cb5f-488a-a15f-6f367daaa653 | 3 (not used directly; woman described in prompt) |
| img3_collision | REF_COLLISION | 8421ebbe-8988-4bc9-aed9-a5caf6cda117 | 4 |
| img2_phone_hero | REF_PHONE_HERO | bfe91cd0-ef99-4b05-8741-c5a4a544ffe9 | 5 |
| img8_rewind | REF_REWIND | 8e13d092-463e-4f52-97c9-a5394bf78a6a | 6 (rewind built from reversed footage, image not used) |
| img6_bench | REF_BENCH | c66c8573-600f-49de-9f9c-fe6e1ce0774e | 7 |
| img7_bench_ui | REF_BENCH_UI | 08d224cb-831f-4b56-a12b-b3ff08e7b794 | 8 (layout reference; chips typeset separately) |
| dynatech-logo.jpg | brand | dd9c0fa8-8969-4147-9dc9-9b0c1856894c | wordmark typeset (logo file kept for future use) |
REF_FACE (real selfie) was not supplied; identity comes from the storyboard character.

## Generated plates (all 9:16)
| plate | model / settings | job id | credits |
|---|---|---|---|
| Test: bench Hebrew (fast) | veo3_1 veo-3-1-fast high 8s | d22244d4-145f-4eb4-aa14-97e8196ead81 | 22 |
| Collision (used as final plate) | kling3_0 pro 8s, start img1 → end img3, sound off | 1a3ff7c2-2bf7-4626-a4c9-bfb4a6d34b73 | 17.5 |
| Bench A (S08–S09) | veo3_1 veo-3-1-preview high 8s, start img6 | c87fb023-41a5-434e-90e3-5f49c9879496 | 58 |
| Macro flight coffee→glasses→phone | kling3_0 pro 8s, start img3 → end img2, sound on | 44a545a7-d1c1-463b-aad7-7db370f59bbd | 20 |
| Phone hero hold | kling3_0 pro 5s, start img2, sound on | 8ce9451b-88af-4bf2-a871-66f520ea36a3 | 10 |
| Shoes → full-body rise | kling3_0 pro 5s, start legs-crop → end img1, sound on | 64fcd8d1-6908-4156-90d2-577732fe59be | 10 |
| Bench B (S10) | veo3_1 preview high 8s, start = last frame of A | fc126398-cf0a-448f-9ea8-641e89423976 | 58 |
| Bench C (S11–S12) | veo3_1 preview high 8s, start = last frame of B | 2c5a3bc9-a146-4179-8baa-58587693a735 | 58 |
Approx. generation spend: ~254 credits of the 425 approved cap (plus <1 credit of frame prep).

## Edit (ffmpeg + Playwright/Chromium in the Higgsfield sandbox)
1. Legs plate 0–3.0 s with animated black letterbox (bars 749 px, full 0–1.25 s, retract 1.25–2.75 s).
2. Collision plate 1.5–7.0 s (silent source; boulevard ambience from legs plate under it).
3. Macro flight 0–5.0 s (native audio).
4. Phone hero 0–3.0 s (native audio).
5. Rewind: reversed (collision + macro) at 5x with tmix smear, reversed macro audio, 2.1 s.
6. Bench A 0–7.6 s. 7. Bench B 0–6.3 s with three Hebrew chips at whisper word cues (0.00 / 1.18 / 4.46 s). 8. Bench C 0–7.5 s, CTA + DynaTech wordmark fade in at 4.9 / 5.3 s.
Hard cuts, loudnorm to -14 LUFS, faststart.

## Voice
Native Veo 3.1 Hebrew dialogue (synthetic, not the owner's voice). Whisper (faster-whisper small, he) verified every line:
- A: בעידן של היום, אתם יכולים לטייל ברוטשילד, לשתות קפה בכיף. וסוכן הוואטסאפ שלכם יעשה בשבילכם את כל העבודה. (ends 7.26 s)
- B: מכירות, שירות לקוחות, ואפילו יקבע לכם פגישות ביומן. (ends 5.92 s)
- C: לפרטים נוספים, תגיבו לי פה בסרטון: סוכן. (ends 4.80 s)

## Known limitations / deviations from the brief
- No music bed: Higgsfield exposes no general-purpose music model; only native ambience/SFX from the video models is used.
- WhatsApp screen is rendered by the video model from the hero storyboard frame (all four messages already visible), not composited with planar tracking; messages do not appear one by one.
- Voice continuity across the three Veo clips is prompt-driven, not a locked voice model; the three clips were chained from each other's last frame for visual continuity.
- Rewind is reversed footage of the forward plates (per brief), not a newly generated shot.
- Runtime 40.1 s vs. 36 s target (dialogue not rushed, per runtime policy).
