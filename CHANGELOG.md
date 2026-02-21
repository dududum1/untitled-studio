# Changelog

All notable changes to Untitled Studio will be documented in this file.

## [3.1.0] - 2026-02-21

### AI Model Loading Progress
- **ReadableStream Fetch**: Replaced the blocking `ort.InferenceSession.create(url)` call with a `fetch` + `ReadableStream` pipeline that tracks every chunk against `Content-Length` to calculate exact download percentage.
- **Two-Phase Loading States**: Download phase reports 0-99%, then immediately transitions to an "Initializing" state before the CPU-heavy WASM compilation step, preventing the UI from appearing frozen.
- **3-State Widget**: The "Load Model" button for both Magic Eraser and Smart Select is replaced during loading by a minimalist inline progress component and re-replaced by the tool controls on success.
- **Progress Bar**: 1px height horizontal track with a `cubic-bezier` fill transition for smooth, premium-feeling animation.
- **Initializing Spinner**: Thin-arc SVG circle replaces the bar once the download hits 100%, rotating at 1.6s per cycle during WASM compilation.
- **Error Handling**: Network or parse failures show a soft-red inline "Tap to retry." link that resets state without reloading the page.

### Tooltip System
- **Inline Help Triggers**: Added `[?]` icons next to 20+ technical labels across all panels including Vectorscope, HSL Mixer, Output Transform, film stock buttons (Kodak 2383, Fuji 3513, Cineon Log), Lens Fringing, Barrel Distortion, Mist Diffusion, Tilt-Shift, Grain Mode, Dithering (Lo-Fi), Halation, Gate Weave, Spectral Vision, Neural Darkroom, ASCII, Posterize, Entropy (Seed), and 3D LUT.
- **Portal Architecture**: A single tooltip element is appended to `document.body` and positioned absolutely, preventing any clipping from `overflow: hidden` scroll containers.
- **Event Delegation**: A single `mouseover`/`focusin` listener on `document.body` handles all triggers, keeping initialization cost near-zero.
- **Delay**: 200ms hover debounce prevents tooltip flash when moving the cursor quickly across the panel.
- **Viewport Collision**: Tooltip auto-repositions to avoid viewport edges on both axes.
- **Accessibility**: Triggers are focusable via `tabindex="0"` and `aria-describedby` is set dynamically on show.

### Bug Fixes
- **Web Worker Crash**: Wrapped `new Worker('js/worker.js')` in the `UntitledStudio` constructor with a `try/catch`. Under the `file://` protocol the browser throws a `SecurityError` before `this.init()` runs, leaving all UI event listeners unattached. The app now falls back to main-thread image processing gracefully.

## [3.0.1] - 2026-02-21

### Bug Fixes & Structural Repairs
- **FX Subtabs Fix**: Resolved a critical nesting bug where three extra `</div>` tags after the Grain subpanel prematurely closed the entire FX group, making Atmosphere, Digital, Texture, Creative, Frame, and LUT subpanels unreachable.
- **Geometry Tab Restoration**: Fixed HTML nesting that was hiding the Transform group. Added a "Geometry & Transform" header for clarity.
- **Import Button Restoration**: Re-implemented the `#placeholder-container` and `#import-hero-btn` in the main canvas area, restoring the initial import UI.
- **File Input Restoration**: Restored the hidden `<input type="file" id="file-input">` element required for the native file picker.
- **Sidebar Structure**: Corrected premature closure of `#panel-content` and `#control-panel` which was hiding several tabs.

## [3.0.0] - 2026-02-15

### Major Release: Sidebar & Theme Overhaul
- **Theme System Restoration**: Re-anchored the Theme Picker to the global Sidebar Rail for consistent access.
- **Fixed Drawer Layout**: Refactored the theme drawer with `position: fixed` to prevent clipping and layout desync across different screen sizes.
- **Robust Event Pipeline**: Implemented a delegated event listener model to ensure reliable toggling even when the DOM is dynamically updated.
- **Developer Fallback**: Exposed `window.untitledTheme` API for console-based theme switching and debugging.

