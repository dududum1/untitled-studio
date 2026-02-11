/**
 * UNTITLED STUDIO - GLSL FRAGMENT SHADERS
 * GPU-accelerated image processing via WebGL 2.0
 * Phase 2: Added Dehaze, Clarity, Split Toning, Tone Curve LUT
 */

const Shaders = {
    // Vertex Shader (shared by all fragment shaders)
    vertex: `#version 300 es
        precision highp float;
        
        in vec2 a_position;
        in vec2 a_texCoord;
        
        uniform float u_rotation; // Rotation in radians
        uniform int u_flipX;      // 1 = flip, 0 = no
        uniform int u_flipY;      // 1 = flip, 0 = no
        
        out vec2 v_texCoord;
        
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            
            // Rotate UV around center (0.5, 0.5)
            vec2 center = vec2(0.5, 0.5);
            vec2 uv = a_texCoord - center;
            
            // Apply Flip (before rotation? or after? Crop tool usually does flip THEN rotation in local space, or vice versa?
            // Usually Flip is applied to the image axis.
            if (u_flipX > 0) uv.x = -uv.x;
            if (u_flipY > 0) uv.y = -uv.y;
            
            float c = cos(u_rotation);
            float s = sin(u_rotation);
            mat2 rot = mat2(c, -s, s, c);
            
            v_texCoord = (rot * uv) + center;
        }
    `,

    // Main Fragment Shader - All adjustments in single pass for performance
    fragment: `#version 300 es
        precision highp float;
        
        uniform sampler2D u_image;
        uniform sampler2D u_toneCurveLUT;  // 256x4 LUT (Row 0=Master, 1=R, 2=G, 3=B)
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform bool u_showOriginal;       // Before/After toggle
        
        // Tonal Adjustments
        uniform float u_exposure;
        uniform float u_contrast;
        uniform float u_highlights;
        uniform float u_shadows;
        uniform float u_whites;
        uniform float u_blacks;
        
        // Color Adjustments
        uniform float u_temperature;
        uniform float u_tint;
        uniform float u_vibrance;
        uniform float u_saturation;
        
        // Split Toning
        uniform float u_splitHighlightHue;
        uniform float u_splitHighlightSat;
        uniform float u_splitMidtoneHue;
        uniform float u_splitMidtoneSat;
        uniform float u_splitShadowHue;
        uniform float u_splitShadowSat;
        uniform float u_splitBalance;
        
        // Tone Curve
        uniform bool u_useToneCurve;
        
        // HSL Mixer (8 color channels: R, O, Y, G, A, B, P, M)
        uniform vec3 u_hslRed;
        uniform vec3 u_hslOrange;
        uniform vec3 u_hslYellow;
        uniform vec3 u_hslGreen;
        uniform vec3 u_hslAqua;
        uniform vec3 u_hslBlue;
        uniform vec3 u_hslPurple;
        uniform vec3 u_hslMagenta;
        
        // Effects
        uniform float u_grainShadow;
        uniform float u_grainHighlight;
        uniform float u_grainSize;
        uniform float u_vignette;
        uniform float u_fade;
        uniform float u_sharpness;
        uniform float u_dehaze;
        uniform float u_clarity;
        uniform float u_chromaticAberration; // Phase 3: Lens Fringing

        
        // Masks (Phase 2)
        uniform sampler2D u_maskTexture;
        uniform bool u_useMask;
        uniform float u_maskFeather;

        // Overlay (Phase 3)
        uniform sampler2D u_overlayTexture;
        uniform bool u_useOverlay;
        uniform float u_overlayOpacity;

        uniform int u_overlayBlendMode; // 0=Normal, 1=Multiply, 2=Screen, 3=Overlay

        // Vibe Procedural (Phase 6)
        uniform float u_lightLeak;
        uniform float u_scratches;
        uniform float u_filmGateWeave;
        uniform bool u_galleryFrame;

        uniform float u_filmSeed;

        // Custom LUT
        uniform mediump sampler3D u_lut3d;
        uniform bool u_useLUT;
        uniform float u_lutOpacity;

        // ASCII
        uniform float u_asciiSize; // 0.0 to 2.0 (density)
        uniform int u_asciiMode;   // 0=Original, 1=Matrix, 2=Amber, 3=B&W, 4=Custom
        uniform vec3 u_asciiColor; // For custom mode

        // New FX (Phase 7)
        uniform float u_posterize;        // 0-100: Color reduction (2-256 levels)
        uniform float u_barrelDistortion; // -100 to 100: Lens distortion (neg=pincushion, pos=barrel)

        uniform float u_splitToneBalance; // -100 to 100: Shadows vs Highlights bias
        uniform float u_noiseColorHue;    // 0-360: Tint hue for grain
        uniform bool u_showClipping;      // Show clipping warnings (red=blown, blue=crushed)
        uniform float u_denoise;          // 0-100: AI Denoise (bilateral filter)
        
        // Dithering Engine
        uniform int u_ditherType;          // 0=off, 1=Floyd-Steinberg, 2=Atkinson, 3=Bayer, 4=Random
        uniform float u_ditherDepth;       // 2-8: Target bits per channel
        uniform float u_ditherStrength;    // 0-100: Blend with original

        // Output Transform (Print Stock)
        uniform int u_outputTransform;     // 0=None, 1=Kodak 2383, 2=Fuji 3513

        // Selective Color (Creative FX)
        uniform float u_selColorHue;       // Target Hue (0-360)
        uniform float u_selColorRange;     // Width of selection (0-180)
        uniform float u_selColorSat;       // Saturation boost/cut
        uniform float u_selColorLum;       // Luminance boost/cut
        uniform float u_selColorFeather;   // 0-1 Softness

        // Tilt-Shift (Phase 2 Expansion)
        uniform float u_tiltShiftBlur;      // Max blur radius (0-50)
        uniform float u_tiltShiftPos;       // Center Y (0.0 - 1.0)
        uniform float u_tiltShiftFocusWidth; // Width of sharp area (0.0 - 1.0)
        uniform float u_tiltShiftGradient;  // Falloff (0.0 - 1.0)

        // Wasm Core Enhancements
        uniform sampler2D u_wasmGrainTexture;
        uniform bool u_useWasmGrain;

        // Phase VIII: Thermal Genesis (Spectral Imaging)
        uniform int u_thermalMode;        // 0=Off, 1=Ironbow, 2=Rainbow, 3=Aerochrome
        uniform float u_thermalIntensity; // 0.0 - 1.0 (Blend Strength)
        
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        // ============ FILM SCIENCE MATH ============
        // Returns 1.0 if pixel is part of char, 0.0 otherwise
        // Mobile-optimized: uses step functions instead of if-branches
        // Procedural 3x5 font using Bitmask (Integer)
        // Returns 1.0 if pixel is part of char, 0.0 otherwise
        float getCharacter(int n, vec2 p) {
            // p is 0..1 inside the char cell
            // map to 3x5 grid
            vec2 uv = p;
            // Configurable 3x5 grid
            int x = int(floor(uv.x * 3.0));
            int y = int(floor((1.0 - uv.y) * 5.0));
            
            if (x < 0 || x > 2 || y < 0 || y > 4) return 0.0;
            
            // Bit index (0-14)
            // Layout: 
            // 0 1 2
            // 3 4 5
            // ...
            int i = x + y * 3;
            
            // Character Map (16 levels of brightness)
            // 0: space
            // 1: .
            // 2: ,
            // 3: -
            // 4: ~
            // 5: :
            // 6: ;
            // 7: =
            // 8: !
            // 9: *
            // 10: %
            // 11: $
            // 12: &
            // 13: 8
            // 14: W
            // 15: @
            
            int bits = 0;
            
            // Hardcoded bitmap font (GLSL ES 3.0 allows arrays but switch is safer for some mobile drivers)
            // Bits are reversed? 0=top-left. 14=bottom-right.
            // Let's use standard integer values.
            
            switch(n) {
                case 0: bits = 0; break;      // space
                case 1: bits = 2; break;      // . 
                case 2: bits = 1026; break;   // :
                case 3: bits = 2186; break;   // .:.
                case 4: bits = 3584; break;   // -
                case 5: bits = 11333; break;  // +
                case 6: bits = 12300; break;  // = (plus-ish)
                case 7: bits = 11410; break;  // x
                case 8: bits = 14358; break;  // *
                case 9: bits = 23245; break;  // #
                // Higher density
                case 10: bits = 27306; break; // % 
                case 11: bits = 31258; break; // &
                case 12: bits = 31710; break; // 8
                case 13: bits = 32734; break; // @
                case 14: bits = 32765; break; // W
                case 15: bits = 32767; break; // █
                default: bits = 0; break;
            }
            
            // Check bit
            // GLSL bitwise operators
            int mask = 1 << (14 - i); 
            return (bits & mask) != 0 ? 1.0 : 0.0;
        }

        vec3 rgb2cmy(vec3 rgb) {
            return 1.0 - rgb;
        }

        vec3 cmy2rgb(vec3 cmy) {
            return 1.0 - clamp(cmy, 0.0, 1.0);
        }

        // Simulates film density: More dye = darker image
        vec3 applyDensity(vec3 rgb, float exposure, float saturation) {
            vec3 cmy = rgb2cmy(rgb);
            
            // Exposure adds "thickness" to all layers (or removes it)
            // -Exposure = More Density (Darker)
            // So +Exposure = Less Density.
            cmy -= exposure * 0.5; 
            
            // Saturation increases the separation of dyes
            // In subtractive, higher saturation means purer dyes = darker result
            // We pivot around gray to avoid just crushing everything
            // Start with normalized saturation (assuming input is -100 to 100)
            float s = saturation / 100.0;
            
            float avg = (cmy.r + cmy.g + cmy.b) / 3.0;
            cmy = avg + (cmy - avg) * (1.0 + s);

            return cmy2rgb(cmy);
        }

        // Logarithmic Highlight Roll-off (Shoulder)
        // Mimics film's inability to hard-clip
        vec3 logShoulder(vec3 x) {
            // Linear below threshold, log above
            float t = 0.8; // Shoulder start
            vec3 result;
            
            // If x < t, return x. If x >= t, smooth curve
            // Formula: t + (1-t) * (1 - exp(-(x-t)/(1-t)))? 
            // Simplified Reinhard-ish:
            
            return min(vec3(1.0), x * (1.0 / (1.0 + max(vec3(0.0), x - 1.0)*0.5))); 
            // That's soft clip. Let's use a verified film curve approximation:
            // x / (x + 0.155) * 1.155 ?
            
            // Implementation of "Shoulder" only for highlights > 0.8
            // y = 0.8 + 0.2 * tanh((x - 0.8) / 0.2)?
            
            return vec3(
                x.r > 0.8 ? 0.8 + 0.2 * tanh((x.r - 0.8) * 5.0) : x.r,
                x.g > 0.8 ? 0.8 + 0.2 * tanh((x.g - 0.8) * 5.0) : x.g,
                x.b > 0.8 ? 0.8 + 0.2 * tanh((x.b - 0.8) * 5.0) : x.b
            );
        }

        // ... Standard helpers ...
        vec3 rgb2hsl(vec3 c) {
            float maxC = max(c.r, max(c.g, c.b));
            float minC = min(c.r, min(c.g, c.b));
            float l = (maxC + minC) / 2.0;
            
            if (maxC == minC) {
                return vec3(0.0, 0.0, l);
            }
            
            float d = maxC - minC;
            float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
            float h;
            
            if (maxC == c.r) {
                h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
            } else if (maxC == c.g) {
                h = (c.b - c.r) / d + 2.0;
            } else {
                h = (c.r - c.g) / d + 4.0;
            }
            
            h /= 6.0;
            return vec3(h, s, l);
        }
        
        float hue2rgb(float p, float q, float t) {
            if (t < 0.0) t += 1.0;
            if (t > 1.0) t -= 1.0;
            if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
            if (t < 1.0/2.0) return q;
            if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
            return p;
        }
        
        vec3 hsl2rgb(vec3 hsl) {
            float h = hsl.x;
            float s = hsl.y;
            float l = hsl.z;
            
            if (s == 0.0) {
                return vec3(l);
            }
            
            float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
            float p = 2.0 * l - q;
            
            return vec3(
                hue2rgb(p, q, h + 1.0/3.0),
                hue2rgb(p, q, h),
                hue2rgb(p, q, h - 1.0/3.0)
            );
        }
        
        float luminance(vec3 c) {
            return dot(c, vec3(0.2126, 0.7152, 0.0722));
        }
        
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        // ============ ADJUSTMENT FUNCTIONS ============
        
        vec3 applyExposure(vec3 c, float exposure) {
            return c * pow(2.0, exposure);
        }
        
        vec3 applyContrast(vec3 c, float contrast) {
            float t = contrast / 100.0;
            return (c - 0.5) * (1.0 + t) + 0.5;
        }
        
        vec3 applyHighlights(vec3 c, float highlights) {
            float lum = luminance(c);
            float highlightMask = smoothstep(0.5, 1.0, lum);
            float adjustment = highlights / 100.0;
            return c + c * adjustment * highlightMask;
        }
        
        vec3 applyShadows(vec3 c, float shadows) {
            float lum = luminance(c);
            float shadowMask = 1.0 - smoothstep(0.0, 0.5, lum);
            float adjustment = shadows / 100.0;
            return c + c * adjustment * shadowMask;
        }
        
        vec3 applyWhites(vec3 c, float whites) {
            float lum = luminance(c);
            float whiteMask = smoothstep(0.75, 1.0, lum);
            float adjustment = whites / 100.0;
            return c + c * adjustment * whiteMask;
        }
        
        vec3 applyBlacks(vec3 c, float blacks) {
            float lum = luminance(c);
            float blackMask = 1.0 - smoothstep(0.0, 0.25, lum);
            float adjustment = blacks / 100.0;
            return c + c * adjustment * blackMask;
        }
        
        vec3 applyTemperature(vec3 c, float temp) {
            float t = temp / 100.0;
            c.r += t * 0.1;
            c.b -= t * 0.1;
            return c;
        }
        
        vec3 applyTint(vec3 c, float tint) {
            float t = tint / 100.0;
            c.g -= t * 0.1;
            c.r += t * 0.05;
            c.b += t * 0.05;
            return c;
        }
        
        vec3 applyVibrance(vec3 c, float vibrance) {
            float v = vibrance / 100.0;
            float avg = (c.r + c.g + c.b) / 3.0;
            float maxC = max(c.r, max(c.g, c.b));
            float sat = 1.0 - (maxC - avg);
            return mix(vec3(avg), c, 1.0 + v * sat);
        }
        
        vec3 applySaturation(vec3 c, float saturation) {
            float s = 1.0 + saturation / 100.0;
            float gray = luminance(c);
            return mix(vec3(gray), c, s);
        }
        
        // Color Grading - 3-Way (Shadows, Midtones, Highlights)
        vec3 applyColorGrading(vec3 c, float highlightHue, float highlightSat, float midHue, float midSat, float shadowHue, float shadowSat, float balance) {
            float lum = luminance(c);
            
            // Generate Colors
            vec3 highColor = hsl2rgb(vec3(highlightHue / 360.0, 1.0, 0.5));
            vec3 midColor  = hsl2rgb(vec3(midHue / 360.0, 1.0, 0.5));
            vec3 shadowColor = hsl2rgb(vec3(shadowHue / 360.0, 1.0, 0.5));
            
            // Balance Shift (-1.0 to 1.0)
            // Shifts the crossover points
            float balanceShift = balance / 100.0 * 0.25;
            
            // Masks
            // Shadows: 1.0 -> 0.0 (Bottom third)
            float shadowMask = 1.0 - smoothstep(0.0 + balanceShift, 0.5 + balanceShift, lum);
            
            // Highlights: 0.0 -> 1.0 (Top third)
            float highlightMask = smoothstep(0.5 + balanceShift, 1.0 + balanceShift, lum);
            
            // Midtones: Parabola in middle
            // We want it to peak at 0.5 (or balanced center) and fall off
            // Gaussian-ish: exp(-((lum - center)^2) / width)
            float midCenter = 0.5 + balanceShift;
            float midMask = 1.0 - abs(lum - midCenter) * 2.0;
            midMask = smoothstep(0.0, 1.0, midMask); // smooth tip
            midMask = clamp(midMask, 0.0, 1.0);
            
            // Intensities
            float hSat = highlightSat / 100.0 * 0.3;
            float mSat = midSat / 100.0 * 0.3; // Mids typically subtle
            float sSat = shadowSat / 100.0 * 0.3;
            
            // Apply Tints (Soft Light or Overlay logic usually better, but Mix is safe for now)
            // For true Grading, we often use Gain/Gamma/Lift. 
            // Using Mix for Tinting:
            
            vec3 res = c;
            
            // Shadows
            if (shadowSat > 0.0) res = mix(res, res * shadowColor, shadowMask * sSat);
            
            // Mids
            if (midSat > 0.0)    res = mix(res, res * midColor, midMask * mSat);
            
            // Highlights
            if (highlightSat > 0.0) res = mix(res, res * highColor, highlightMask * hSat);
            
            return res;
        }
        
        // Tone Curve - apply LUT-based curve adjustment
        // Tone Curve - apply LUT-based curve adjustment (4-Channel)
        vec3 applyToneCurve(vec3 c, sampler2D lut, bool useCurve) {
            if (!useCurve) return c;
            
            // Row 0: Master (RGB) - Applied to all channels
            vec3 master;
            master.r = texture(lut, vec2(c.r, 0.125)).r;
            master.g = texture(lut, vec2(c.g, 0.125)).r;
            master.b = texture(lut, vec2(c.b, 0.125)).r;
            
            // Row 1: Red Channel
            master.r = texture(lut, vec2(master.r, 0.375)).r;
            
            // Row 2: Green Channel
            master.g = texture(lut, vec2(master.g, 0.625)).r;
            
            // Row 3: Blue Channel
            master.b = texture(lut, vec2(master.b, 0.875)).r;
            
            return master;
        }
        
        // Dehaze - remove atmospheric haze
        vec3 applyDehaze(vec3 c, float amount) {
            if (amount == 0.0) return c;
            
            float d = amount / 100.0;
            
            // Estimate atmospheric light (simplified - assumes brightest areas are haze)
            float minChannel = min(c.r, min(c.g, c.b));
            
            // Dark channel prior approximation
            float haze = minChannel;
            
            // Transmission estimation
            float transmission = 1.0 - d * haze;
            transmission = max(transmission, 0.1); // Prevent division by zero
            
            // Atmospheric light estimation (simplified)
            vec3 atmosphericLight = vec3(1.0);
            
            // Recover scene radiance
            vec3 dehazed = (c - atmosphericLight * (1.0 - transmission)) / transmission;
            
            // Blend based on amount
            return mix(c, clamp(dehazed, 0.0, 1.0), abs(d));
        }
        
        // Clarity - mid-tone contrast enhancement
        vec3 applyClarity(vec3 c, vec2 uv, float amount) {
            if (amount == 0.0) return c;
            
            float cl = amount / 100.0;
            float lum = luminance(c);
            
            // Mid-tone mask (bell curve centered at 0.5)
            float midtoneMask = 1.0 - abs(lum - 0.5) * 2.0;
            midtoneMask = midtoneMask * midtoneMask; // Smooth falloff
            
            // Local contrast enhancement
            float contrastBoost = cl * midtoneMask * 0.5;
            
            // Apply contrast to mid-tones
            vec3 result = (c - 0.5) * (1.0 + contrastBoost) + 0.5;
            
            return result;
        }
        
        vec3 applyHSLMixer(vec3 c) {
            vec3 hsl = rgb2hsl(c);
            float h = hsl.x;
            
            float weight = 0.0;
            vec3 adjustment = vec3(0.0);
            
            weight = max(0.0, 1.0 - abs(h - 0.0) * 12.0) + max(0.0, 1.0 - abs(h - 1.0) * 12.0);
            adjustment += u_hslRed * weight;
            
            weight = max(0.0, 1.0 - abs(h - 0.083) * 12.0);
            adjustment += u_hslOrange * weight;
            
            weight = max(0.0, 1.0 - abs(h - 0.167) * 12.0);
            adjustment += u_hslYellow * weight;
            
            weight = max(0.0, 1.0 - abs(h - 0.333) * 6.0);
            adjustment += u_hslGreen * weight;
            
            weight = max(0.0, 1.0 - abs(h - 0.5) * 6.0);
            adjustment += u_hslAqua * weight;
            
            weight = max(0.0, 1.0 - abs(h - 0.667) * 6.0);
            adjustment += u_hslBlue * weight;
            
            weight = max(0.0, 1.0 - abs(h - 0.75) * 12.0);
            adjustment += u_hslPurple * weight;
            
            weight = max(0.0, 1.0 - abs(h - 0.875) * 8.0);
            adjustment += u_hslMagenta * weight;
            
            hsl.x += adjustment.x / 360.0;
            hsl.y *= 1.0 + adjustment.y / 100.0;
            hsl.z *= 1.0 + adjustment.z / 100.0;
            
            hsl.x = fract(hsl.x);
            hsl.y = clamp(hsl.y, 0.0, 1.0);
            hsl.z = clamp(hsl.z, 0.0, 1.0);
            
            return hsl2rgb(hsl);
        }

        vec3 applySelectiveColor(vec3 c) {
            // Early exit if no range selected (size 0) or no adjustments
            if (u_selColorRange <= 0.001 || (u_selColorSat == 0.0 && u_selColorLum == 0.0)) return c;
            
            vec3 hsl = rgb2hsl(c);
            float h = hsl.x; // 0.0 to 1.0
            
            float targetH = u_selColorHue / 360.0;
            float range = u_selColorRange / 360.0;
            float feather = u_selColorFeather * range; // Feather is fraction of range

            // Calculate distance in hue circle (shortest path)
            float dist = abs(h - targetH);
            if (dist > 0.5) dist = 1.0 - dist;

            // Mask: 1.0 at center, 0.0 at range edge
            
            float mask = 1.0 - smoothstep(max(0.0, range - feather), range, dist);
            
            if (mask <= 0.001) return c; // Optimization

            // Apply Adjustments
            hsl.y *= 1.0 + (u_selColorSat / 100.0 * mask);
            hsl.z *= 1.0 + (u_selColorLum / 100.0 * mask);

            hsl.y = clamp(hsl.y, 0.0, 1.0);
            hsl.z = clamp(hsl.z, 0.0, 1.0);

            return hsl2rgb(hsl);
        }

        
        vec3 applyGrain(vec3 c, vec2 uv, float shadowAmt, float highlightAmt, float size) {
            // Rec 709 Luminance
            float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
            
            // Calculate grain intensity based on luminance:
            // Mix between shadowAmt (at lum=0) and highlightAmt (at lum=1)
            float intensity = mix(shadowAmt, highlightAmt, lum) / 100.0 * 0.2; // 0.2 scale factor
            
            if (intensity <= 0.001) return c;
            
            // Generate Noise
            vec2 grainUV = uv * u_resolution / size;
            float noise;
            
            if (u_useWasmGrain) {
                // Tiled texture sampling
                noise = texture(u_wasmGrainTexture, fract(grainUV)).r;
            } else {
                noise = random(grainUV + fract(u_time * 0.1));
            }
            
            vec3 noiseVec = vec3(noise);
            
            // Classic Soft Light
            // If noise < 0.5: c - (1-2*noise) * c * (1-c)
            // If noise > 0.5: c + (2*noise-1) * (sqrt(c)-c) ?
            
            // Simplified overlay approach that is responsive to intensity:
            // output = c + (noise - 0.5) * intensity
            // This is "Linear" blending.
            
            // Let's implement Soft Light logic for better organic feel:
            vec3 result;
            
            // Using Pegasus simplified formula for Soft Light:
            // (1-2b)a^2 + 2ba
            
            vec3 grainColor = vec3(noise);
            
            // Mix original color with grain color using Soft Light math
            // But we actually want to ADD grain, not blend a gray image.
            
            // Effective approach: 
            // 1. Center noise around 0 (-0.5 to 0.5)
            float n = noise - 0.5;
            
            // 2. Apply intensity
            n *= intensity;
            
            // 3. Add to color (Linear Light)
            // c += n;
            
            // 4. Soft Light refinement (avoids clipping)
            // If we assume the noise modifies the brightness...
            
            result = c + n; // Simple addition is usually what 'film grain' does physically (silver halide crystals blocking light)
            
            // However, real film grain is subtractive (blocking light).
            // But digital grain is often additive/subtractive noise.
            
            return result;
        }
        
        vec3 applyVignette(vec3 c, vec2 uv, float amount) {
            if (amount <= 0.0) return c;
            
            float v = amount / 100.0;
            vec2 center = uv - 0.5;
            float dist = length(center);
            float vignette = 1.0 - smoothstep(0.3, 0.9, dist * v * 2.0);
            
            return c * vignette;
        }

        // ============ PROCEDURAL VIBE ============
        
        vec3 applyLightLeak(vec3 c, vec2 uv, float amount, float seed) {
            if (amount <= 0.0) return c;
            
            // Randomize position based on seed
            float offset = sin(seed * 12.34) * 0.5;
            float scale = 0.5 + sin(seed * 56.78) * 0.5;
            
            // Create a blob shape using low-frequency sine waves
            float leak = 0.0;
            
            // Primary leak (Side burn)
            float x = uv.x + offset;
            float y = uv.y;
            
            float lx = sin(x * 2.0 + seed) * cos(y * 1.5 + seed * 0.5);
            leak += smoothstep(0.6, 1.0, lx);
            
            // Secondary leak
            leak += smoothstep(0.8, 1.0, sin(uv.x * 3.0 - seed) * cos(uv.y * 3.0 + seed));
            
            // Color Mapping (Warm Orange to Red)
            vec3 leakColor = vec3(1.0, 0.5, 0.2); // Orange base
            leakColor = mix(leakColor, vec3(1.0, 0.2, 0.1), sin(seed * 10.0) * 0.5 + 0.5); // Random shift to Red
            
            // Blend: Screen/Add
            float intensity = amount / 100.0;
            return c + leakColor * leak * intensity;
        }
        
        vec3 applyScratches(vec3 c, vec2 uv, float amount, float seed) {
            if (amount <= 0.0) return c;
            
            float intensity = amount / 100.0;
            
            // Scratches are high-frequency noise on X axis, constant on Y
            // We shift X by seed to "animate" or randomize positions
            float scratchX = uv.x + seed  * 13.59;
            
            // Generate noise line
            float n = random(vec2(floor(scratchX * 300.0), seed));
            
            // Threshold to make them sparse lines
            float scratch = smoothstep(0.995, 1.0, n);
            
            // Varying opacity per scratch
            float opacity = random(vec2(seed, floor(scratchX * 300.0)));
            
            // Sometimes scratches are white (digs), sometimes dark (dust)
            // Let's go with white negative scratches for now
            return c + vec3(1.0) * scratch * opacity * intensity * 0.8;
        }
        
        vec3 applyFade(vec3 c, float amount) {
            if (amount <= 0.0) return c;
            
            float f = amount / 100.0 * 0.3;
            return c + f * (1.0 - c);
        }

        // ============ NEW FX (Phase 7) ============
        
        // Posterize: Reduce color levels for retro/pop-art look
        vec3 applyPosterize(vec3 c, float amount) {
            if (amount <= 0.0) return c;
            
            // amount 0-100 maps to 256 levels down to 2 levels
            float levels = mix(256.0, 2.0, amount / 100.0);
            return floor(c * levels) / (levels - 1.0);
        }
        

        
        // Barrel Distortion: Lens distortion effect
        vec2 applyBarrelDistortion(vec2 uv, float amount) {
            if (abs(amount) < 0.01) return uv;
            
            vec2 center = vec2(0.5);
            vec2 coord = uv - center;
            float dist = length(coord);
            
            // amount: -100 = pincushion, +100 = barrel
            float k = amount / 100.0 * 0.3;
            float distorted = dist * (1.0 + k * dist * dist);
            
            return center + normalize(coord) * distorted;
        }
        
        // Film Gate Weave: Subtle frame wobble
        vec2 applyFilmGateWeave(vec2 uv, float amount, float time) {
            if (amount <= 0.0) return uv;
            
            float intensity = amount / 100.0 * 0.005;
            
            // Slow random wobble using time
            float wobbleX = sin(time * 3.7) * cos(time * 2.3) * intensity;
            float wobbleY = cos(time * 4.1) * sin(time * 1.9) * intensity;
            
            return uv + vec2(wobbleX, wobbleY);
        }
        
        // Noise Color: Tint the film grain with a hue
        vec3 applyNoiseColorTint(vec3 grainColor, float hue) {
            if (hue <= 0.0) return grainColor;
            // Convert hue (0-360) to RGB tint
            float h = hue / 360.0;
            vec3 tint = hsl2rgb(vec3(h, 0.6, 0.5));
            
            return grainColor * tint * 2.0; // Boost tint slightly
        }

        // Thermal False Color Engine
        vec3 applySpectralImaging(vec3 c, int mode, float intensity) {
            if (mode == 0 || intensity <= 0.0) return c;
            
            float lum = luminance(c);
            vec3 result = c;
            
            if (mode == 1) { // Ironbow (Thermal)
                // Black -> Purple -> Blue -> Cyan -> Green -> Yellow -> Orange -> Red -> White
                // This is a simplified cosine-based palette approximation for speed
                
                vec3 col = vec3(0.0);
                
                // Manual Gradient Map
                // 0.0 - 0.15: Black -> Purple
                // 0.15 - 0.35: Purple -> Blue
                // 0.35 - 0.55: Blue -> Green
                // 0.55 - 0.75: Green -> Yellow/Orange
                // 0.75 - 1.0: Orange -> Red -> White
                
                if (lum < 0.15)       col = mix(vec3(0.0, 0.0, 0.0), vec3(0.2, 0.0, 0.5), lum / 0.15);
                else if (lum < 0.35)  col = mix(vec3(0.2, 0.0, 0.5), vec3(0.0, 0.0, 1.0), (lum - 0.15) / 0.2);
                else if (lum < 0.55)  col = mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0), (lum - 0.35) / 0.2);
                else if (lum < 0.75)  col = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0), (lum - 0.55) / 0.2);
                else if (lum < 0.9)   col = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), (lum - 0.75) / 0.15);
                else                  col = mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0), (lum - 0.9) / 0.1);
                
                result = col;
                
            } else if (mode == 2) { // Rainbow (Scientific)
                // HSL full spectrum mapping
                // Blue (Cold) -> Red (Hot)
                // Hue: 240 deg (0.66) -> 0 deg (0.0)
                float h = 0.666 * (1.0 - clamp(lum, 0.0, 1.0));
                result = hsl2rgb(vec3(h, 1.0, 0.5));
                
            } else if (mode == 3) { // Aerochrome (Infrared Emulation)
                // The quintessential IR look: Green foliage becomes Red/Pink
                // Standard digital approximation:
                // R_out = G_in (Green channel mapped to Red)
                // G_out = R_in (Red channel mapped to Green)
                // B_out = B_in * 0.1 (Blue suppressed)
                
                vec3 ir = vec3(0.0);
                
                // Stronger version
                // R = G; G = R; B = 0.1;
                // But vegetation (G) needs to be magenta-ish for Aerochrome III
                
                // Mapping Green to Red/Magenta
                ir.r = c.g * 1.2; 
                ir.g = c.r * 0.9;
                ir.b = c.b * 0.2;
                
                // Mix in limits
                result = ir;
                
                // Add contrast for that film look
                result = applyContrast(result, 20.0);
            }
            
            return mix(c, result, intensity);
        }
        
        // AI Denoise: Bilateral filter approximation
        // Reduces noise while preserving edges by considering both spatial and color distance
        vec3 applyDenoise(vec3 c, vec2 uv, float amount) {
            if (amount <= 0.0) return c;
            
            float intensity = amount / 100.0;
            vec2 texel = 1.0 / u_resolution;
            
            // Bilateral filter parameters
            float spatialSigma = 2.0 + intensity * 4.0;  // Larger = more blur
            float rangeSigma = 0.1 + intensity * 0.15;   // Larger = less edge preservation
            
            vec3 sum = vec3(0.0);
            float weightSum = 0.0;
            
            // Sample in a 5x5 kernel (optimized for WebGL performance)
            int radius = 2;
            
            for (int x = -radius; x <= radius; x++) {
                for (int y = -radius; y <= radius; y++) {
                    vec2 offset = vec2(float(x), float(y)) * texel * spatialSigma;
                    vec3 neighbor = texture(u_image, uv + offset).rgb;
                    
                    // Spatial weight (Gaussian based on distance)
                    float spatialDist = length(vec2(float(x), float(y)));
                    float spatialWeight = exp(-(spatialDist * spatialDist) / (2.0 * spatialSigma * spatialSigma));
                    
                    // Range weight (Gaussian based on color difference)
                    float colorDist = distance(c, neighbor);
                    float rangeWeight = exp(-(colorDist * colorDist) / (2.0 * rangeSigma * rangeSigma));
                    
                    // Combined bilateral weight
                    float weight = spatialWeight * rangeWeight;
                    
                    sum += neighbor * weight;
                    weightSum += weight;
                }
            }
            
            return sum / max(weightSum, 0.001);
        }
        
        // ============ DITHERING ENGINE ============
        
        // Bayer 4x4 matrix for ordered dithering
        float bayerMatrix(vec2 pos) {
            int x = int(mod(pos.x, 4.0));
            int y = int(mod(pos.y, 4.0));
            
            // 4x4 Bayer threshold matrix
            int matrix[16] = int[16](
                 0,  8,  2, 10,
                12,  4, 14,  6,
                 3, 11,  1,  9,
                15,  7, 13,  5
            );
            
            return float(matrix[y * 4 + x]) / 16.0;
        }
        
        // Quantize to N levels
        vec3 quantize(vec3 color, float levels) {
            float step = 1.0 / (levels - 1.0);
            return floor(color / step + 0.5) * step;
        }
        
        // Ordered Bayer dithering
        vec3 ditherBayer(vec3 color, vec2 fragCoord, float levels) {
            float threshold = bayerMatrix(fragCoord) - 0.5;
            float step = 1.0 / (levels - 1.0);
            vec3 dithered = color + threshold * step;
            return quantize(dithered, levels);
        }
        
        // Floyd-Steinberg approximation (single-pass fragment shader simulation)
        vec3 ditherFloydSteinberg(vec3 color, vec2 uv, float levels) {
            vec2 texel = 1.0 / u_resolution;
            
            // Get error from neighboring pixels (approximation)
            vec3 right = texture(u_image, uv + vec2(texel.x, 0.0)).rgb;
            vec3 below = texture(u_image, uv + vec2(0.0, texel.y)).rgb;
            vec3 belowRight = texture(u_image, uv + vec2(texel.x, texel.y)).rgb;
            
            // Compute quantization
            vec3 quantized = quantize(color, levels);
            
            // Estimate error from neighbors
            vec3 errorRight = (right - quantize(right, levels)) * 7.0/16.0;
            vec3 errorBelow = (below - quantize(below, levels)) * 5.0/16.0;
            vec3 errorBelowRight = (belowRight - quantize(belowRight, levels)) * 1.0/16.0;
            
            // Blend in estimated error
            vec3 result = color + (errorRight + errorBelow + errorBelowRight) * 0.3;
            return quantize(result, levels);
        }
        
        // Atkinson dithering (higher contrast, used in early Macs)
        vec3 ditherAtkinson(vec3 color, vec2 fragCoord, float levels) {
            // Atkinson uses 6/8ths of error, giving higher contrast
            float threshold = bayerMatrix(fragCoord) - 0.375; // More aggressive threshold
            float step = 1.0 / (levels - 1.0);
            vec3 dithered = color + threshold * step * 1.5;
            return quantize(dithered, levels);
        }
        
        // Random noise dithering
        vec3 ditherRandom(vec3 color, vec2 fragCoord, float levels) {
            // Use noise function for random threshold
            float noise = fract(sin(dot(fragCoord, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
            float step = 1.0 / (levels - 1.0);
            vec3 dithered = color + noise * step;
            return quantize(dithered, levels);
        }
        
        // Main dithering dispatcher
        vec3 applyDithering(vec3 color, vec2 uv, vec2 fragCoord, int type, float depth, float strength) {
            if (type == 0 || strength <= 0.0) return color;
            
            float levels = pow(2.0, depth); // 2^depth levels per channel
            vec3 dithered;
            
            if (type == 1) {
                dithered = ditherFloydSteinberg(color, uv, levels);
            } else if (type == 2) {
                dithered = ditherAtkinson(color, fragCoord, levels);
            } else if (type == 3) {
                dithered = ditherBayer(color, fragCoord, levels);
            } else if (type == 4) {
                dithered = ditherRandom(color, fragCoord, levels);
            } else {
                dithered = color;
            }
            
            // Blend based on strength
            float blend = strength / 100.0;
            return mix(color, dithered, blend);
        }
        
        vec3 applySharpen(sampler2D tex, vec2 uv, float amount) {
            if (amount <= 0.0) return texture(tex, uv).rgb;
            
            float s = amount / 100.0 * 2.0;
            vec2 texel = 1.0 / u_resolution;
            
            vec3 center = texture(tex, uv).rgb;
            vec3 blur = vec3(0.0);
            
            blur += texture(tex, uv + vec2(-texel.x, -texel.y)).rgb;
            blur += texture(tex, uv + vec2( 0.0,     -texel.y)).rgb;
            blur += texture(tex, uv + vec2( texel.x, -texel.y)).rgb;
            blur += texture(tex, uv + vec2(-texel.x,  0.0)).rgb;
            blur += texture(tex, uv + vec2( texel.x,  0.0)).rgb;
            blur += texture(tex, uv + vec2(-texel.x,  texel.y)).rgb;
            blur += texture(tex, uv + vec2( 0.0,      texel.y)).rgb;
            blur += texture(tex, uv + vec2( texel.x,  texel.y)).rgb;
            blur /= 8.0;
            
            return center + (center - blur) * s;
        }

        vec3 applyOverlay(vec3 base, vec2 uv, sampler2D overlayTex, bool use, float opacity, int mode) {
            if (!use || opacity <= 0.0) return base;
            
            vec4 overlay = texture(overlayTex, uv);
            vec3 blend = overlay.rgb;
            
            vec3 result = base;
            
            if (mode == 1) { 
                // Multiply
                result = base * blend;
            } else if (mode == 2) {
                // Screen
                result = 1.0 - (1.0 - base) * (1.0 - blend);
            } else if (mode == 3) {
                // Overlay
                vec3 r;
                if (base.r < 0.5) r.r = 2.0 * base.r * blend.r;
                else r.r = 1.0 - 2.0 * (1.0 - base.r) * (1.0 - blend.r);
                
                if (base.g < 0.5) r.g = 2.0 * base.g * blend.g;
                else r.g = 1.0 - 2.0 * (1.0 - base.g) * (1.0 - blend.g);
                
                if (base.b < 0.5) r.b = 2.0 * base.b * blend.b;
                else r.b = 1.0 - 2.0 * (1.0 - base.b) * (1.0 - blend.b);
                
                result = r;
            } else {
                // Normal
                result = blend;
            }
            
            return mix(base, result, opacity);
        }
        
        // Helper for Tilt Shift Blur
        vec3 applyTiltShift(vec3 c, vec2 uv) {
            if (u_tiltShiftBlur <= 0.0) return c;

            // 1. Calculate Blur Mask (0.0 = Sharp, 1.0 = Blurry)
            float dist = abs(uv.y - u_tiltShiftPos);
            
            // Sharp zone: from center to focusWidth/2
            float halfWidth = u_tiltShiftFocusWidth * 0.5;
            float blurAmount = smoothstep(halfWidth, halfWidth + u_tiltShiftGradient, dist);
            
            // If sharp, return original
            if (blurAmount <= 0.01) return c;

            // 2. Variable Blur Loop
            float radius = u_tiltShiftBlur * blurAmount;
            
            vec3 acc = c; 
            float totalWeight = 1.0;
            vec2 texel = 1.0 / u_resolution;
            
            // 8-tap Cross-Diagonal Pattern
            vec2 offsets[8];
            offsets[0] = vec2(0.0, 1.0);
            offsets[1] = vec2(0.0, -1.0);
            offsets[2] = vec2(1.0, 0.0);
            offsets[3] = vec2(-1.0, 0.0);
            offsets[4] = vec2(0.7, 0.7);
            offsets[5] = vec2(-0.7, -0.7);
            offsets[6] = vec2(-0.7, 0.7);
            offsets[7] = vec2(0.7, -0.7);

            for (int i = 0; i < 8; i++) {
                vec2 sampleUV = uv + offsets[i] * radius * texel;
                acc += texture(u_image, sampleUV).rgb;
                totalWeight += 1.0;
                
                // Second ring at 50% radius for better core coverage
                sampleUV = uv + offsets[i] * radius * 0.5 * texel;
                acc += texture(u_image, sampleUV).rgb;
                totalWeight += 1.0;
            }
            
            return acc / totalWeight;
        }

        // ============ MAIN ============
        
        void main() {
            vec2 uv = v_texCoord;
            
            // Before/After toggle - show original without any adjustments
            if (u_showOriginal) {
                fragColor = texture(u_image, uv);
                return;
            }
            
            // === UV DISTORTIONS (Phase 7) ===
            // Apply barrel distortion and film gate weave before sampling
            uv = applyBarrelDistortion(uv, u_barrelDistortion);
            uv = applyFilmGateWeave(uv, u_filmGateWeave, u_time);
            
            // Clamp UV to prevent sampling outside image
            uv = clamp(uv, 0.0, 1.0);
            
            // Sample with optional sharpening
            vec3 color = applySharpen(u_image, uv, u_sharpness);
            
            // === AI DENOISE (before other adjustments) ===
            // Apply early to prevent noise amplification by later adjustments
            color = applyDenoise(color, uv, u_denoise);
            
            // === TONE CURVE (before other adjustments) ===
            color = applyToneCurve(color, u_toneCurveLUT, u_useToneCurve);
            
            // === FILM DENSITY MODEL (Subtractive) ===
            // Replaces: Exposure, Contrast, Saturation with Density Math
            // "Density" means removing light. 
            // - Saturation increases dye density (darker, richer)
            // - Exposure scales overall density
            
            // 1. Initial RGB -> CMY
            // Apply standard linear Exposure first for dynamic range compensation?
            // No, user requested physics-based model.
            // But we still need "Brightness" control. 
            // Let's mix standard exposure for utility with density for color.
            
            color = applyDensity(color, u_exposure, u_saturation);
            
            // Standard Contrast (S-Curve still applies to film)
            color = applyContrast(color, u_contrast);
            
            // Tonal Compression
            color = applyHighlights(color, u_highlights);
            color = applyShadows(color, u_shadows);
            color = applyWhites(color, u_whites);
            color = applyBlacks(color, u_blacks);
            
            // === ATMOSPHERE (Dehaze & Clarity) ===
            color = applyDehaze(color, u_dehaze);
            color = applyClarity(color, uv, u_clarity);
            
            // === COLOR ADJUSTMENTS ===
            color = applyTemperature(color, u_temperature);
            color = applyTint(color, u_tint);
            color = applyVibrance(color, u_vibrance);
            // === COLOR GRADING (3-WAY) ===
            color = applyColorGrading(color, 
                u_splitHighlightHue, u_splitHighlightSat,
                u_splitMidtoneHue,   u_splitMidtoneSat, 
                u_splitShadowHue,    u_splitShadowSat, 
                u_splitBalance);
            
            // === HSL MIXER ===
            color = applyHSLMixer(color);

            // === CUSTOM 3D LUT ===
            // Applied after color grading but before texture/grain
            if (u_useLUT) {
                vec3 lutColor = texture(u_lut3d, color).rgb;
                color = mix(color, lutColor, u_lutOpacity);
            }

            // === NEW FX (Phase 7) ===
            // Diffusion now handled in post-pass for higher quality (Bloom 2.0)

            // === ASCII ===
            if (u_asciiSize > 0.01) {
                float density = (u_asciiSize * 400.0); // 0-2 -> 0-800 chars width
                if (density < 10.0) density = 10.0;

                vec2 charGrid = vec2(density, density * (u_resolution.y / u_resolution.x) * 1.5); // Aspect adjustment
                
                vec2 charPos = floor(uv * charGrid) / charGrid;
                vec2 charUV = fract(uv * charGrid);
                
                // Sample processed color at cell center for quantization
                vec3 cellColor = color; 
                // Since we are in a single pass, we use the color calculated so far for *this* pixel
                // effectively "smearing" the color across the whole character cell.
                
                float gray = luminance(cellColor);
                
                // Enhanced Grayscale Ramp (16 steps)
                int idx = int(gray * 15.99);
                float isChar = getCharacter(idx, charUV);
                
                // Color Logic
                vec3 asciiColor = cellColor; // Mode 0: Original
                
                if (u_asciiMode == 1) {
                    // Matrix Green
                    asciiColor = vec3(0.0, 1.0, 0.3) * gray;
                    // Add slight random flicker
                    asciiColor *= 0.8 + 0.2 * sin(u_time * 10.0 + charPos.x * 100.0);
                } else if (u_asciiMode == 2) {
                    // Amber Terminal
                    asciiColor = vec3(1.0, 0.7, 0.1) * gray;
                } else if (u_asciiMode == 3) {
                    // B&W
                    asciiColor = vec3(gray);
                } else if (u_asciiMode == 4) {
                    // Custom
                    asciiColor = u_asciiColor * gray;
                }
                
                // Shimmer/Scanline effect
                float shimmer = 0.95 + 0.05 * sin(charUV.y * 10.0 + u_time * 5.0);
                
                color = isChar * asciiColor * shimmer;
                
                // Background Detail (Faint original image or black)
                float bgMask = 1.0 - isChar;
                color += bgMask * cellColor * 0.05; // 5% background bleed
            }

            // === TEXTURE OVERLAY ===
            color = applyOverlay(color, uv, u_overlayTexture, u_useOverlay, u_overlayOpacity, u_overlayBlendMode);

            
            // === EFFECTS ===
            color = applyGrain(color, uv, u_grainShadow, u_grainHighlight, u_grainSize);
            
            // Chromatic Aberration (Lens Fringing)
            if (u_chromaticAberration > 0.0) {
                float dist = length(uv - 0.5) * 2.0; // 0 to 1 from center to corner
                // Non-linear distortion strength (stronger at edges)
                float strength = u_chromaticAberration / 100.0 * 0.02 * (dist * dist);
                
                // Shift Red out, Blue in
                float cR = texture(u_image, uv - (uv - 0.5) * strength).r;
                float cB = texture(u_image, uv + (uv - 0.5) * strength).b;
                
                color.r = cR;
                color.b = cB;
            }

            color = applyVignette(color, uv, u_vignette);
            color = applyFade(color, u_fade);
            
            // 5. Selective Color (Phase 2 Creative)
            color = applySelectiveColor(color);

            // === LOGARITHMIC HIGHLIGHT ROLL-OFF ===
            // Soft-clip highlights instead of hard clamp
            color = logShoulder(color);
            
            // Phase 7: Distortion
            color.rgb = applyPosterize(color.rgb, u_posterize);
            
            // Phase 8: Spectral Imaging (Thermal/Aerochrome)
            color.rgb = applySpectralImaging(color.rgb, u_thermalMode, u_thermalIntensity);

            // Final safety clamp
            color = clamp(color, 0.0, 1.0);

            // === OUTPUT TRANSFORM (PRINT STOCK) ===
            if (u_outputTransform == 1) {
                // Kodak Vision 2383 Emulation
                // 1. Contrast: Strong S-Curve with crushed blacks
                // 2. Color: Teal Shadows, Golden Highlights
                
                // Contrast
                color = (color - 0.5) * 1.15 + 0.5;
                
                // Subtractive CMY Color Grading
                float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
                
                // Shadows: Add Cyan/Blue (Teal)
                // Highlights: Add Red/Yellow (Gold)
                vec3 shadowTint = vec3(-0.05, 0.02, 0.05);  // Cool
                vec3 highlightTint = vec3(0.05, 0.02, -0.05); // Warm
                
                vec3 tint = mix(shadowTint, highlightTint, lum);
                color += tint * 0.5; // Strength
                
                // Gamut compression (Slight desaturation of blues)
                float sat = 0.9;
                float gray = dot(color, vec3(0.2126, 0.7152, 0.0722));
                color = mix(vec3(gray), color, sat);
                
            } else if (u_outputTransform == 2) {
                // Fujifilm 3513 Emulation
                // 1. Contrast: Softer, more open shadows
                // 2. Color: Magenta/Green bias (Fuji Green)
                
                // Contrast
                color = (color - 0.5) * 1.08 + 0.5;
                
                // Fuji Greens in shadows, Magenta in Mids
                float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
                
                // Shadows: Greenish
                // Mids: Pink/Magenta
                // Highlights: Neutral/Cyan
                
                vec3 shadowTint = vec3(-0.02, 0.04, -0.02);
                vec3 midTint = vec3(0.03, -0.02, 0.03);
                
                // Parabolic midtone mask
                float midMask = 1.0 - abs(lum - 0.5) * 2.0;
                float shadowMask = 1.0 - smoothstep(0.0, 0.6, lum);
                
                color += shadowTint * shadowMask * 0.4;
                color += midTint * midMask * 0.3;
            }
            
            // Re-clamp after transforms
            color = clamp(color, 0.0, 1.0);

            // === DITHERING ===
            // Apply after all other processing, before clipping warnings
            vec2 fragCoord = uv * u_resolution;
            color = applyDithering(color, uv, fragCoord, u_ditherType, u_ditherDepth, u_ditherStrength);
            
            // === CLIPPING WARNINGS ===
            // Show red for blown highlights (>0.99), blue for crushed blacks (<0.01)
            if (u_showClipping) {
                float maxC = max(color.r, max(color.g, color.b));
                float minC = min(color.r, min(color.g, color.b));
                
                // Blown highlights - flash red
                if (maxC > 0.99) {
                    color = vec3(1.0, 0.0, 0.0);
                }
                // Crushed blacks - flash blue
                else if (minC < 0.01) {
                    color = vec3(0.0, 0.0, 1.0);
                }
            }
            
            fragColor = vec4(color, 1.0);
        }
    `,

    // Phase 3: Halation - Threshold Pass
    thresholdFragment: `#version 300 es
        precision highp float;
        
        uniform sampler2D u_image;
        uniform float u_threshold;
        uniform float u_mist; // Mist strength (0-1)
        
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        void main() {
            vec4 color = texture(u_image, v_texCoord);
            
            // Halation Physics: Most prominent in the red layer
            float brightness = color.r * 0.7 + color.g * 0.2 + color.b * 0.1;
            
            // Mist logic: If mist is high, we lower the threshold effectively
            float effectiveThreshold = mix(u_threshold, 0.0, u_mist * 0.5);
            
            // Soft threshold knee
            float knee = 0.1;
            float soft = brightness - effectiveThreshold + knee;
            soft = clamp(soft, 0.0, 2.0 * knee);
            soft = soft * soft / (4.0 * knee);
            
            float contribution = max(soft, brightness - effectiveThreshold);
            
            // Color the contribution: Halation/Bloom/Mist
            vec3 glowColor = color.rgb * contribution;
            
            // If mist is active, we also add a bit of un-thresholded "glow" based on local color
            glowColor += color.rgb * u_mist * 0.1;
            
            // For Halation, we target Red
            glowColor.r *= 1.1;
            glowColor.g *= 0.95;
            glowColor.b *= 0.9;
            
            fragColor = vec4(glowColor, 1.0);
        }
    `,

    // Phase 3: Halation - Blur Pass (Separable Gaussian)
    blurFragment: `#version 300 es
        precision highp float;
        
        uniform sampler2D u_image;
        uniform vec2 u_resolution;
        uniform vec2 u_direction; // (1.0, 0.0) or (0.0, 1.0)
        
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        void main() {
            vec2 off1 = vec2(1.3846153846) * u_direction;
            vec2 off2 = vec2(3.2307692308) * u_direction;
            
            vec3 color = texture(u_image, v_texCoord).rgb * 0.2270270270;
            
            color += texture(u_image, v_texCoord + (off1 / u_resolution)).rgb * 0.3162162162;
            color += texture(u_image, v_texCoord - (off1 / u_resolution)).rgb * 0.3162162162;
            
            color += texture(u_image, v_texCoord + (off2 / u_resolution)).rgb * 0.0702702703;
            color += texture(u_image, v_texCoord - (off2 / u_resolution)).rgb * 0.0702702703;
            
            fragColor = vec4(color, 1.0);
        }
    `,

    // Phase 3: Bloom/Halation Composite Pass
    compositeFragment: `#version 300 es
        precision highp float;
        
        uniform sampler2D u_image; // Original image (from first pass)
        uniform sampler2D u_bloom; // Blurred highlights
        uniform sampler2D u_grainTexture; // Scanned grain texture (Grain 2.0)
        uniform sampler2D u_originalImage; // Raw UNEDITED image (for split view)
        
        // Split View
        uniform float u_splitPos; // -1.0 = off, 0.0 to 1.0 = position
        
        // Geometry (for original image sampling in split view)
        uniform float u_contentRotation;
        uniform float u_contentFlipX;
        uniform float u_contentFlipY;
        
        // Bloom/Halation/Mist
        uniform float u_amount;      // Bloom/Halation Strength
        uniform vec3 u_tint;         // Bloom Color (White for Glow, Pink for Halation)
        
        // Grain (Moved here to be ON TOP of Bloom)
        uniform float u_grainShadow;
        uniform float u_grainHighlight;
        uniform float u_grainSize;
        uniform float u_grainGlobal; // Main Multiplier
        uniform int u_grainType;     // 0=Digital(Uniform/Mix), 1=Negative, 2=Slide
        // Secret FX Uniforms
        uniform float u_pixelateSize; // 0 = off, > 0 = pixel size
        uniform float u_glitchStrength;
        uniform float u_ditherStrength;
        uniform float u_scanlineIntensity;
        
        // Analog Engine (Missing Declarations)
        uniform float u_filmGateWeave;
        uniform float u_filmSeed;
        uniform bool u_galleryFrame;
        
        // Dust & Scratches
        uniform sampler2D u_dustTexture;
        uniform float u_dustIntensity;
        
        uniform vec2 u_resolution;
        uniform float u_time;
        
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        // --- Helpers ---
        float luminance(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
        
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        // Dithering Engine
        float dither4x4(vec2 position, float brightness) {
            int x = int(mod(position.x, 4.0));
            int y = int(mod(position.y, 4.0));
            int index = x + y * 4;
            float limit = 0.0;
            if (x < 8) {
              if (index == 0) limit = 0.0625;
              if (index == 1) limit = 0.5625;
              if (index == 2) limit = 0.1875;
              if (index == 3) limit = 0.6875;
              if (index == 4) limit = 0.8125;
              if (index == 5) limit = 0.3125;
              if (index == 6) limit = 0.9375;
              if (index == 7) limit = 0.4375;
              if (index == 8) limit = 0.25;
              if (index == 9) limit = 0.75;
              if (index == 10) limit = 0.125;
              if (index == 11) limit = 0.625;
              if (index == 12) limit = 1.0;
              if (index == 13) limit = 0.5;
              if (index == 14) limit = 0.875;
              if (index == 15) limit = 0.375;
            }
            return brightness < limit ? 0.0 : 1.0;
        }

        // Tilt-Shift Global Uniforms for Composite
        uniform float u_tiltShiftBlur;      // Max blur radius (0-50)
        uniform float u_tiltShiftPos;       // Center Y (0.0 - 1.0)
        uniform float u_tiltShiftFocusWidth;// Width of sharp area (0.0 - 1.0)
        uniform float u_tiltShiftGradient;  // Falloff (0.0 - 1.0)

        vec3 applyTiltShift(vec3 c, vec2 uv) {
            float blurRadius = u_tiltShiftBlur;
            if (blurRadius <= 0.0) return c;

            // 1. Calculate Blur Mask (0.0 = Sharp, 1.0 = Blurry)
            float dist = abs(uv.y - u_tiltShiftPos);
            float halfWidth = u_tiltShiftFocusWidth * 0.5;
            float blurAmount = smoothstep(halfWidth, halfWidth + max(u_tiltShiftGradient, 0.001), dist);
            
            if (blurAmount <= 0.01) return c;

            // 2. Variable Blur Loop (17-tap distribution)
            float radius = blurRadius * blurAmount;
            vec2 texel = 1.0 / u_resolution;
            
            vec3 acc = c; 
            float totalWeight = 1.0;
            
            // Fixed sample directions (8 directions)
            const float PI = 3.14159265;
            for (int i = 0; i < 8; i++) {
                float angle = float(i) * (PI * 0.25);
                vec2 dir = vec2(cos(angle), sin(angle));
                
                // Sample at full radius
                acc += texture(u_image, uv + dir * radius * texel).rgb;
                totalWeight += 1.0;
                
                // Sample at 50% radius for better fill
                acc += texture(u_image, uv + dir * radius * 0.5 * texel).rgb;
                totalWeight += 1.0;
            }
            
            return acc / totalWeight;
        }
        
        vec3 applyGrain(vec3 c, vec2 uv, float shadowAmt, float highlightAmt, float size, float globalMult, int type) {
            if (globalMult <= 0.0) return c;
            
            float lum = luminance(c);
            float intensity = 0.0;

            if (type == 1) {
                // Negative Film: Visible in Shadows/Mids, cleaner in Highlights
                // Curve: High -> High -> Drop off
                intensity = (1.0 - pow(lum, 2.5)) * globalMult;
                // Allow shadow slider to boost/cut the base intensity
                intensity *= (shadowAmt / 50.0); 
            } else if (type == 2) {
                // Slide Film: Visible in Mids, cleaner in Shadows/Highlights
                // Curve: Low -> High -> Low (Parabola)
                // 1.0 - |x - 0.5|*2 is linear triangle. Let's use smooth sin or parabola.
                // 4.0 * x * (1.0 - x) is a standard parabola 0->1->0
                intensity = (4.0 * lum * (1.0 - lum)) * globalMult;
                // Allow global to control peak
            } else {
                // Digital / Uniform (Type 0) - Original Logic
                // Mix between shadow and highlight amounts
                intensity = mix(shadowAmt, highlightAmt, lum);
                intensity *= globalMult;
            }
            
            // Scale down to usable range (0 - 100 -> 0.0 - 0.2)
            intensity *= 0.002;
            
            if (intensity <= 0.0001) return c;
            
            // Generate Noise
            vec2 grainUV = uv * u_resolution / (size > 0.1 ? size : 1.0);
            float noise = random(grainUV + fract(u_time * 0.1));
            
            // Additive Noise centered at 0
            float n = noise - 0.5;
            
            return c + n * intensity;
        }

        void main() {
            vec2 uv = v_texCoord;
            
            // 0. Film Gate Weave (UV Offset)
            if (u_filmGateWeave > 0.0) {
                 float weaveStrength = u_filmGateWeave; // 0-100
                 float time = u_time * 2.0;
                 // Jitter x position
                 float weave = sin(time + u_filmSeed * 10.0) * 0.001 * weaveStrength;
                 // Minimal y jitter
                 float bounce = cos(time * 0.5 + u_filmSeed * 20.0) * 0.0005 * weaveStrength;
                 uv += vec2(weave, bounce);
            }

            // 1. Pixelate (Modifies UV)
            if (u_pixelateSize > 0.0) {
                float dx = u_pixelateSize * (1.0 / u_resolution.x);
                float dy = u_pixelateSize * (1.0 / u_resolution.y);
                vec2 coord = vec2(dx * floor(uv.x / dx), dy * floor(uv.y / dy));
                uv = coord;
            }

            // 2. Glitch (RGB Split / Displacement)
            vec3 glitchResult;
            if (u_glitchStrength > 0.0) {
                float strength = u_glitchStrength / 100.0;
                float time = u_time * 2.0;
                
                // Random jitter
                float jitter = random(vec2(time, uv.y)) * 2.0 - 1.0;
                jitter *= step(0.98, random(vec2(time, uv.y * 10.0))); // Only occur on 2% of lines
                
                vec2 glitchUV = uv + vec2(jitter * strength * 0.1, 0.0);
                
                // RGB Split
                float r = texture(u_image, glitchUV + vec2(strength * 0.01, 0.0)).r;
                float g = texture(u_image, glitchUV).g;
                float b = texture(u_image, glitchUV - vec2(strength * 0.01, 0.0)).b;
                glitchResult = vec3(r, g, b);
            } else {
                glitchResult = texture(u_image, uv).rgb;
            }

            // 3. Tilt-Shift (Blur) - Apply before Bloom
            vec3 processedColor = applyTiltShift(glitchResult, uv);
            // double check for null access? No, processedColor is vec3.

            // 3b. Bloom Composition
            vec3 bloom = texture(u_bloom, uv).rgb;
            
            // Add Bloom (Screen or Linear Dodge?)
            // Linear Dodge (Add) is standard physically, but Screen is safer
            // mix(base, white, start) -> tinting
            
            // Apply Tint to Bloom first
            vec3 tintedBloom = bloom * u_tint;
            
            // Additive Blend
            vec3 color = processedColor + (tintedBloom * (u_amount / 100.0));
            
            // 4. Grain
            // If we have a texture and it's Grain 2.0 (type 3), use it
            if (u_grainType == 3) {
                // Randomize UV for each frame to animate the grain
                vec2 grainJitter = vec2(random(vec2(u_time, u_filmSeed)), random(vec2(u_filmSeed, u_time)));
                vec2 grainUV = uv * (u_resolution / (u_grainSize * 512.0)) + grainJitter;
                
                vec3 gTex = texture(u_grainTexture, grainUV).rgb;
                float g = (gTex.r + gTex.g + gTex.b) / 3.0 - 0.5;
                
                float lum = luminance(color);
                float intensity = (1.0 - pow(lum, 1.5)) * u_grainGlobal * (u_grainShadow / 50.0);
                
                color += g * intensity * 0.15; // Increased scale for Analog mode
            } else {
                color = applyGrain(color, uv, u_grainShadow, u_grainHighlight, u_grainSize, u_grainGlobal, u_grainType);
            }
            
            // 5. Dust & Scratches 2.0
            if (u_dustIntensity > 0.0) {
                // Offset dust UV by filmSeed for variation
                vec2 dustUV = uv + vec2(random(vec2(u_filmSeed, 0.0)), random(vec2(0.0, u_filmSeed)));
                vec3 dust = texture(u_dustTexture, dustUV).rgb;
                // Additive/Screen blend for dust/scratches
                color = color + (dust * (u_dustIntensity / 100.0));
            }
            
            // 5. Selective Color (Phase 2 Creative)
            // Removed: applySelectiveColor is not available in composite pass
            // color = applySelectiveColor(color.rgb);

            // 6. Scanlines
            if (u_scanlineIntensity > 0.0) {
                float intensity = u_scanlineIntensity / 100.0;
                float count = u_resolution.y * 0.5; // Every other pixel roughly
                float scanline = sin(uv.y * count * 3.14159 * 2.0);
                // Map -1..1 to 1-intensity..1
                // 0.5 + 0.5*sin -> 0..1
                // We want dark lines. 
                // scanline = 0 -> darken. 
                color *= 1.0 - (0.5 * (scanline + 1.0)) * intensity; 
            }

            // 6. Dithering (Bit Crush)
            if (u_ditherStrength > 0.0) {
                float strength = u_ditherStrength / 100.0; // 0 to 1
                
                // Convert to greyscale for dither threshold
                float lum = luminance(color);
                
                // Get dither threshold from matrix
                // We need pixel coordinates
                vec2 pixelCoord = uv * u_resolution;
                float threshold = dither4x4(pixelCoord, lum);
                
                // 1-bit or restricted palette?
                // Let's do 1-bit style mixed with original
                vec3 binary = vec3(step(threshold, lum)); // 0 or 1
                
                // Or maybe color dither?
                // For CGA style: round to nearest palette color?
                // Let's just do black/white dither mixed with color
                
                color = mix(color, binary, strength);
            }

            // 8. Gallery Frame
            if (u_galleryFrame) {
                // White border
                float borderW = 0.05; // 5% width
                float borderH = borderW * u_resolution.x / u_resolution.y; // Maintain aspect ratio thickness
                
                if (uv.x < borderW || uv.x > 1.0 - borderW || uv.y < borderH || uv.y > 1.0 - borderH) {
                    color = vec3(0.98); // Off-white
                }
            }

            fragColor = vec4(color, 1.0);

            // 9. Split View (Before/After)
            if (u_splitPos >= 0.0) {
                // Determine if we are on the "original" side (left)
                if (v_texCoord.x < u_splitPos) {
                    // Sample from original image
                    // We need to apply basic flip/rotate to match the processed side geometry
                    vec2 origUV = v_texCoord;
                    
                    // Simple flip logic if needed
                    if (u_contentFlipX > 0.5) origUV.x = 1.0 - origUV.x;
                    if (u_contentFlipY > 0.5) origUV.y = 1.0 - origUV.y;
                    
                    fragColor = texture(u_originalImage, origUV);
                }
                
                // Draw vertical divider line
                float dist = abs(v_texCoord.x - u_splitPos);
                if (dist < 0.001) {
                    fragColor = vec4(1.0, 1.0, 1.0, 1.0); // White line
                }
            }
        }
    `,
    // Mask Generation (Phase 4)
    maskFragment: `#version 300 es
        precision highp float;
        
        uniform vec2 u_resolution;
        uniform int u_type; // 0=Radial, 1=Linear
        uniform vec2 u_start; // Center (0-1) or Line Start
        uniform vec2 u_end;   // Radius point (0-1) or Line End
        uniform float u_feather;
        uniform bool u_invert;
        
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        void main() {
            vec2 uv = gl_FragCoord.xy / u_resolution;
            // Correct for aspect ratio to ensure circles are circles
            float aspect = u_resolution.x / u_resolution.y;
            vec2 uvCorr = vec2(uv.x * aspect, uv.y);
            vec2 startCorr = vec2(u_start.x * aspect, u_start.y);
            vec2 endCorr = vec2(u_end.x * aspect, u_end.y);
            
            float mask = 0.0;
            
            if (u_type == 0) { // Radial
                float dist = distance(uvCorr, startCorr);
                float radius = distance(startCorr, endCorr);
                
                // Smooth transition around the radius
                // Standard: Inside 100%, fading to 0% at edge?
                // Or: Center 100%, fading to 0% at radius?
                // Typically: Center is 100%. Radius is 0%. (Gradient)
                // Re-reading logic: Linear Gradient vs Radial Gradient.
                
                // Let's implement Soft Circle:
                // 1.0 at center, 0.0 at radius.
                float t = dist / (radius + 0.0001);
                // Inverse for fill (1 at center)
                // Smoothstep for feathering
                float feather = max(0.01, u_feather);
                mask = 1.0 - smoothstep(1.0 - feather, 1.0 + feather, t);
                
            } else { // Linear
                vec2 line = endCorr - startCorr;
                float len = length(line);
                vec2 dir = line / (len + 0.0001);
                
                vec2 pt = uvCorr - startCorr;
                float proj = dot(pt, dir);
                
                // Normalize 0 to 1 along the line
                float t = proj / (len + 0.0001);
                
                float feather = max(0.01, u_feather);
                mask = 1.0 - smoothstep(1.0 - feather, 1.0 + feather, t);
            }
            
            mask = clamp(mask, 0.0, 1.0);
            if (u_invert) mask = 1.0 - mask;
             
            fragColor = vec4(mask, mask, mask, 1.0);
        }
    `,

    // Mask Composite (Phase 4)
    maskCompositeFragment: `#version 300 es
        precision highp float;
        
        uniform sampler2D u_base;
        uniform sampler2D u_local;
        uniform sampler2D u_mask;
        
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        void main() {
            vec4 base = texture(u_base, v_texCoord);
            vec4 local = texture(u_local, v_texCoord);
            float mask = texture(u_mask, v_texCoord).r;
            
            fragColor = mix(base, local, mask);
        }
    `,

    // Mask Overlay (Rubylith) - Phase 5
    maskOverlayFragment: `#version 300 es
        precision highp float;
        
        uniform sampler2D u_mask;
        
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        void main() {
            float mask = texture(u_mask, v_texCoord).r;
            
            if (mask < 0.01) discard; // Optimization
            
            // Rubylith Red: Strong Red with some transparency
            vec4 overlayColor = vec4(1.0, 0.0, 0.0, 0.4); 
            
            // Output premultiplied alpha or handled by blending?
            // Usually blending is GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA
            fragColor = overlayColor * mask; 
        }
    `,

    // Phase 5: Vibe Module (Borders & Textures)
    vibeFragment: `#version 300 es
        precision highp float;
        
        uniform sampler2D u_image;
        uniform sampler2D u_borderTexture;
        uniform bool u_hasBorder;
        uniform sampler2D u_dustTexture;
        uniform float u_dustIntensity;
        
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        void main() {
            vec4 color = texture(u_image, v_texCoord);
            
            // 1. Dust/Scratches (Screen Blend)
            if (u_dustIntensity > 0.0) {
                vec4 dust = texture(u_dustTexture, v_texCoord);
                color += dust * u_dustIntensity;
            }
            
            // 2. Border (Multiply/Alpha)
            if (u_hasBorder) {
                vec4 border = texture(u_borderTexture, v_texCoord);
                color = mix(color, border, border.a);
            }
            
            fragColor = color;
        }
    `,
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Shaders;
}
