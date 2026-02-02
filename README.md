# Untitled Studio

![Untitled Studio Banner](https://via.placeholder.com/1200x600/000000/ff0080?text=UNTITLED+STUDIO)

**Untitled Studio** is a high-performance, privacy-first web image editor built for the aesthetic era. It leverages **WebGL 2.0** to perform cinema-grade color grading, film emulation, and creative effects entirely in the browser—your photos never leave your device.

## ✨ Key Features

### 🎞️ The Film Archive (150+ Presets)
Accurately simulates the physics of analog film with a massive curated library:
- **Kodak Legends**: Portra (160/400/800), Gold, Ektar, Tri-X, T-Max, Vision3 Cinema Stocks.
- **Fuji Masters**: Pro 400H, Superia, Velvia 50/100, Provia, Classic Chrome, Eterna.
- **Cinema Print**: Kodak Vision 2383 (Hollywood Teal/Orange), Fuji 3513, Cineon Log.
- **Vintage & Rare**: Expired Polaroid, Aerochrome (IR Pink), Lomo Metropolis, Agfa Scala.
- **Physics-Based Engine**: Real-time grain synthesis (Negative vs Slide types), Halation, and Bloom.

### ⚡ Professional Grading Suite
- **Tone Curves**: 4-channel RGB+Luma curves with spline interpolation.
- **HSL Mixer**: 8-channel precise color grading (Hue, Saturation, Luminance).
- **Split Toning**: Balance shadows and highlights with custom hues.
- **Creative Effects**: Tilt-Shift (Miniature), Selective Color masking, Posterize, Diffusion.

### 👾 Digital FX & Simulation
- **ASCII 2.0 Engine**: Matrix Green, Amber Terminal, and Full Color text rendering with CRT scanlines.
- **Glitch Art**: Real-time RGB splitting, displacement, and signal noise.
- **Texture Overlays**: Dust, Light Leaks, Scratches, and Crumpled Paper blend modes.
- **CRT Monitor Mode**: Global scanline overlay, sub-pixel separation, and curved screen vignette.

### 🚀 High-Performance Core
- **Wasm Grain Engine**: Rust-powered noise generation for zero-latency slider performance.
- **Native 4K Export**: High-resolution rendering independent of screen size (up to 4K).
- **Batch Editing**: Apply looks to multiple photos instantly.
- **Local Privacy**: 100% Client-side editing. Your photos never leave your device.
- **PWA Support**: Installable native app experience with offline capability.

## 🛠️ Technology Stack
- **Core**: Vanilla JavaScript (ES6+), HTML5.
- **Rendering**: WebGL 2.0 (Custom Shader Engine) + WebAssembly (Rust).
- **Styling**: Tailwind CSS + Glassmorphism UI.
- **Architecture**: Zero-dependency, offline-capable client-side app.

## 🚀 Getting Started

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

## 🥚 Easter Eggs
Triple-click the "Developed by MHS" credit in the bottom bar for a special dedication.

## 📄 License
MIT License. Free to use and modify.

---
*Developed by MHS.*