### UI Polish & Refinement
- **Subtab Optimization**: Refined the FX sub-navigation with `xs` typography, overflow-scrolling, and `nowrap` constraints to fix overlapping text issues.
- **Vertical Rhythm**: Increased vertical margins on `.studio-slider` components to improve interactive precision and visual clarity.

## [2.11.0] - 2026-02-15 (Pre-release)
- **Logo Restoration**: Fixed the studio logo positioning in the header rail.

## [2.10.0] - 2026-02-13

### The Matrix Update
- **BIOS Boot Sequence**: Added a cinematic, high-fidelity BIOS boot simulation that runs on application startup, featuring variable typing speeds and system diagnostics.
- **Soft Reboot**: Clicking the "UNTITLED STUDIO" logo now triggers a full system reboot animation (CRT power-off, BIOS sequence, power-on).
- **Stability**: Fixed a critical startup crash caused by residual audio engine code.
- **UI Responsiveness**: Resolved issues where sliders and buttons would become unresponsive due to broken haptic feedback calls.

## [2.9.0] - 2026-02-13

### The Command Bar Update
- **Dedicated Footer**: Consolidated non-creative controls (Undo/Redo, Reset, Settings, Export) into a fixed, glassmorphic command bar at the bottom of the viewport.
- **Improved Accessibility**: Critical actions are now permanently visible and separated from creative tools.
- **Refactored Export Flow**: Exporting is now a clear 2-step process (Export Button -> Settings Modal -> Action), reducing accidental exports.

### Floating Scopes HUD
- **Canvas Maximization**: Moved Histogram and Vectorscope out of the sidebar and into a floating, toggleable Heads-Up Display (HUD).
- **Pro-Camera Aesthetic**: The new HUD floats over the canvas, maximizing the working area for image editing.
- **Toggleable**: Added a generic `[ M ]` toggle button to show/hide the scopes instantly.

## [2.8.0] - 2026-02-12

### Critical Fixes
- **FX Panel Structure**: Fixed a severe layout bug where Digital, Texture, Atmosphere, Creative, and Frame panels were nested inside the Grain panel, making them invisible.
- **Gallery Mode**: Restored the functionality of the gallery frame toggle and border customization.
- **UI Logic**: Centralized event listener initialization to prevent duplicates.


## [2.7.0] - 2026-02-05

### Phase VII: The Terminal Update
- **Terminal Metadata Viewer**: A cinematic retro-terminal overlay that extracts and displays EXIF metadata with professional typing and scanning animations.
- **Oscilloscope Histogram**: A new "Waveform" mode for the histogram that visualizes light signal intensity across the X-axis, inspired by professional color grading monitors.
- **Back Button**: Added a `< RETURN` button to the terminal header for easy exit.
- **Diagnostics**: Live simulated VRAM and latency tracking for the "Unmasked" aesthetic.

### Atmosphere & Optics
- **Bloom & Halation Controls**: Exposed hidden engine parameters to the UI.
    - **Bloom Strength**: Controls the intensity of the light bleed.
    - **Bloom Threshold**: Sets the luminance level where bloom begins.
    - **Halation Strength**: Controls the red-orange fringe around bright highlights.
- **Glow Tint**: Added a custom color picker for the bloom/halation glow, with presets (Halation Pink, Nuclear, Cool Mist, Warm Glow).
- **UI Reorganization**: Moved Halation and Bloom controls to the "Atmosphere" panel for better logical grouping.

### format Support
- **Robust DNG/TIFF Parsing**: Upgraded `RawDecoder` to intelligently parse TIFF structures (IFDs) to find embedded JPEG previews in `.DNG` files, fixing the "Unable to decode" error for Adobe Digital Negatives.

## [2.5.0] - 2026-02-05

