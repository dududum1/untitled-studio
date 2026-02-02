const fs = require('fs');
const presets = require('./js/presets.js');
const all = presets.getAllPresets();

// Define buckets
const buckets = {
    kodak: [],
    fuji: [],
    ilford: [],
    cinestill: [],
    agfa: [],
    polaroid: [],
    rollei: [],
    lomography: [],
    konica: [],
    vintage: [],
    obscure: [],
    modern: [],
    moody: [],
    dreamy: [],
    monochrome: [], // Generic B&W
    cinema: [], // Was cinema_eras
    experimental: [], // Glitch/Digital
    muse: []
};

// Helper to sanitize name for checking
function n(preset) { return preset.name.toLowerCase(); }

all.forEach(p => {
    const name = n(p);
    let cat = 'vintage'; // Default fallback

    // 1. KODAK
    if (name.includes('kodak') || name.includes('portra') || name.includes('ktar') || name.includes('vision3') || name.includes('tri-x') || name.includes('t-max') || name.includes('gold 200') || name.includes('colorplus') || name.includes('ultramax') || name.includes('pro image') || name.includes('vericolor') || name.includes('elite chrome') || name.includes('aerochrome') || name.includes('technical pan') || name.includes('hie') || name.includes('royal gold') || name.includes('double-x')) {
        cat = 'kodak';
    }
    // 2. FUJI
    else if (name.includes('fuji') || name.includes('pro 400h') || name.includes('superia') || name.includes('velvia') || name.includes('provia') || name.includes('astia') || name.includes('classic chrome') || name.includes('eterna') || name.includes('natura') || name.includes('fortia') || name.includes('neopan') || name.includes('trebi') || name.includes('sensia') || name.includes('industrial') || name.includes('reala') || name === 'c200') {
        cat = 'fuji';
    }
    // 3. ILFORD
    else if (name.includes('ilford') || name.includes('hp5') || name.includes('fp4') || name.includes('delta') || name.includes('pan f') || name.includes('xp2') || name.includes('sfx') || name.includes('ortho 80')) {
        cat = 'ilford';
    }
    // 4. CINESTILL
    else if (name.includes('cinestill')) {
        cat = 'cinestill';
    }
    // 5. AGFA
    else if (name.includes('agfa') || name.includes('optima') || name.includes('vista') || name.includes('scala') || name.includes('precisa')) {
        cat = 'agfa';
    }
    // 6. POLAROID
    else if (name.includes('polaroid') || name.includes('polachrome') || name.includes('669') || name.includes('sx-70') || name.includes('time-zero')) {
        cat = 'polaroid';
    }
    // 7. ROLLEI
    else if (name.includes('rollei') || name.includes('retro 80s') || name.includes('retro 400s') || name.includes('vario chrome') || name.includes('ortho 25') || name.includes('rpx') || name.includes('infrared 400')) {
        cat = 'rollei';
    }
    // 8. LOMOGRAPHY
    else if (name.includes('lomo') || name.includes('metropolis') || name.includes('purple') || name.includes('turquoise') || name.includes('potsdam') || name.includes('berlin')) {
        cat = 'lomography';
    }
    // 9. KONICA
    else if (name.includes('konica') || name.includes('centuria') || name.includes('impresa') || name.includes('vx 400')) {
        cat = 'konica';
    }
    // 10. OBSCURE (Defunct/Weird/Industrial)
    else if (name.includes('svema') || name.includes('tasma') || name.includes('orwo') || name.includes('azo') || name.includes('valca') || name.includes('donau') || name.includes('perutz') || name.includes('efke') || name.includes('adox') || name.includes('lucky') || name.includes('mitsubishi') || name.includes('revolog') || name.includes('kono') || name.includes('dubble') || name.includes('washi') || name.includes('bk iii') || name.includes('psych') || name.includes('yodica') || name.includes('street pan') || name.includes('wolfen') || name.includes('elektra') || name.includes('traffic') || name.includes('surveillance') || name.includes('hawk') || name.includes('eir')) {
        cat = 'obscure';
    }
    // 11. VINTAGE (Remaining Film Stocks)
    else if (name.includes('ferrania') || name.includes('solaris') || name.includes('foma') || name.includes('kentmere') || name.includes('tudor') || name.includes('kmart') || name.includes('boots') || name.includes('prinze') || name.includes('hanimex') || name.includes('gevaert') || name.includes('rossmann') || name.includes('revue') || name.includes('redscale') || name.includes('technicolor') || name.includes('daguerreotype') || name.includes('tungsten') || name.includes('drugstore') || name.includes('expired') || name.includes('sepia')) {
        cat = 'vintage';
    }
    // 12. STYLIZED CATEGORIES
    else {
        if (p.category === 'modern') cat = 'modern';
        else if (p.category === 'moody') cat = 'moody';
        else if (p.category === 'dreamy') cat = 'dreamy';
        else if (p.category === 'digital_glitch' || p.category === 'experimental') cat = 'experimental';
        else if (p.category === 'cinema_eras') cat = 'cinema';
        else if (p.category === 'muse') cat = 'muse';
        else if (p.category === 'art_hues') cat = 'modern';
        else {
            if (name.includes('noir') || name.includes('bw') || name.includes('newsprint') || name.includes('monochrome') || name.includes('ortho')) cat = 'monochrome';
            else if (name.includes('teal') || name.includes('orange') || name.includes('matrix') || name.includes('vaporwave')) cat = 'experimental';
            else if (name.includes('wes anderson') || name.includes('blade runner') || name.includes('blockbuster')) cat = 'cinema';
            else if (name.includes('classic') || name.includes('retro')) cat = 'vintage';
            else cat = 'modern';
        }
    }

    if (name.includes('silbersalz')) cat = 'kodak';

    const newPreset = { ...p, category: cat };
    buckets[cat].push(newPreset);
});

