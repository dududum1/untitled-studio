const presets = require('./js/presets.js');
const all = presets.getAllPresets();

const newCats = {
    kodak: [],
    fuji: [],
    ilford: [],
    cinestill: [],
    agfa: [],
    polaroid: [],
    rollei: [],
    lomography: [],
    konica: [],
    foma: [], // Maybe?
    vintage: [],
    obscure: [],
    experimental: [], // Keep for pure glitches?
    modern: [],
    moody: [],
    dreamy: [],
    art_hues: [],
    cinema_eras: [],
    digital_glitch: [],
    muse: []
};

// Helper to determine category
function getNewCategory(p) {
    const name = p.name.toLowerCase();
    const currentCat = p.category;

    // 1. Big Brands
    if (name.includes('kodak') || name.includes('ektar') || name.includes('portra') || name.includes('vision3') || name.includes('tri-x') || name.includes('t-max') || name.includes('gold 200') || name.includes('colorplus') || name.includes('ultramax') || name.includes('pro image') || name.includes('vericolor') || name.includes('elite chrome') || name.includes('aerochrome') || name.includes('technical pan') || name.includes('hie')) return 'kodak';
    if (name.includes('fuji') || name.includes('pro 400h') || name.includes('superia') || name.includes('velvia') || name.includes('provia') || name.includes('astia') || name.includes('classic chrome') || name.includes('eterna') || name.includes('natura') || name.includes('fortia') || name.includes('neopan') || name.includes('trebi') || name.includes('sensia') || name.includes('industrial') || name.includes('reala')) return 'fuji';
    if (name.includes('ilford') || name.includes('hp5') || name.includes('fp4') || name.includes('delta') || name.includes('pan f') || name.includes('xp2') || name.includes('sfx')) return 'ilford';
    if (name.includes('cinestill')) return 'cinestill';
    if (name.includes('agfa') || name.includes('optima') || name.includes('vista') || name.includes('scala')) return 'agfa';
    if (name.includes('polaroid') || name.includes('polachrome') || name.includes('669')) return 'polaroid';
    if (name.includes('rollei') || name.includes('retro 80s') || name.includes('retro 400s') || name.includes('vario chrome') || name.includes('ortho 25') || name.includes('infrared 400') || name.includes('rpx')) return 'rollei';
    if (name.includes('lomo') || name.includes('metropolis') || name.includes('purple') || name.includes('turquoise') || name.includes('potsdam') || name.includes('berlin')) return 'lomography';
    if (name.includes('konica') || name.includes('centuria') || name.includes('impresa') || name.includes('vx 400')) return 'konica';

    // 2. Specific Brands that might be "Big" enough or go to Obscure/Vintage?
    // User said "Big Brand Name have their own category". 
    // Foma/Kentmere/Ferrania?
    if (name.includes('foma') || name.includes('fomapan')) return 'vintage'; // Or create 'foma'? Let's stick to vintage for now unless many.
    if (name.includes('kentmere')) return 'vintage';
    if (name.includes('ferrania') || name.includes('solaris')) return 'vintage'; // Ferrania is classic but maybe small?

    // 3. Obscure vs Vintage
    // Obscure: Eastern Bloc, Industrial, Lost, Weird
    if (name.includes('svema') || name.includes('tasma') || name.includes('orwo') || name.includes('azo') || name.includes('valca') || name.includes('donau') || name.includes('perutz') || name.includes('efke') || name.includes('adox')) return 'obscure';
    if (name.includes('traffic') || name.includes('surveillance') || name.includes('hawk') || name.includes('aerocolor') || name.includes('eir') || name.includes('infrared') || name.includes('street pan')) return 'obscure';
    if (name.includes('revolog') || name.includes('kono') || name.includes('dubble') || name.includes('bk iii') || name.includes('psych') || name.includes('yodica') || name.includes('washi')) return 'obscure'; // "Experimental" oddities
    if (name.includes('mitsubishi') || name.includes('lucky')) return 'obscure';

    // 4. Vintage (Consumer/Retro/Generic)
    if (name.includes('kmart') || name.includes('boots') || name.includes('tudor') || name.includes('rossmann') || name.includes('revue') || name.includes('prinze') || name.includes('hanimex') || name.includes('gevaert')) return 'vintage'; // Drugstore = Vintage Consumer? Or Obscure? User said "obscure drug-store rebrands" in prompt 1, but then "make the obscure one into two vintage and obscure". 
    // Let's put Drugstore in 'vintage' as they are "Consumer" films.
    // 'Obscure' is for "Weird/Industrial/Soviet".

    if (currentCat === 'vintage' || currentCat === 'lost_film') {
        // Fallback for things in these cats not caught above
        // e.g. Technicolor, Redscale, Daguerreotype
        return 'vintage';
    }

    // Keep existing style categories
    if (currentCat === 'modern' || currentCat === 'moody' || currentCat === 'dreamy' || currentCat === 'art_hues' || currentCat === 'cinema_eras' || currentCat === 'digital_glitch' || currentCat === 'muse') {
        return currentCat;
    }

    // Experimental?
    if (currentCat === 'experimental') {
        return 'obscure'; // Move experimental films to obscure? Or keep?
        // Let's keep 'digital_glitch' separate, but 'experimental' (if it has films) moves to obscure.
    }

    return 'others';
}

all.forEach(p => {
    const cat = getNewCategory(p);
    if (!newCats[cat]) newCats[cat] = [];
    newCats[cat].push(p.name);
});

console.log(JSON.stringify(newCats, null, 2));