### Manifesto Mode v1.0
- **Brutalist Theme**: Introduced "Manifesto Mode," a high-contrast theme featuring thick 2px solid borders, offset shadows, and a raw, sharpened aesthetic.
- **Global Grain Texture**: Added an offline-safe SVG fractal noise overlay that covers the entire interface when active, mimicking the chemical stress of film.
- **Persistent State**: Integrated localStorage logic to ensure the theme preference persists across browser sessions.
- **Thematic Integration**: Added a dedicated toggle inside the "THERES NOTHING HERE" tab with unique haptic and audio feedback.
- **Imaginary Tech**: Updated toggling logic with a cinematic "Purple" technique console signature.

### Fixes & Reliability
- **Offline Reliability**: Replaced paywalled external grain textures with local data URIs, ensuring 100% offline functionality.
- **CSS Cache Busting**: Implemented versioned style links in `index.html` (bumped to v=20) to ensure immediate updates for all users.

## [2.4.0] - 2026-02-05

### The "Unmasked" Manifesto Expansion
- **7-Phase Manifesto**: Completely expanded the "Manifesto of the Unmasked" to 7 chapters, detailing the rejection of masking, the philosophy of offline-first, and the embrace of digital filth.
- **Cinematic UI**: Refactored `manifesto.html` into a paginated Single-Page App (SPA) experience with unique thematic color grading (Hot Pink, Moonstone, Industrial Green, Amber Monitor, Blood Red, and Terminal B&W).
- **Archive Integrity**: Updated `MANIFESTO.md` with 100% of the philosophical text, preserving the project's soul without compression or summarization.

### Film Roll & Workflow
- **Roll-Based Editing**: Implemented "Film Roll" logic for batch operations. 
- **Sync All**: Added a "Sync All" feature to apply adjustments across an entire roll of up to 36 exposures instantly.
- **Contextual Export**: Redesigned the batch export modal with thematic "DEVELOP ROLL" nomenclature and zip-based archiving.

### User Guidance & Integration
- **How-To Guide**: Created a professional [how-to.html](how-to.html) guide with sleek typography and glassmorphic design.
- **Direct Access**: Added a dedicated "Info" icon to the main toolbar for instant access to the documentation.
- **Thematic Linking**: Repurposed the legacy "Mask" tab as a thematic gateway to the manifesto ("THERES NOTHING HERE").

### UI/UX & Mobile
- **Mobile Polish**: Fixed layout padding issues on small screens to ensure full 4K export buttons remain accessible.
- **Icon Update**: Refreshed the PWA icon and favicon with a modern, high-contrast "U" logo.
-  **Performance**: Optimized shader compilation for the paginated manifesto to ensure smooth transitions on legacy hardware.

## [2.3.0] - 2026-02-02

### Creative Effects Expansion
- **New Feature**: Selective Color (HSL-based color masking).
- **New Feature**: Tilt-Shift (Miniature effect with variable blur).
- **UI Updates**: Added a dedicated "Creative" tab in the Effects panel with a Hue Preview indicator.

### Bug Fixes
- **Shader Compilation**: Fixed a GLSL error (`uniform` keyword in function) that caused black screens on some devices.
- **Layout Polish**: Fixed cropped Export button and ensured Preset Card previews fill the 100% of the card height.
- **Slider Visuals**: Removed accidental "box" background from sliders for a cleaner look.

