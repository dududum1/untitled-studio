use wasm_bindgen::prelude::*;

// Simple Linear Congruential Generator for fast, seeded noise
// Much faster than pulling in the full rand crate
struct Lcg {
    state: u32,
}

impl Lcg {
    fn new(seed: u32) -> Self {
        Lcg { state: seed }
    }

    fn next(&mut self) -> u32 {
        // Constants for a standard efficient LCG
        self.state = self.state.wrapping_mul(1664525).wrapping_add(1013904223);
        self.state
    }

    fn next_u8(&mut self) -> u8 {
        (self.next() >> 24) as u8
    }
}

#[wasm_bindgen]
pub fn generate_grain(width: u32, height: u32, _intensity: u8, seed: u32) -> Vec<u8> {
    let size = (width * height * 4) as usize;
    let mut buffer = vec![0; size];
    let mut rng = Lcg::new(seed);

    // Fill buffer with RGBA noise
    // Pixel layout: [R, G, B, A]
    // We want grayscale noise in RGB, and Intensity in A (or just pre-multiplied?)
    // Actually for WebGL texture, let's output raw noise in RGB and 255 in Alpha, 
    // or we can use Alpha for transparency overlay.
    // Let's stick to standard noise texture: Grayscale RGB, Alpha = 255.
    // The shader handles intensity mixing.
    
    // Optimization: Unrolling or block processing could be faster, but compiler does well.
    for i in (0..size).step_by(4) {
        let noise = rng.next_u8();
        
        // Apply intensity scaling if we want to burn it in, 
        // but usually raw noise + shader intensity is better.
        // Let's return raw noise [0-255].
        
        buffer[i] = noise;     // R
        buffer[i + 1] = noise; // G
        buffer[i + 2] = noise; // B
        buffer[i + 3] = 255;   // A
    }

    buffer
}

#[wasm_bindgen]
pub fn greet() -> String {
    "Hello from Wasm Core!".to_string()
}
