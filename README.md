# Untitled Studio

![Untitled Studio Banner](https://i.ibb.co.com/mFHkY8gR/image-212c7000-3952-417e-bb44-cfe2fdcd8b17.png)


**Untitled Studio** is a high-performance, privacy-first web image editor built for the aesthetic era. It leverages **WebGL 2.0** to perform cinema-grade color grading, film emulation, and creative effects entirely in the browser—your photos never leave your device.

##  The Manifesto of the Unmasked
Untitled Studio is governed by a strict philosophy of **unmasked global adjustments**. We reject the digital perversion of "Selective Editing" in favor of holistic, chemical-simulated processing. 
> "If you can’t fix the whole frame, you haven't earned the shot."

Read the full 7-chapter [Manifesto](manifesto.html) to understand the "Unmasked" identity.

##  Key Features

### The Film Roll Archive (150+ Stocks)
A physics-based analog engine simulating grain, halation, and chemical shifts. The library includes:

**The Classics**
*   **Kodak**: Portra (160/400/800), Gold 200, Ektar 100, Tri-X 400, T-Max 3200, Vision3 (500T/250D).
*   **Fuji**: Pro 400H, Superia 400/800/1600, Velvia 50, Provia 100F, Classic Chrome, Neopan Acros.
*   **Ilford**: HP5 Plus, FP4, Delta 3200, Ortho Plus, SFX 200 (Infrared).

**Monsters & Obscure**
*   **Eastern Bloc**: **Svema** (Ukraine), **Orwo** (GDR), **Fomapan** (Czech), **Lucky** (China).
*   **Washi**: Hand-made Japanese paper films (Z, S, X).
*   **Boutique**: **Kono!**, **Dubblefilm**, **Reflx Lab**, and **Aerochrome** IR simulations.

###  Advanced Darkroom Workflow
- **Sync All (Film Roll)**: Edit a "roll" of up to 36 exposures simultaneously.
- **Batch Processing**: "Develop" your roll and export as a high-quality ZIP archive.
- **Tone Curves & HSL**: 4-channel spline curves and 8-channel precise color grading.
- **Creative Scars**: Physics-aware Bloom and Halation simulations.

### 🔌 The Offline Citadel
- **100% Client-Side**: No servers. No tracking. No cloud. The image remains in your RAM.
- **PWA Ready**: Install as a native app for a zero-latency, offline darkroom experience.
- **Universal URL**: Works on everything from $3,000 "Pro" phones to discarded 2015 laptops.

##  Technology Stack
- **Core**: Vanilla JavaScript (ES6+), WebGL 2.0 (Custom Shaders).
- **Performance**: Rust-powered WebAssembly Grain Engine.
- **Styling**: Tailwind CSS + Glassmorphism UI.
- **Arch**: 100% Offline-first Progressive Web App.

##  Documentation
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