### Preset Expansion
- **New Stocks**: Added 7 unique films: **Harman Phoenix 200**, **Street Candy ATM 400**, **Lomo 800**, **JCH Street Pan**, **Ektar 25**, **Fuji Sensia**, **Agfa CT Precisa**.
- **Technical Renaming**: Rebranded 12 generic presets to professional nomenclature (e.g., *Matte Film* → *Photometric Black Point Lift*).
- **Experimental & Boutique**: Added 20+ rare and exotic stocks including **Kodak Blue X-Ray**, **Aerochrome (Autumn/Inverted)**, **FPP Blue Ultra**, **Dubblefilm Apollo**, and **Silberra PAN 50**.
- **New Brand**: Added **Yashica** category with 7 distinct looks (adding Gems: *Sapphire*, *Ruby*, *Mono*).
- **New Collections**: Added **Hands on Film** (Experimental), **Cinemot** (Portuguese Cinema), **Candido** (Party Vibes), and **Lucky** (Chinese Dead Stock).
- **Hand-Rolled Madness**: Added **Kono!** (Tinted), **Reflx Lab** (Cinema Re-spools), **Dubblefilm** (Effects), **FlicFilm** (Street), and **Karmir** (Armenian).
- **Special FX & Monsters**: Added **Revolog** (Lightning/Textures), **FPP** (Dracula/Wolfman/Frankenstein), **Yodica** (Cosmic Collection: *Antares, Vega, Pegasus*), **Film Washi** (Industrial), and **Analogue Wonderland** Exclusives.
- **House Specials**: Added **Mr. Negative** collection (8 presets) including *Silver Screen*, *Bat Country*, and *Zombie 400*.
- **Glitch & Precision**: Added **Hanalogital** (Glitch Art), **Adox** (German Precision: *CMS 20 II*), **Harman Photo** (Phoenix V2), and **Berlin Specials**.
- **Obscure Additions**: Added **Fomapan 200/400**, **UMI 800T**, **Sora 200D**, **Superia Reala 100**, and **Ilford Color 400**.
- **Refactor**: Split generic categories into dedicated brand archives for **Orwo**, **Svema**, and **Fomapan**. Consolidated **Kodachrome** and **Ektachrome** into the main Kodak library.
- **UI Overhaul**: Expanded sidebar "Manufacturers" and "Indie" sections to expose 41+ specific film categories.
- **Manifesto**: Deprecated "Masking" in spirit. Updated UI text to "Shoot better next time". Added `MANIFESTO.md`.

### Licensing
- **Proprietary**: Changed license from MIT to **All Rights Reserved** (Proprietary) as requested.

## [2.2.0] - 2026-02-01

### ASCII 2.0: The Terminal Update
- **Multi-Mode Engine**: Added 5 distinct rendering modes: **Full Color**, **Matrix Green** (with flicker), **Amber Terminal**, **B&W**, and **Custom Tint**.
- **Refined Grayscale Ramp**: Completely overhauled the character set with a hand-tuned **16-level 3x5 bitmap ramp** for superior image fidelity.
- **Atmospheric Effects**: Implemented vertical scanline shimmer and low-frequency column flicker to simulate legacy hardware.
- **UI Integration**: Added a dedicated mode selector and color picker to the Digital FX panel.
- **Background Bleed**: Fine-tuned character transparency to allow a 5% original image bleed for better structural context.

---

## [2.1.0] - 2026-01-31

### Wasm Core Integration
- **Rust-Powered Grain Engine**: Offloaded grain generation to a high-performance WebAssembly module written in Rust.
- **Fast LCG Noise**: Implemented a custom Linear Congruential Generator (LCG) for superior noise distribution with minimal CPU overhead compared to standard JS math.
- **Direct GPU Buffering**: Implemented a texture upload bridge in `WebGLEngine` to stream grain buffers directly from Wasm memory to GPU textures, minimizing data copying.
- **Zero-Stutter Performance**: Moved computationally intensive pixel loops into the optimized Wasm core to ensure a perfectly responsive UI during grain adjustments.

### Infrastructure & Reliability
- **ESM Wasm Loader**: Developed a modern ES module bridge for dynamic loading and initialization of WebAssembly modules.
- **Graceful Fallback**: Added a detection system that automatically falls back to procedural JS grain if the Wasm module fails to load or the browser doesn't support it.
- **Local Server Guidance**: Updated documentation with instructions for local server setups (`npx serve`, etc.) to resolve browser CORS/Security errors when using advanced features like Wasm and Workers.

---

## [2.0.0] - 2026-01-31

### Performance & Mobile Optimization
- **Smart Resolution Scaling**: Automatically limits internal editing resolution to 2048px on mobile devices (< 800px width) while preserving full 4K+ quality for exports. Drastically reduces memory crashes on iOS/Android.
- **Debounced Preset Wheel**: Implemented a 150ms debounce on the preset scroller to eliminate UI stuttering ("machine gun effect") when browsing rapidly.
- **Lightweight UI**: Simplified preset card rendering by 60%, removing complex CSS filters from non-critical elements to improve scroll FPS.

