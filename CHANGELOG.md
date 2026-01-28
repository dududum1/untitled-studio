# Changelog

All notable changes to Untitled Studio will be documented in this file.

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

---

## [1.4.0] - Previous Release
- Initial public release with core editing features
