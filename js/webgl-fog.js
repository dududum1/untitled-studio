/**
 * WEBGL LIVING BACKGROUND (The Fog)
 * GPU-accelerated replacement for CSS gradients.
 * Renders smooth simplex noise fog at 60fps.
 */
class WebGLFog {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'bg-canvas';
        // Style: z-index -2 to be behind everything (even deep-fog placeholder)
        this.canvas.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:-2; pointer-events:none;';
        document.body.prepend(this.canvas);

        this.gl = this.canvas.getContext('webgl');
        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }

        this.program = null;
        this.startTime = Date.now();
        this.width = 0;
        this.height = 0;

        // Default Colors (Kodak Gold)
        this.colors = {
            c1: [1.0, 0.78, 0.0], // #FFC700
            c2: [1.0, 0.4, 0.0]   // Orange/Red mix
        };

        this.init();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    // Vertex Shader: Simple full-screen quad
    get vsSource() {
        return `
            attribute vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;
    }

    // Fragment Shader: Simplex Noise Fog
    get fsSource() {
        return `
            precision mediump float;
            uniform vec2 u_resolution;
            uniform float u_time;
            uniform vec3 u_color1; // Accent Color
            uniform vec3 u_color2; // Secondary Color

            // Simplex 2D noise
            vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
            float snoise(vec2 v){
                const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy) );
                vec2 x0 = v -   i + dot(i, C.xx);
                vec2 i1;
                i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod(i, 289.0);
                vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                    + i.x + vec3(0.0, i1.x, 1.0 ));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m ;
                m = m*m ;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                vec3 g;
                g.x  = a0.x  * x0.x  + h.x  * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            void main() {
                vec2 st = gl_FragCoord.xy/u_resolution.xy;
                // Correct aspect ratio
                st.x *= u_resolution.x/u_resolution.y;

                float t = u_time * 0.1; // Slow movement
                
                // Layers of noise
                float noise1 = snoise(st * 0.5 + t);
                float noise2 = snoise(st * 1.5 - t * 0.5);
                
                // Combine noise
                float finalNoise = (noise1 + noise2 * 0.5) * 0.5; // Range approx -0.75 to 0.75

                // Mix background color (dark base) with accent colors based on noise
                vec3 baseDark = vec3(0.05, 0.05, 0.06); // Dark midnight
                
                // Mix factor
                float mixFactor = smoothstep(-0.5, 0.8, finalNoise);
                
                // Dynamic Color
                vec3 fogColor = mix(u_color1, u_color2, sin(t + st.x)*0.5 + 0.5);
                
                // Final composition: Base + (FogColor * Alpha)
                // We keep it very subtle
                vec3 finalColor = mix(baseDark, fogColor, mixFactor * 0.15); // 15% opacity max

                // Add grain
                float grain = fract(sin(dot(st.xy + t, vec2(12.9898,78.233))) * 43758.5453);
                finalColor += grain * 0.03;

                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;
    }

    init() {
        // Compile Shaders
        const vs = this.createShader(this.gl.VERTEX_SHADER, this.vsSource);
        const fs = this.createShader(this.gl.FRAGMENT_SHADER, this.fsSource);
        this.program = this.createProgram(vs, fs);
        this.gl.useProgram(this.program);

        // buffer
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array([
                -1.0, -1.0,
                1.0, -1.0,
                -1.0, 1.0,
                -1.0, 1.0,
                1.0, -1.0,
                1.0, 1.0]),
            this.gl.STATIC_DRAW
        );

        // Attribute setup
        const positionLocation = this.gl.getAttribLocation(this.program, "position");
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        // Helper: Get uniform locations
        this.u_time = this.gl.getUniformLocation(this.program, "u_time");
        this.u_resolution = this.gl.getUniformLocation(this.program, "u_resolution");
        this.u_color1 = this.gl.getUniformLocation(this.program, "u_color1");
        this.u_color2 = this.gl.getUniformLocation(this.program, "u_color2");
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    createProgram(vs, fs) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vs);
        this.gl.attachShader(program, fs);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program link error:', this.gl.getProgramInfoLog(program));
            return null;
        }
        return program;
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.gl.viewport(0, 0, this.width, this.height);
        if (this.program) {
            this.gl.uniform2f(this.u_resolution, this.width, this.height);
        }
    }

    setColor(c1, c2) {
        this.colors.c1 = c1;
        this.colors.c2 = c2;
    }

    animate() {
        if (!this.program) return;

        const time = (Date.now() - this.startTime) * 0.001;
        this.gl.uniform1f(this.u_time, time);

        // Pass colors
        this.gl.uniform3fv(this.u_color1, this.colors.c1);
        this.gl.uniform3fv(this.u_color2, this.colors.c2);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        requestAnimationFrame(() => this.animate());
    }
}

// Global instance
window.WebGLFog = new WebGLFog();