// Generate file content
let content = `/**
 * UNTITLED STUDIO - FILM PRESETS LIBRARY
 * 150+ professional film stock emulations
 * REORGANIZED: Big Brands, Vintage, Obscure, & Styles
 */

const FilmPresets = {
`;

Object.keys(buckets).forEach(key => {
    if (buckets[key].length === 0) return;
    content += `    // ============ ${key.toUpperCase().replace('_', ' ')} ============
    ${key}: [
`;
    buckets[key].forEach((p, index) => {
        const isLast = index === buckets[key].length - 1;
        content += `        {
            name: "${p.name}",
            category: "${key}",
`;
        // Iterating properties
        Object.keys(p).forEach(prop => {
            if (prop === 'name' || prop === 'category') return;
            let val = p[prop];

            if (p.name === "Soft & Warm" && prop === "hsl") {
                val = `[
                { channel: "orange", lum: 5 },
                { channel: "yellow", sat: -10 }
            ]`;
            } else {
                val = JSON.stringify(val);
            }
            content += `            ${prop}: ${val},\n`;
        });

        content = content.trim().replace(/,$/, '');
        content += `
        }${isLast ? '' : ','}
`;
    });
    content += `    ],\n\n`;
});

content += `};

/**
 * Get all presets as a flat array
 */
function getAllPresets() {
    const all = [];
    Object.keys(FilmPresets).forEach(category => {
        FilmPresets[category].forEach(preset => {
            all.push({ ...preset, category });
        });
    });
    return all;
}

/**
 * Get presets by category
 */
function getPresetsByCategory(category) {
    if (category === 'all') {
        return getAllPresets();
    }
    return FilmPresets[category] || [];
}

/**
 * Find preset by name
 */
function findPreset(name) {
    const all = getAllPresets();
    return all.find(p => p.name.toLowerCase() === name.toLowerCase());
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FilmPresets, getAllPresets, getPresetsByCategory, findPreset };
}

// Browser global export
if (typeof window !== 'undefined') {
    window.FilmPresets = FilmPresets;
    window.getPresetsByCategory = getPresetsByCategory;
    window.getAllPresets = getAllPresets;
    window.findPreset = findPreset;
}
`;

fs.writeFileSync('js/presets.js', content, 'utf8');
console.log('Done!');
