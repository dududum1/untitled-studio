
// ============ PRINT PROFILES (The "Output" Layer) ============
window.print_profiles = [
    {
        name: "Linear (No Print)",
        description: "Raw negative look. Flat and low contrast.",
        contrast: 0,
        saturation: 0
    },
    {
        name: "Kodak 2383 Print Film",
        description: "The Hollywood Standard. Deep blacks, teal-ish shadows, warm highs.",
        contrast: 25,
        saturation: -10,
        temperature: 0,
        tint: 0,
        // The 2383 "Curve":
        highlights: -15, // Compressed highs
        shadows: -15, // Crushed blacks
        splitShadowHue: 190, // Teal
        splitShadowSat: 15,
        splitHighlightHue: 40, // Warm Gold
        splitHighlightSat: 10
    },
    {
        name: "Fujifilm 3513 Print Film",
        description: "Cleaner, glossier, magenta-biased blacks.",
        contrast: 20,
        saturation: 0,
        temperature: -5,
        tint: 10,
        highlights: -10,
        shadows: -10,
        splitShadowHue: 300, // Magenta bias in blacks
        splitShadowSat: 10
    },
    {
        name: "Cineon Log",
        description: "Scanned Negative emulation for manual grading.",
        contrast: -40, // Very flat
        highlights: 30, // Recover detail
        shadows: 30, // Lift blacks
        saturation: -20,
        gamma: 0.6 // Log gamma curve simulation
    }
];
