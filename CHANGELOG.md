# Changelog

All notable changes to Untitled Studio will be documented in this file.

## [2.3.0] - 2026-02-02

### 🎨 Creative Effects Expansion
- **New Feature**: Selective Color (HSL-based color masking).
- **New Feature**: Tilt-Shift (Miniature effect with variable blur).
- **UI Updates**: Added a dedicated "Creative" tab in the Effects panel with a Hue Preview indicator.

### 🐛 Bug Fixes
- **Shader Compilation**: Fixed a GLSL error (`uniform` keyword in function) that caused black screens on some devices.
- **Layout Polish**: Fixed cropped Export button and ensured Preset Card previews fill the 100% of the card height.
- **Slider Visuals**: Removed accidental "box" background from sliders for a cleaner look.

## [2.2.0] - 2026-02-01

### 👾 ASCII 2.0: The Terminal Update
- **Multi-Mode Engine**: Added 5 distinct rendering modes: **Full Color**, **Matrix Green** (with flicker), **Amber Terminal**, **B&W**, and **Custom Tint**.
- **Refined Grayscale Ramp**: Completely overhauled the character set with a hand-tuned **16-level 3x5 bitmap ramp** for superior image fidelity.
- **Atmospheric Effects**: Implemented vertical scanline shimmer and low-frequency column flicker to simulate legacy hardware.
- **UI Integration**: Added a dedicated mode selector and color picker to the Digital FX panel.
- **Background Bleed**: Fine-tuned character transparency to allow a 5% original image bleed for better structural context.

---

## [2.1.0] - 2026-01-31

### 🦀 Wasm Core Integration
- **Rust-Powered Grain Engine**: Offloaded grain generation to a high-performance WebAssembly module written in Rust.
- **Fast LCG Noise**: Implemented a custom Linear Congruential Generator (LCG) for superior noise distribution with minimal CPU overhead compared to standard JS math.
- **Direct GPU Buffering**: Implemented a texture upload bridge in `WebGLEngine` to stream grain buffers directly from Wasm memory to GPU textures, minimizing data copying.
- **Zero-Stutter Performance**: Moved computationally intensive pixel loops into the optimized Wasm core to ensure a perfectly responsive UI during grain adjustments.

### 🛠️ Infrastructure & Reliability
- **ESM Wasm Loader**: Developed a modern ES module bridge for dynamic loading and initialization of WebAssembly modules.
- **Graceful Fallback**: Added a detection system that automatically falls back to procedural JS grain if the Wasm module fails to load or the browser doesn't support it.
- **Local Server Guidance**: Updated documentation with instructions for local server setups (`npx serve`, etc.) to resolve browser CORS/Security errors when using advanced features like Wasm and Workers.

---

## [2.0.0] - 2026-01-31

### 🚀 Performance & Mobile Optimization
- **Smart Resolution Scaling**: Automatically limits internal editing resolution to 2048px on mobile devices (< 800px width) while preserving full 4K+ quality for exports. Drastically reduces memory crashes on iOS/Android.
- **Debounced Preset Wheel**: Implemented a 150ms debounce on the preset scroller to eliminate UI stuttering ("machine gun effect") when browsing rapidly.
- **Lightweight UI**: Simplified preset card rendering by 60%, removing complex CSS filters from non-critical elements to improve scroll FPS.

### ✨ Split View Restoration
- **Side-by-Side Comparison**: Restored the 'Before/After' slider functionality.
- **Visual Separation**: Added a clean vertical divider line to clearly mark the transition.
- **Shader Logic**: Fixed `compositeFragment` shader to correctly sample original vs processed textures based on split position.

### 🛠️ Reliability Fixes
- **Preset Overwrite Bug**: Fixed a critical issue where applying a preset would reset your Crop, Rotation, and Border settings. Presets now only change the "Look" (Color/Tone).
- **UI Synchronization**: Fixed HSL Mixer and Color Wheels not updating to reflect the new preset's values.
- **Export Settings**: Fixed "Export Settings" modal missing or being non-functional.

---

## [1.6.0] - 2026-01-30

### 🏛️ The Film Archive Update (Complete)
A massive expansion converting the app into a "Museum Grade" film emulation library (150+ Total Presets).

