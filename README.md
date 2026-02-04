# Untitled Studio

![Untitled Studio Banner](https://via.placeholder.com/1200x600/000000/ff0080?text=UNTITLED+STUDIO)

**Untitled Studio** is a high-performance, privacy-first web image editor built for the aesthetic era. It leverages **WebGL 2.0** to perform cinema-grade color grading, film emulation, and creative effects entirely in the browser—your photos never leave your device.

## Key Features

### The Film Archive (150+ Stocks)
A physics-based analog engine simulating grain, halation, and chemical shifts. The library includes:

**The Classics**
*   **Kodak**: Portra (160/400/800), Gold 200, Ektar 100, Tri-X 400, T-Max 3200, Vision3 (500T/250D).
*   **Fuji**: Pro 400H, Superia 400/800/1600, Velvia 50, Provia 100F, Classic Chrome, Neopan Acros.
*   **Ilford**: HP5 Plus, FP4, Delta 3200, Ortho Plus, SFX 200 (Infrared).

**Cinema & Broadcast**
*   **Hollywood**: Kodak Vision 2383 Print Film (Dune/Joker Looks), Fuji 3513, Cineon Log.
*   **Broadcast**: Technicolor Process 4, Bleach Bypass, 16mm Newsreel.

**Boutique & Experimental (New)**
*   **Mr. Negative House Specials**: *Bat Country* (Fear & Loathing), *Zombie 400* (Green Skin), *Silver Screen* (Home-made).
*   **Glitch & Sci-Fi**: **Hanalogital** (Bokeh/Prism/Veins), **Yodica** (Cosmic Gradients), **Revolog** (Lightning/Fireflies).
*   **Hand-Rolled**: **Kono!** (Moonstruck/Donau), **Dubblefilm** (Apollo/Bubblegum), **Reflx Lab** (Cinema Re-spools).
*   **Dead Stock & Rare**: **Aerochrome** (Infrared Pink), **Lomo Metropolis**, **Agfa Scala**, **Peel-Apart Polaroid**.

**Monsters & Oddities**
*   **Eastern Bloc**: **Svema** (Ukraine), **Orwo** (GDR), **Fomapan** (Czech), **Lucky** (China).
*   **FPP**: Dracula 64, Frankenstein 200, Wolfman 100, Infrared Color.
*   **Washi**: "Z" (Near IR), "S" (Sound Recording), "X" (Surveillance).
*   **Berlin Specials**: Analogheld, Optik Oldschool, King Film.

### Professional Grading Suite
- **Tone Curves**: 4-channel RGB+Luma curves with spline interpolation.
- **HSL Mixer**: 8-channel precise color grading (Hue, Saturation, Luminance).
- **Split Toning**: Balance shadows and highlights with custom hues.
- **Creative Effects**: Tilt-Shift (Miniature), Selective Color masking, Posterize, Diffusion.

### Digital FX & Simulation
- **ASCII 2.0 Engine**: Matrix Green, Amber Terminal, and Full Color text rendering with CRT scanlines.
- **Glitch Art**: Real-time RGB splitting, displacement, and signal noise.
- **Texture Overlays**: Dust, Light Leaks, Scratches, and Crumpled Paper blend modes.
- **CRT Monitor Mode**: Global scanline overlay, sub-pixel separation, and curved screen vignette.

### High-Performance Core
- **Wasm Grain Engine**: Rust-powered noise generation for zero-latency slider performance.
- **Native 4K Export**: High-resolution rendering independent of screen size (up to 4K).
- **Batch Editing**: Apply looks to multiple photos instantly.
- **Local Privacy**: 100% Client-side editing. Your photos never leave your device.
- **PWA Support**: Installable native app experience with offline capability.

## Technology Stack
- **Core**: Vanilla JavaScript (ES6+), HTML5.
- **Rendering**: WebGL 2.0 (Custom Shader Engine) + WebAssembly (Rust).
- **Styling**: Tailwind CSS + Glassmorphism UI.
- **Architecture**: Zero-dependency, offline-capable client-side app.

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
Triple-click the "Developed by MHS" credit in the bottom bar for a special dedication.

## License
Copyright (c) 2026 MHS. All Rights Reserved.
This project is proprietary software. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.

---
*Developed by MHS.*
