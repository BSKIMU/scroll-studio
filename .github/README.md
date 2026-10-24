# Scroll Studio

**Sketch comics, arrange panels, and pose 3D characters in your browser.**

Scroll Studio is a comic and webtoon editor that brings drawing, panel and speech-bubble detection, and interactive 3D scenes into one workspace. Create a vertical webtoon or a print-comic layout, use 3D characters to plan a shot, and export your pages as PNG or layered PSD files.

**[Try Scroll Studio](https://bskimu.github.io/scroll-studio/)** · [한국어 안내](README.ko.md) · [Updates](https://github.com/BSKIMU/scroll-studio/commits/main/) · [Deployment status](https://github.com/BSKIMU/scroll-studio/actions)

The app interface is currently in Korean. This guide includes the Korean button labels to help you get started.

## What you can do

- **Turn rough layouts into editable panels and speech bubbles.** Detect candidates in a page sketch, adjust their positions and sizes, and apply the ones you want to keep.
- **Draw and edit in layers.** Use pens, watercolor brushes, airbrushes, erasers, lasso selections, and move, rotate, or scale controls. Paste an image from the clipboard onto a new layer.
- **Move characters to find a pose.** Walk, run, and jump in the 3D viewport. Use interactive chairs, beds, stairs, and doors to stage sitting, lying down, climbing, and opening or passing through a door. Freeze the action at the moment you want for your panel.
- **Compose a 3D shot.** Arrange backgrounds and characters, adjust body poses and the camera, and see the result in the selected comic panel.
- **Work with webtoon and print-comic pages.** Set canvas dimensions, resolution, page count, and margins. Add dialogue and speech bubbles, then preview a vertical scroll or a 3D book layout.
- **Export for the next step.** Save PNG images, layered PSD files, or a project file you can reopen later.

## Quick start

1. [Open the app](https://bskimu.github.io/scroll-studio/) and select **새 캔버스** (New Canvas). Choose **웹툰** (Webtoon) or **출판만화** (Print Comic).
2. Sketch your page, then use **컷 인식** (Panel Detection) to review detected panels and speech bubbles. You can also draw panels yourself with **컷 생성** (Create Panel).
3. Select a panel and open **3D 창** (3D Window). Add a character guide under **인물** (Character), then select **움직임** (Movement) to control it.
4. Freeze a pose, continue drawing, and save or export your work. Open **도움말** (Help) for the full in-app guide.

### Character movement

Open the **Movement** tab and keep focus in the 3D viewport.

| Control | Action |
| --- | --- |
| W / A / S / D | Move relative to the camera |
| Shift + movement key, or double-tap a movement key | Run |
| Space | Jump |
| E near an interactive object | Sit, stand up, use stairs, or open/close a door |
| Esc | Freeze the current pose into the panel |
| Drag in empty viewport space | Orbit the camera |

Door and stair actions use the editor's interactive objects. You can add them from the Movement tab.

## Save your work

Projects are automatically saved in the browser you are using. To keep a portable backup or move to another browser, device, or site address, choose **파일 → 프로젝트 저장** (File → Save Project). Use **프로젝트 열기** (Open Project) to load that file later.

Your artwork is not uploaded to this GitHub repository.

## Run locally

Install Git and Python 3, then run:

```sh
git clone https://github.com/BSKIMU/scroll-studio.git
cd scroll-studio
python tools/server.py
```

Open [localhost:8765](http://127.0.0.1:8765/). On Windows, you can also use `Start-Scroll-Studio.ps1`. Browser dependencies are bundled in `dist/vendor/`; the basic app does not require an npm install.

Importing a Blender `.blend` source file requires a local Blender installation. Set `BLENDER_PATH` to its executable if needed. For the hosted app, export your model as GLB first.

## Update and publish

1. Edit the local files and check the result on localhost.
2. With Node.js 24, run `node tools/check-release.mjs`.
3. Review your changes, then commit and push to `main`.
4. GitHub Actions runs the checks and publishes the app to GitHub Pages.
5. Confirm that the workflow succeeded, then refresh the same public app URL.

Each deployment updates the browser cache version. Failed checks stop publication. To undo a published change, revert its commit and push again.

The app lives in `dist/`, local server and validation tools in `tools/`, and the deployment workflow in `.github/workflows/deploy.yml`.

## Bundled assets

Third-party libraries, fonts, and assets retain their individual licenses and attribution notices. See the [classroom asset attribution](../dist/assets/korean-classroom-ATTRIBUTION.txt) for that environment's credits and modifications.
