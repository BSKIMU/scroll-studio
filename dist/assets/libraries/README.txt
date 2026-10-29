Scroll Studio runtime libraries

362 motion clips, 27 prop models and 500 static hand poses are bundled for
playback on GitHub Pages. Character rigs and HDRI assets remain in the other
assets directories. The prop picker presents the curated five firearm models.

Catalogs retain source labels for Mixamo, Kimodo, CLUTCH and supplied props.
Those assets retain their respective source terms; this bundle does not grant
a new license to the source material. Original FBX/Blend files, model weights,
private manuscripts and per-machine working paths are not included here.

Auto-Rigger, Kimodo and MotionBricks generation use the local Python service.
GitHub Pages plays the bundled results without requiring that service.

Rebuild: python tools/export-runtime-libraries.py (local libraries required).
Verify: node tools/check-release.mjs
Live deployment: node tools/test-live-release.mjs
GPU effects: serve the repository root, open tools/scene-tone-check.html.