### Split View Restoration
- **Side-by-Side Comparison**: Restored the 'Before/After' slider functionality.
- **Visual Separation**: Added a clean vertical divider line to clearly mark the transition.
- **Shader Logic**: Fixed `compositeFragment` shader to correctly sample original vs processed textures based on split position.

### Reliability Fixes
- **Preset Overwrite Bug**: Fixed a critical issue where applying a preset would reset your Crop, Rotation, and Border settings. Presets now only change the "Look" (Color/Tone).
- **UI Synchronization**: Fixed HSL Mixer and Color Wheels not updating to reflect the new preset's values.
- **Export Settings**: Fixed "Export Settings" modal missing or being non-functional.

---

## [1.6.0] - 2026-01-30

### The Film Archive Update (Complete)
A massive expansion converting the app into a "Museum Grade" film emulation library (150+ Total Presets).

### New Film Stocks (Phases 9-12)
- **The Legends**: Kodak T-Max (100/400/P3200), Tech Pan, HIE Infrared, Vision3 200T/500T.
- **Fuji Masters**: Reala 100 ("4th Layer"), Eterna 500T, Acros 100, FP-100C.
- **Cinema Print**: Kodak Vision 2383 (Hollywood Teal/Orange).
- **Vintage & Obscure**: Konica VX 400, Lucky Super 100, Rollei Retro/Vario, Film Washi S.
- **Special FX**: Aerochrome III (Pink IR), Lomo Metropolis (Bleach Bypass), Agfa Scala (B&W Slide).

### Output Transform Engine (New)
- **Print Profiles**: Added simulation for **Kodak 2383** (Hollywood Look), **Fuji 3513**, and **Cineon Log**.
- **Physics-Based Grain**: Implemented luminosity-aware grain engines:
  - **Negative Type**: Shadow/Midtone biased (Portra, Gold, etc).
  - **Slide Type**: Midtone biased (Velvia, Provia).
  - Auto-detection system for all 150+ presets.

### Advanced ASCII Engine
- **Bitwise Font**: Replaced legacy logic with a high-performance 16-level bitmask font system.
- **Enhanced Resolution**: Increased maximum character density by 4x for finer detail.
- **Extended Ramp**: ` ` `.` `,` `-` `~` `:` `;` `=` `!` `*` `%` `$` `&` `8` `W` `@`

### Library Reorganization
- **Manufacturer-Based**: Presets now grouped by brand (`Kodak`, `Fuji`, `Ilford`, `Cinestill`, `Agfa`, `Polaroid`).
- **New Categories**:
  - `Vintage`: Consumer classics from defunct brands (Ferrania, Boots, Kmart).
  - `Obscure`: Industrial, Soviet, and Surveillance films (Svema, Tasma, Traffic Surveillance).
  - `Styles`: Modern, Moody, Dreamy, Cinema, Glitch.

### High-Resolution Export
- **Native Rendering**: True native resolution export (up to 4K/Custom) via offscreen WebGL context.
- **Tiled Extraction**: Safe export for large images to prevent mobile browser crashes.
- **Overlay Compositing**: Full-resolution composition of borders, grain, and textures.

### LocalStorage Presets
- **Custom Saving**: Users can now save their own adjustments as named presets.
- **Persistence**: Saved looks are stored in IndexedDB for long-term persistence.
- **Integration**: Custom presets appear in the new "Custom" category with full support for strength and favorites.

### UI Optimization
- **Collapsible Browser**: Replaced horizontal category bar with a vertical accordion for the 150+ preset catalog.
- **Sticky Navigation**: Group headers (Manufacturers, Archives, Creative) stay pinned during scroll.
- **Smooth Interaction**: Added chevron animations and height transitions for a premium Feel.