### 🎞️ New Film Stocks (Phases 9-12)
- **The Legends**: Kodak T-Max (100/400/P3200), Tech Pan, HIE Infrared, Vision3 200T/500T.
- **Fuji Masters**: Reala 100 ("4th Layer"), Eterna 500T, Acros 100, FP-100C.
- **Cinema Print**: Kodak Vision 2383 (Hollywood Teal/Orange).
- **Vintage & Obscure**: Konica VX 400, Lucky Super 100, Rollei Retro/Vario, Film Washi S.
- **Special FX**: Aerochrome III (Pink IR), Lomo Metropolis (Bleach Bypass), Agfa Scala (B&W Slide).

### 🎞️ Output Transform Engine (New)
- **Print Profiles**: Added simulation for **Kodak 2383** (Hollywood Look), **Fuji 3513**, and **Cineon Log**.
- **Physics-Based Grain**: Implemented luminosity-aware grain engines:
  - **Negative Type**: Shadow/Midtone biased (Portra, Gold, etc).
  - **Slide Type**: Midtone biased (Velvia, Provia).
  - Auto-detection system for all 150+ presets.

### 👾 Advanced ASCII Engine
- **Bitwise Font**: Replaced legacy logic with a high-performance 16-level bitmask font system.
- **Enhanced Resolution**: Increased maximum character density by 4x for finer detail.
- **Extended Ramp**: ` ` `.` `,` `-` `~` `:` `;` `=` `!` `*` `%` `$` `&` `8` `W` `@`

### 🗂️ Library Reorganization
- **Manufacturer-Based**: Presets now grouped by brand (`Kodak`, `Fuji`, `Ilford`, `Cinestill`, `Agfa`, `Polaroid`).
- **New Categories**:
  - `Vintage`: Consumer classics from defunct brands (Ferrania, Boots, Kmart).
  - `Obscure`: Industrial, Soviet, and Surveillance films (Svema, Tasma, Traffic Surveillance).
  - `Styles`: Modern, Moody, Dreamy, Cinema, Glitch.

### 🖼️ High-Resolution Export
- **Native Rendering**: True native resolution export (up to 4K/Custom) via offscreen WebGL context.
- **Tiled Extraction**: Safe export for large images to prevent mobile browser crashes.
- **Overlay Compositing**: Full-resolution composition of borders, grain, and textures.

### 💾 LocalStorage Presets
- **Custom Saving**: Users can now save their own adjustments as named presets.
- **Persistence**: Saved looks are stored in IndexedDB for long-term persistence.
- **Integration**: Custom presets appear in the new "Custom" category with full support for strength and favorites.

### 🧭 UI Optimization
- **Collapsible Browser**: Replaced horizontal category bar with a vertical accordion for the 150+ preset catalog.
- **Sticky Navigation**: Group headers (Manufacturers, Archives, Creative) stay pinned during scroll.
- **Smooth Interaction**: Added chevron animations and height transitions for a premium Feel.

### ☢️ Chaos Toast System
- **Dynamic Startup**: Messages now simulate a degrading film lab hardware environment.
- **Visual Types**:
  - **Normal (60%)**: Green "Kodak Viewfinder" HUD style.
  - **Warning (15%)**: Yellow flickering alerts (e.g., "Developer temp critical").
  - **Critical (10%)**: Red shaking fatal errors (e.g., "Film jammed").
  - **ASCII (15%)**: Retro "DND" logo logic.
- **Aesthetic**: Digital mono-spaced font with glow effects and technical borders.

### 🧹 Fixes & Improvements
- **Database Repair**: Fixed syntax error in `presets.js` causing database load failures.
- **Refactor**: Complete code cleanup of the preset loading engine.
- **Quality**: Verified unique chemical signatures for all all new additions (Halation, Grain structures, Bloom).

### 📺 The Immersion Upgrade
- **Audio Engine**: Procedural sound synthesis using Web Audio API (No functional assets required).
  - **Startup**: "Power up" drone and CRT spark sequence.
  - **UI Interaction**: High-tech sinusoidal blips for clicks and sliders.
  - **Feedback**: Mechanical shutter sounds for warnings, digital static glitches for errors.
- **CRT Visualization Mode**:
  - **Global Overlay**: Scanlines, sub-pixel RGB separation, and curved vignette.
  - **Reactivity**: Screen shake and chromatic aberration triggers on system errors.
  - **Toggle**: Dedicated CRT button in the header.
