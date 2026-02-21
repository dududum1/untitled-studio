# Untitled Studio

![Untitled Studio Banner](https://i.ibb.co.com/mFHkY8gR/image-212c7000-3952-417e-bb44-cfe2fdcd8b17.png)


**Untitled Studio** is a high-performance, privacy-first web image editor built for the aesthetic era. It leverages **WebGL 2.0** to perform cinema-grade color grading, film emulation, and creative effects entirely in the browser—your photos never leave your device.


## Key Features

### The Film Roll Archive (150+ Stocks)
A physics-based analog engine simulating grain, halation, and chemical shifts. The library includes:

**The Classics**
*   **Kodak**: Portra (160/400/800), Gold 200, Ektar 100, Tri-X 400, T-Max 3200, Vision3 (500T/250D).
*   **Fuji**: Pro 400H, Superia 400/800/1600, Velvia 50, Provia 100F, Classic Chrome, Neopan Acros.
*   **Ilford**: HP5 Plus, FP4, Delta 3200, Ortho Plus, SFX 200 (Infrared).

**Obscure and Boutique**
*   **Eastern Bloc**: Svema (Ukraine), Orwo (GDR), Fomapan (Czech), Lucky (China).
*   **Washi**: Hand-made Japanese paper films (Z, S, X).
*   **Boutique**: Kono!, Dubblefilm, Reflx Lab, and Aerochrome IR simulations.

### Advanced Darkroom Workflow
- **Sync All (Film Roll)**: Edit a "roll" of up to 36 exposures simultaneously.
- **Batch Processing**: "Develop" your roll and export as a high-quality ZIP archive.
- **Tone Curves and HSL**: 4-channel spline curves and 8-channel precise color grading.
- **Output Transform**: Cinema print emulation profiles for Kodak 2383, Fuji 3513, and Cineon Log.
- **Creative Scars**: Physics-aware Bloom and Halation simulations.

### Neural Darkroom (AI Tools)
- **Magic Eraser**: Removes unwanted objects using an on-device LaMa inpainting model (~20 MB, loads once per session).
- **Smart Select**: Detects and isolates the main subject using MODNet segmentation (~15 MB).
- **Streaming Model Load**: Models download via `ReadableStream` with real-time progress and a two-phase indicator (downloading then initializing WASM).
- **Fully Offline**: Inference runs 100% client-side via ONNX Runtime Web (WASM backend). No data is ever uploaded.

### The Offline Citadel
- **100% Client-Side**: No servers. No tracking. No cloud. The image remains in your RAM.
- **PWA Ready**: Install as a native app for a zero-latency, offline darkroom experience.
- **Universal**: Works on everything from high-end workstations to older mid-range hardware.

## Technology Stack
- **Core**: Vanilla JavaScript (ES6+), WebGL 2.0 (Custom Shaders).
- **Performance**: Rust-powered WebAssembly Grain Engine, Web Worker for image decoding.
- **AI**: ONNX Runtime Web (WASM), ReadableStream model fetching.
- **Styling**: Tailwind CSS + Glassmorphism UI.
- **Architecture**: 100% Offline-first Progressive Web App.

## Documentation
For a deep dive into the controls and workflow, view the [How-To Guide](how-to.html).

## Getting Started

Position yourself in the project directory:

```bash
# Clone the repository
git clone https://github.com/yourusername/untitled-studio.git

# Navigate to directory
cd untitled-studio

# Start a local server (Required for Wasm/Workers)
npx serve .
# OR
python -m http.server 8000
```

Open `http://localhost:3000` (or 8000) in your browser.

## Easter Eggs
- Triple-click the "Developed by MHS" credit in the bottom bar for a special dedication.
- Click the "UNTITLED STUDIO" logo in the header to trigger a Soft Reboot sequence.

## License
Copyright (c) 2026 MHS. All Rights Reserved.
This project is proprietary software. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.

---
*Developed by MHS.*