### Chaos Toast System
- **Dynamic Startup**: Messages now simulate a degrading film lab hardware environment.
- **Visual Types**:
  - **Normal (60%)**: Green "Kodak Viewfinder" HUD style.
  - **Warning (15%)**: Yellow flickering alerts (e.g., "Developer temp critical").
  - **Critical (10%)**: Red shaking fatal errors (e.g., "Film jammed").
  - **ASCII (15%)**: Retro "DND" logo logic.
- **Aesthetic**: Digital mono-spaced font with glow effects and technical borders.

### Fixes & Improvements
- **Database Repair**: Fixed syntax error in `presets.js` causing database load failures.
- **Refactor**: Complete code cleanup of the preset loading engine.
- **Quality**: Verified unique chemical signatures for all all new additions (Halation, Grain structures, Bloom).

### The Immersion Upgrade
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

### New Presets (20+)
- **Nature Pack**: Forest Mist, Ocean Breeze, Desert Gold, Mountain Air, Sunset Glow
- **Editorial Pack**: Magazine Cover, High Fashion, Beauty Retouch, Commercial Clean, Urban Street
- **Cinematic Expansion**: Neon Noir, Amber Cinema, Teal Shadow, Golden Hour Cine, Moonlight Blue
- **Vintage Expansion**: 70s Polaroid, 80s VHS, 90s Grunge, Faded Memories, Old Hollywood
- **B&W Expansion**: High Contrast Noir, Soft Silver, Newspaper Print, Infrared Film, Selenium Tone

### New FX Sliders
- **Posterize** (0-100): Reduce color palette for artistic effect
- **Diffusion** (0-100): Pro-Mist / Soft glow on highlights
- **Barrel Distortion** (-100 to 100): Lens distortion correction
- **Film Gate Weave** (0-100): Authentic film frame wobble
- **Noise Color Tint** (0-360°): Tint grain with any hue
- **Split Tone Balance** (-100 to 100): Shadows vs Highlights bias

### Auto-Enhance
- One-click automatic optimization using histogram analysis
- Adjusts exposure, contrast, shadows, and highlights
- Located in histogram panel (click "Auto" button)

### Clipping Warnings
- Toggle to show blown highlights (red) and crushed blacks (blue)
- Real-time shader-based overlay
- Checkbox in histogram panel

### Preset Favorites
- Star icon on each preset card to add to favorites
- Favorites persist across sessions (localStorage)
- New "Favorites" category tab for quick access

### Enhanced Batch Export Progress
- New modal with per-image queue display
- Overall progress bar with count
- ETA (estimated time remaining)
- Status text for current operation
- Cancel button to abort export

### AI Denoise
- Bilateral filter-based noise reduction
- Preserves edges while smoothing noise
- New slider in Grain FX panel (0-100%)
- Applied early in pipeline to prevent noise amplification

### RAW File Support
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

### Mobile Improvements
- Histogram toggle button added to mobile action bar
- Fixed clickability of histogram panel controls (z-index fix)

### Bug Fixes
- Fixed histogram Auto/Clip buttons not clickable (z-index issue)
- Improved preset category list with editorial and nature categories

### LUT Export & Dithering
- **LUT Export**: Generate standard .cube files for video editing integration.
- **Dithering Engine**: 4 algorithms (Floyd-Steinberg, Atkinson, Bayer, Random) for retro aesthetics.

### Texture Overlays
- **Asset Pack**: 15+ built-in textures (Dust, Light Leaks, Crumpled Paper).
- **Blend Modes**: Multiply, Screen, Overlay, Soft Light support.
- **Opacity Control**: Fine-tune texture intensity.

### Critical Fixes (Latest)
- **Stability**: Fixed WebGL crash caused by shader compilation failures ("parameter 1 is not of type 'WebGLProgram'").
- **Render Pipeline**: Restored missing Composite shader to fix black screen issues.
- **Quality**: Fixed grain intensity scaling (was 100x too strong) responsible for preset noise.
- **Safeguards**: Added debug alerts for shader errors to aid future troubleshooting.

---

## [1.4.0] - Previous Release
- Initial public release with core editing features
