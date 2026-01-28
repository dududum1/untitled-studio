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
        
        out vec2 v_texCoord;
        
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `,

    // Main Fragment Shader - All adjustments in single pass for performance
    fragment: `#version 300 es
        precision highp float;
        
        uniform sampler2D u_image;
        uniform sampler2D u_toneCurveLUT;  // 256x1 LUT texture for tone curve
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
        uniform float u_splitShadowHue;
        uniform float u_splitShadowSat;
        uniform float u_splitBalance;
        
        // Tone Curve
        uniform bool u_useToneCurve;
        uniform int u_toneCurveChannel; // 0=RGB, 1=R, 2=G, 3=B
        
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

        uniform float u_filmSeed;

        // Custom LUT
        uniform mediump sampler3D u_lut3d;
        uniform bool u_useLUT;
        uniform float u_lutOpacity;

        // ASCII
        uniform float u_asciiSize; // 0.0 to 2.0 (density)
        
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        // ============ FILM SCIENCE MATH ============
        
        // Procedural 3x5 font (numbers + punct)
        // Returns 1.0 if pixel is part of char, 0.0 otherwise
        float getCharacter(int n, vec2 p) {
            // p is 0..1 inside the char cell
            // map to 3x5 grid
            int x = int(p.x * 3.0);
            int y = int((1.0 - p.y) * 5.0); // flip y for bit reading
            
            if (x < 0 || x > 2 || y < 0 || y > 4) return 0.0;
            
            // Bitmask for chars (very simplified set: . : ; + * % @ #)
            // 15 bits per char (3 cols * 5 rows)
            
            int bits = 0;
            
            if (n == 0) bits = 0;     // space
            if (n == 1) bits = 4096;  // . (bottom left-ish) -> actually let's use int array logic 
            // Reuse logic: rows top to bottom
            
            // 8 levels of brightness
            // 0: space
            if (n == 1) bits = 2; // . (very bottom)
            if (n == 2) bits = 10; // :
            if (n == 3) bits = 21546; // - 
            if (n == 4) bits = 4658; // +
            if (n == 5) bits = 11111; // * (placeholder) -> let's try 15 bits integer
            
            // Let's use a simpler "density" check for 3x5
            // 15 pixels. 
            // n=0 (dark) -> 0 pixels
            // n=1 .. n=7 (bright)
            
            // Simpler: Just hardcode a few shapes manually
            // n is brightness level 0..7
            
            if (n == 0) return 0.0;
            
            // .
            if (n == 1) {
                if (x==1 && y==4) return 1.0;
            }
            // :
            if (n == 2) {
                if (x==1 && (y==1 || y==4)) return 1.0;
            }
            // ;
            if (n == 3) {
                if (x==1 && (y==1 || y==4 || y==3)) return 1.0;
            }
            // +
            if (n == 4) {
                 if ((x==1 && y>0 && y<4) || (y==2)) return 1.0;
            }
            // o
            if (n == 5) {
                if (y==0 || y==4 || x==0 || x==2) return 1.0;
            }
            // #
            if (n == 6) {
                if (x==1 || y==1 || y==3) return 1.0;
            }
            // @ (fill)
            if (n == 7) {
                return 1.0;
            }
            
            return 0.0;
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
            // But usually Exposure slider means Brightness. 
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
        
        // Split Toning - color grading for highlights and shadows separately
        vec3 applySplitToning(vec3 c, float highlightHue, float highlightSat, float shadowHue, float shadowSat, float balance) {
            if (highlightSat <= 0.0 && shadowSat <= 0.0) return c;
            
            float lum = luminance(c);
            
            // Create highlight and shadow color from hue
            vec3 highlightColor = hsl2rgb(vec3(highlightHue / 360.0, 1.0, 0.5));
            vec3 shadowColor = hsl2rgb(vec3(shadowHue / 360.0, 1.0, 0.5));
            
            // Balance shifts the midpoint (0 = even, negative = more shadows, positive = more highlights)
            float balanceShift = balance / 100.0 * 0.25;
            float midpoint = 0.5 + balanceShift;
            
            // Calculate masks
            float highlightMask = smoothstep(midpoint - 0.1, midpoint + 0.3, lum);
            float shadowMask = 1.0 - smoothstep(midpoint - 0.3, midpoint + 0.1, lum);
            
            // Apply split toning
            float hSat = highlightSat / 100.0 * 0.3;
            float sSat = shadowSat / 100.0 * 0.3;
            
            c = mix(c, c * highlightColor, highlightMask * hSat);
            c = mix(c, c * shadowColor, shadowMask * sSat);
            
            return c;
        }
        
        // Tone Curve - apply LUT-based curve adjustment
        vec3 applyToneCurve(vec3 c, sampler2D lut, bool useCurve, int channel) {
            if (!useCurve) return c;
            
            // Sample the LUT (256x1 texture)
            if (channel == 0) {
                // RGB - apply same curve to all channels
                c.r = texture(lut, vec2(c.r, 0.5)).r;
                c.g = texture(lut, vec2(c.g, 0.5)).r;
                c.b = texture(lut, vec2(c.b, 0.5)).r;
            } else if (channel == 1) {
                c.r = texture(lut, vec2(c.r, 0.5)).r;
            } else if (channel == 2) {
                c.g = texture(lut, vec2(c.g, 0.5)).r;
            } else if (channel == 3) {
                c.b = texture(lut, vec2(c.b, 0.5)).r;
            }
            
            return c;
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
        
        vec3 applyGrain(vec3 c, vec2 uv, float shadowAmt, float highlightAmt, float size) {
            // Rec 709 Luminance
            float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
            
            // Calculate grain intensity based on luminance:
            // Mix between shadowAmt (at lum=0) and highlightAmt (at lum=1)
            float intensity = mix(shadowAmt, highlightAmt, lum) / 100.0 * 0.2; // 0.2 scale factor
            
            if (intensity <= 0.001) return c;
            
            // Generate Noise
            vec2 grainUV = uv * u_resolution / size;
            float noise = random(grainUV + fract(u_time * 0.1));
            
            // Soft Light Blending Formula:
            // (1.0 - 2.0 * noise) * (x^2) + 2.0 * noise * x if noise < 0.5
            // But we can simplify for monochromatic noise overlay:
            
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
        
        // ============ MAIN ============
        
        void main() {
            vec2 uv = v_texCoord;
            
            // Before/After toggle - show original without any adjustments
            if (u_showOriginal) {
                fragColor = texture(u_image, uv);
                return;
            }
            
            // Sample with optional sharpening
            vec3 color = applySharpen(u_image, uv, u_sharpness);
            
            // === TONE CURVE (before other adjustments) ===
            color = applyToneCurve(color, u_toneCurveLUT, u_useToneCurve, u_toneCurveChannel);
            
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
            // Saturation handled in Density pass
            
            // === SPLIT TONING ===
            color = applySplitToning(color, u_splitHighlightHue, u_splitHighlightSat, 
                                     u_splitShadowHue, u_splitShadowSat, u_splitBalance);
            
            // === HSL MIXER ===
            color = applyHSLMixer(color);

            // === CUSTOM 3D LUT ===
            // Applied after color grading but before texture/grain
            if (u_useLUT) {
                vec3 lutColor = texture(u_lut3d, color).rgb;
                color = mix(color, lutColor, u_lutOpacity);
            }

            // === ASCII ===
            // This replaces the whole visual, so do it last or near last
            if (u_asciiSize > 0.01) {
                float density = u_asciiSize * 100.0; // Slider 0-2 -> 0-200 chars width
                if (density < 10.0) density = 10.0;

                vec2 charGrid = vec2(density, density * (u_resolution.y / u_resolution.x) * 1.6); // Aspect correction
                
                vec2 charPos = floor(uv * charGrid) / charGrid;
                vec2 charUV = fract(uv * charGrid);
                
                // Sample brightness at center of char
                vec3 pixel = texture(u_image, charPos + (0.5/charGrid)).rgb;
                // Apply current effects to it?
                // Ideally we sample 'color' but 'color' is global var. 
                // Since this is a post-process effect, technically we should have been modifying 'color' all along.
                // But texture(u_image) gets ORIGINAL.
                // We should assume 'color' IS the current pixel processed so far? 
                
                // IMPORTANT: The shader structure modifies 'color' in place. 
                // To pixelate/ascii, we essentially need to "re-sample" the PROCESSED color at a quantized position.
                // BUT we can't easily jump back in the pipeline.
                // Workaround: We pixelate the UVs used for earlier steps? No, that breaks everything.
                // Real ASCII usually requires a 2nd pass or simply applying it on top of the "current" color result.
                // Since we can't re-run the whole pipeline for a neighbor pixel, 
                // we will just use the CURRENT pixel's brightness to pick a char, 
                // and draw a predefined color (e.g. green or white) or the pixel's color.
                
                // Let's go with "Draw simplistic ASCII on top of result":
                float gray = dot(color, vec3(0.299, 0.587, 0.114));
                int charIndex = int(gray * 7.99); 
                
                // We need quantized brightness though to make it look blocky
                // But since we can't query neighbors, we'll just check if *this* pixel falls into the char shape 
                // determined by *its own* coordinate quantization?
                // This is tricky in a single pass without texture lookups.
                // Better approach for single pass:
                // 1. Quantize UV
                // 2. We can't know the brightness of the "cell" without a texture lookup of the *result*.
                //    Since we don't have a computed texture of the result yet, we can only lookup the INPUT texture.
                //    So ASCII will verify based on INPUT image 
                //    (or we accept that effects applied *before* ASCII won't influence char shape, only char color if we use it).
                
                vec3 quantizedSource = texture(u_image, charPos + (0.5/charGrid)).rgb;
                // Apply basic luminance check on source
                float qGray = dot(quantizedSource, vec3(0.299, 0.587, 0.114));
                
                int idx = int(qGray * 8.0);
                float isChar = getCharacter(idx, charUV);
                
                // Replace color
                // Matrix style: Green text on black
                // Or just white text on black? Or text * color?
                // Let's do colored text on black background
                color = isChar * quantizedSource; 
                
                // Optional: Matrix green tint
                // color = isChar * vec3(0.0, 1.0, 0.2) * qGray;
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
            
            // === LOGARITHMIC HIGHLIGHT ROLL-OFF ===
            // Soft-clip highlights instead of hard clamp
            color = logShoulder(color);
            
            // Final safety clamp
            color = clamp(color, 0.0, 1.0);
            
            fragColor = vec4(color, 1.0);
        }
    `,

    // Phase 3: Halation - Threshold Pass
    thresholdFragment: `#version 300 es
        precision highp float;
        
        uniform sampler2D u_image;
        uniform float u_threshold;
        
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        void main() {
            vec4 color = texture(u_image, v_texCoord);
            float brightness = max(color.r, max(color.g, color.b));
            
            // Soft threshold knee
            float knee = 0.1;
            float soft = brightness - u_threshold + knee;
            soft = clamp(soft, 0.0, 2.0 * knee);
            soft = soft * soft / (4.0 * knee);
            
            float contribution = max(soft, brightness - u_threshold);
            contribution /= max(brightness, 0.00001);
            
            fragColor = vec4(color.rgb * contribution, 1.0);
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
        
        uniform sampler2D u_image; // Original image
        uniform sampler2D u_bloom; // Blurred highlights
        
        // Bloom/Halation
        uniform float u_amount;      // Bloom/Halation Strength
        uniform vec3 u_tint;         // Bloom Color (White for Glow, Pink for Halation)
        
        // Grain (Moved here to be ON TOP of Bloom)
        uniform float u_grainShadow;
        uniform float u_grainHighlight;
        uniform float u_grainSize;
        uniform float u_grainGlobal; // Main Multiplier
        // Secret FX Uniforms
        uniform float u_pixelateSize; // 0 = off, > 0 = pixel size
        uniform float u_glitchStrength;
        uniform float u_ditherStrength;
        uniform float u_scanlineIntensity;
        
        uniform vec2 u_resolution;
        uniform float u_time;
        
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        // --- Helpers ---
        float luminance(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
        
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        // Bayer Matrix 4x4
        float dither4x4(vec2 position, float brightness) {
            int x = int(mod(position.x, 4.0));
            int y = int(mod(position.y, 4.0));
            int index = x + y * 4;
            
            // GLSL ES 3.0 Array Constructor
            float bayer[16] = float[](
                0.0625, 0.5625, 0.1875, 0.6875,
                0.8125, 0.3125, 0.9375, 0.4375,
                0.25,   0.75,   0.125,  0.625,
                1.0,    0.5,    0.875,  0.375
            );
            
            return brightness < bayer[index] ? 0.0 : 1.0;
        }
        
        vec3 applyGrain(vec3 c, vec2 uv, float shadowAmt, float highlightAmt, float size, float globalMult) {
            if (globalMult <= 0.0) return c;
            
            float lum = luminance(c);
            
            // Mix between shadow and highlight amounts
            float intensity = mix(shadowAmt, highlightAmt, lum);
            
            // Apply Global Multiplier
            intensity *= globalMult;
            
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
            
            // 1. Pixelate (Modifies UV)
            if (u_pixelateSize > 0.0) {
                float dx = u_pixelateSize * (1.0 / u_resolution.x);
                float dy = u_pixelateSize * (1.0 / u_resolution.y);
                vec2 coord = vec2(dx * floor(uv.x / dx), dy * floor(uv.y / dy));
                uv = coord;
            }

            // 2. Glitch (RGB Split / Displacement)
            vec3 baseColor;
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
                baseColor = vec3(r, g, b);
            } else {
                baseColor = texture(u_image, uv).rgb;
            }

            // 3. Bloom Composition
            vec3 bloom = texture(u_bloom, uv).rgb;
            
            // Add Bloom (Screen or Linear Dodge?)
            // Linear Dodge (Add) is standard physically, but Screen is safer
            // mix(base, white, start) -> tinting
            
            // Apply Tint to Bloom first
            vec3 tintedBloom = bloom * u_tint;
            
            // Additive Blend
            // Additive Blend
            vec3 color = baseColor + (tintedBloom * (u_amount / 100.0));
            
            // 4. Grain
            color = applyGrain(color, uv, u_grainShadow, u_grainHighlight, u_grainSize, u_grainGlobal);
            
            // 5. Scanlines
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

            fragColor = vec4(color, 1.0);
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
                // Assume dust is white on black. Screen it.
                color += dust * u_dustIntensity;
            }
            
            // 2. Border (Multiply/Alpha)
            if (u_hasBorder) {
                vec4 border = texture(u_borderTexture, v_texCoord);
                // Assume border texture: Black=Border, White=Transparent (Typical film masks)
                // Or Alpha: 0=Transparent, 1=Border
                // Let's assume standard PNG overlay: RGB=Color, A=Opacity
                // If it's a "film frame", usually it's black blocking the image.
                
                // Compositing: simple over
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