- **Documentation**: Generated full `PRESET_CATALOG.md` artifact listing all 154+ film stocks.

---

## [1.5.0] - 2026-01-29

### 🎨 New Presets (20+)
- **Nature Pack**: Forest Mist, Ocean Breeze, Desert Gold, Mountain Air, Sunset Glow
- **Editorial Pack**: Magazine Cover, High Fashion, Beauty Retouch, Commercial Clean, Urban Street
- **Cinematic Expansion**: Neon Noir, Amber Cinema, Teal Shadow, Golden Hour Cine, Moonlight Blue
- **Vintage Expansion**: 70s Polaroid, 80s VHS, 90s Grunge, Faded Memories, Old Hollywood
- **B&W Expansion**: High Contrast Noir, Soft Silver, Newspaper Print, Infrared Film, Selenium Tone

### ✨ New FX Sliders
- **Posterize** (0-100): Reduce color palette for artistic effect
- **Diffusion** (0-100): Pro-Mist / Soft glow on highlights
- **Barrel Distortion** (-100 to 100): Lens distortion correction
- **Film Gate Weave** (0-100): Authentic film frame wobble
- **Noise Color Tint** (0-360°): Tint grain with any hue
- **Split Tone Balance** (-100 to 100): Shadows vs Highlights bias

### 🪄 Auto-Enhance
- One-click automatic optimization using histogram analysis
- Adjusts exposure, contrast, shadows, and highlights
- Located in histogram panel (click "Auto" button)

### 🔴🔵 Clipping Warnings
- Toggle to show blown highlights (red) and crushed blacks (blue)
- Real-time shader-based overlay
- Checkbox in histogram panel

### ⭐ Preset Favorites
- Star icon on each preset card to add to favorites
- Favorites persist across sessions (localStorage)
- New "Favorites" category tab for quick access

### 📊 Enhanced Batch Export Progress
- New modal with per-image queue display
- Overall progress bar with count
- ETA (estimated time remaining)
- Status text for current operation
- Cancel button to abort export

### 🔇 AI Denoise
- Bilateral filter-based noise reduction
- Preserves edges while smoothing noise
- New slider in Grain FX panel (0-100%)
- Applied early in pipeline to prevent noise amplification

### 📷 RAW File Support
- **Canon**: CR2, CR3
- **Nikon**: NEF, NRW
- **Sony**: ARW, SRF, SR2
- **Adobe**: DNG
- **Olympus**: ORF
- **Fujifilm**: RAF
- **Panasonic**: RW2
- **Pentax**: PEF
- **Samsung**: SRW
- **Hasselblad**: 3FR
- **Leica**: RAW, RWL
- **Kodak**: KDC, DCR
- **Phase One**: IIQ
- Extracts embedded JPEG preview for instant editing
- Toast notifications during decoding

### 📱 Mobile Improvements
- Histogram toggle button added to mobile action bar
- Fixed clickability of histogram panel controls (z-index fix)

### 🐛 Bug Fixes
- Fixed histogram Auto/Clip buttons not clickable (z-index issue)
- Improved preset category list with editorial and nature categories

### 🎞️ LUT Export & Dithering
- **LUT Export**: Generate standard .cube files for video editing integration.
- **Dithering Engine**: 4 algorithms (Floyd-Steinberg, Atkinson, Bayer, Random) for retro aesthetics.

### 🧱 Texture Overlays
- **Asset Pack**: 15+ built-in textures (Dust, Light Leaks, Crumpled Paper).
- **Blend Modes**: Multiply, Screen, Overlay, Soft Light support.
- **Opacity Control**: Fine-tune texture intensity.

### 🛠️ Critical Fixes (Latest)
- **Stability**: Fixed WebGL crash caused by shader compilation failures ("parameter 1 is not of type 'WebGLProgram'").
- **Render Pipeline**: Restored missing Composite shader to fix black screen issues.
- **Quality**: Fixed grain intensity scaling (was 100x too strong) responsible for preset noise.
- **Safeguards**: Added debug alerts for shader errors to aid future troubleshooting.

---

## [1.4.0] - Previous Release
- Initial public release with core editing features
