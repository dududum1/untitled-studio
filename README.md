# Untitled Studio

![Untitled Studio Banner](https://i.ibb.co.com/mFHkY8gR/image-212c7000-3952-417e-bb44-cfe2fdcd8b17.png)

**Untitled Studio** is a high-performance, privacy-first web image editor built for the analog era. It runs entirely in the browser using WebGL 2.0 — no accounts, no cloud, no uploads. Your photos stay on your device.

---

## Features

### Film Roll Archive (150+ Emulations)
A physics-based analog engine simulating grain structure, halation, and chemical color shifts across 150+ emulations organized by manufacturer and category.

- **Kodak**: Portra 160/400/800, Gold 200, Ektar 100, Tri-X 400, T-Max 100/400/P3200, HIE Infrared, Vision3 (500T/250D), Vision 2383 print.
- **Fuji**: Pro 400H, Superia 400/800/1600, Velvia 50/100F, Provia 100F, Classic Chrome, Neopan Acros, Eterna 500T.
- **Ilford**: HP5 Plus, FP4, Delta 3200, Ortho Plus, SFX 200 (Infrared).
- **Cinestill**: 800T, 50D.
- **Boutique**: Kono!, Dubblefilm, Reflx Lab, Film Washi, Revolog, Aerochrome IR simulations.
- **Eastern Bloc**: Svema (Ukraine), Orwo (GDR), Fomapan (Czech), Tasma, Lucky (China).
- **Vintage / Obscure**: Agfa, Ferrania, Polaroid, Konica, Rollei, and more.
- **Custom Presets**: Save your own looks and access them from a dedicated category.

### Color Grading

- **Tone Curves**: 4-channel spline editor (RGB, Red, Green, Blue) for precision tonal control.
- **HSL Mixer**: 8-channel Hue, Saturation, and Luminance adjustments per color range.
- **Color Wheels**: Shadow, Midtone, and Highlight lift/gain/gamma controls.
- **Split Tone**: Independent color grading for shadows and highlights with a balance slider.
- **S-Curves / Contrast**: Lift, gamma, gain, and contrast controls.

### Output Transform (Cinema Print Emulation)
Map your edit to the physical characteristics of classic motion picture print stocks:
- **Kodak 2383** — warm shadows, deep teal, Hollywood look.
- **Fuji 3513** — cooler, pastel greens and magentas.
- **Cineon Log** — flat, maximum-detail profile for further grading.

### Neural Darkroom (On-Device AI)
AI inference runs 100% locally via ONNX Runtime Web, with no data ever leaving the device.

- **Magic Eraser**: Remove unwanted objects using a LaMa inpainting model (~20 MB).
- **Smart Select**: Detect and isolate the main subject using MODNet segmentation (~15 MB).
- **Progress Tracking**: Both models download via `ReadableStream` with a real-time percentage bar, then transition to a spinner during WASM compilation.
- **Manual Load**: If automatic CDN download fails, load the `.onnx` file from your local filesystem via the retry prompt.

### Local Adjustments
- **Paint-On Masks**: Draw precise masks using a brush/erase tool with adjustable size and softness.
- **Per-Mask Adjustments**: Apply independent Exposure, Contrast, Temperature, Tint, Shadows, and Highlights to each masked region.
- **Smart Select Integration**: Use the AI to generate an initial mask from the main subject, then refine manually.
- **Mask Overlay**: Toggle a red overlay to visualize active mask areas.

### FX and Optics

**Grain**
- **Emulsion (Negative)**: Silver halide crystal grain, luminosity-weighted.
- **Analog (35mm Scan)**: Scanner-introduced texture and density shifts.
- Grain intensity, size, and roughness controls.

**Lens Optics**
- **Lens Fringing**: Chromatic aberration (purple/green split on edges).
- **Barrel Distortion**: Wide-angle/fisheye lens curvature.
- **Mist Diffusion**: Pro-Mist filter soft glow on highlights.
- **Halation**: Red bleed around bright areas, simulating film back-scatter.
- **Tilt-Shift**: Selective top/bottom blur for the miniature diorama effect.

**Cinematic**
- **Gate Weave**: Film transport jitter from a vintage projector.
- **Film Burn**: Light leak overlays with entropy seed control.
- **Spectral Vision**: False-color thermal / infrared spectrum modes.

**Digital / Creative**
- **ASCII**: Convert brightness to text characters.
- **Posterize**: Reduce color palette for screen-print aesthetics.
- **Dithering (Lo-Fi)**: Floyd-Steinberg, Atkinson, and Bayer 4x4 algorithms.
- **Bloom**: Glow around highlights with strength and threshold controls.
- **Glow Tint**: Custom color for bloom/halation glow (4 presets + picker).

**Texture / Frame**
- 15+ built-in texture overlays (dust, light leaks, crumpled paper) with Multiply/Screen/Overlay/Soft Light blend modes.
- Border and frame overlays with padding and color control.

**LUT**
- Import `.cube` LUT files from any color grading application.
- Export your current grade as a standard 33-point HALD `.cube` file for use in Premiere, Resolve, or Photoshop.

### Scopes and Analysis

- **Histogram**: Standard RGB luminance histogram with Auto-Enhance (one-click exposure/contrast normalization) and Clipping Warnings (highlights in red, shadows in blue).
- **Waveform**: Oscilloscope-style light intensity display across X-axis, inspired by professional broadcast monitors.
- **Vectorscope**: Color saturation and hue plotting.

### Workflow

- **Film Roll (Batch Editing)**: Group up to 36 images into a roll. Use "Sync All" to apply the current look across the entire roll instantly. Batch export as a ZIP.
- **Split View**: Side-by-side before/after comparison with a draggable divider.
- **History (Undo/Redo)**: Full multi-step undo/redo stack (`Ctrl+Z` / `Ctrl+Y`).
- **EXIF Terminal Viewer**: Cinematic retro-terminal overlay that reads and displays camera metadata from the image file.
- **Keyboard Shortcuts**: `1`–`8` switch tabs, `V` toggles split view, `H` toggles scopes, `B` (hold) shows original.

### Performance

- **WebGL 2.0** custom shader pipeline.
- **Web Worker**: Image decoding and EXIF extraction offloaded to a background thread.
- **Smart Resolution Scaling**: Limits internal editing resolution to 2048px on mobile to prevent memory crashes; full 4K+ for exports.
- **Rust/WASM Grain Engine**: Grain generation offloaded to a WebAssembly module for zero-stutter performance.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Rendering | WebGL 2.0, custom GLSL shaders |
| Language | Vanilla JavaScript (ES6+) |
| Performance | Rust + WebAssembly (grain), Web Workers (decode) |
| AI | ONNX Runtime Web (WASM backend), ReadableStream |
| Styling | Tailwind CSS, custom glassmorphism system |
| Storage | IndexedDB (custom presets, LUTs), localStorage (settings) |
| Distribution | Progressive Web App (offline-first, installable) |

---

## Getting Started

> **Note**: Advanced features (Web Workers, WebAssembly, AI model downloads) require an HTTP server. Opening `index.html` directly via `file://` will disable these features. The core editor still works.

### 1. Clone the repository

```bash
git clone https://github.com/dududum1/untitled-studio.git
cd untitled-studio
```

### 2. Start a local server

Choose any of the following:

```bash
# Option A — Node.js (recommended)
npx serve .

# Option B — Python
python -m http.server 8000

# Option C — VS Code
# Install the "Live Server" extension, then right-click index.html > Open with Live Server
```

### 3. Open in browser

Navigate to `http://localhost:3000` (or `http://localhost:8000` for Python).

### 4. Load an image

Drag and drop any image onto the canvas, or click the import button in the center placeholder. Supported formats: **JPEG, PNG, WebP, TIFF, and RAW** (CR2, NEF, ARW, DNG, RAF, ORF, RW2, PEF, and more — RAW files extract the embedded JPEG preview).

### 5. Explore

- Use the **sidebar rail** (left) to switch between tabs: Tone, Color, FX, Geometry, Local Adjustments, AI Tools, and more.
- Browse film emulations in the **preset panel** (top of sidebar).
- Press **`B`** to hold and view the original image at any time.
- Use **Export** (bottom command bar) to save as JPEG, PNG, or WebP at original or custom resolution.

---

## Documentation

For a full guide to every control and workflow, see the [How-To Guide](how-to.html).

---

## Easter Eggs

- Click the **UNTITLED STUDIO** logo in the header to trigger a soft reboot sequence.

---

## License

Copyright (c) 2026 MHS. All Rights Reserved.
This project is proprietary software. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.

---

*Developed by MHS.*
