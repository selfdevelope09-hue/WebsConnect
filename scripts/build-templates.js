'use strict';

/**
 * Generates full 3-page demo websites for every template into
 * public/templates/<id>/{index,portfolio,contact}.html
 *
 * Run: node scripts/build-templates.js
 * The output is committed to git and served as static files, so users
 * can browse a real working multi-page demo of each template.
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'public', 'templates');

const DEMO_PHONE = '+91 98765 43210';
const DEMO_WA = 'https://wa.me/919876543210?text=Hi!%20I%20want%20to%20book%20a%20shoot';
const DEMO_TEL = 'tel:+919876543210';
const DEMO_MAIL = 'mailto:hello@example.com';

function img(id, w) {
  return 'https://images.unsplash.com/' + id + '?q=80&w=' + (w || 900) + '&auto=format&fit=crop';
}

// ── Image pools per niche ─────────────────────────────────────
const IMGS = {
  luxury: ['photo-1519741497674-611481863552', 'photo-1606216794074-735e91aa2c92', 'photo-1583939003579-730e3918a45a', 'photo-1522673607200-164d1b6ce486', 'photo-1520854221256-17451cc331bf', 'photo-1511285560929-80b456fea0bc', 'photo-1591604466107-ec97de577aff', 'photo-1465495976277-4387d4b0b4c6'],
  golden: ['photo-1529634806980-85c3dd6d34ac', 'photo-1518199266791-5375a83190b7', 'photo-1537633552985-df8429e8048b', 'photo-1516589178581-6cd7833ae3b2', 'photo-1522098543979-ffc7f79a56c4', 'photo-1519225421980-715cb0215aed', 'photo-1520854221256-17451cc331bf', 'photo-1583939003579-730e3918a45a'],
  minimal: ['photo-1452587925148-ce544e77e70d', 'photo-1471341971476-ae15ff79dd83', 'photo-1500462918059-b1a0cb512f1d', 'photo-1516035069371-29a1b244cc32', 'photo-1493863641943-9b68992a8d07', 'photo-1554080353-a576cf803bda', 'photo-1502920917128-1aa500764cbd', 'photo-1520390138845-fd2d229dd553'],
  fashion: ['photo-1509631179647-0177331693ae', 'photo-1515886657613-9f3515b0c78f', 'photo-1496747611176-843222e1e57c', 'photo-1483985988355-763728e1935b', 'photo-1524504388940-b1c1722653e1', 'photo-1529139574466-a303027c1d8b', 'photo-1490481651871-ab68de25d43d', 'photo-1469334031218-e382a71b716b'],
  street: ['photo-1449824913935-59a10b8d2000', 'photo-1477959858617-67f85cf4f1df', 'photo-1519501025264-65ba15a82390', 'photo-1514565131-fce0801e5785', 'photo-1486325212027-8081e485255e', 'photo-1519608487953-e999c86e7455', 'photo-1444723121867-7a241cacace9', 'photo-1480714378408-67cf0d13bc1b'],
  wedding: ['photo-1606216794074-735e91aa2c92', 'photo-1519741497674-611481863552', 'photo-1591604466107-ec97de577aff', 'photo-1511285560929-80b456fea0bc', 'photo-1522673607200-164d1b6ce486', 'photo-1520854221256-17451cc331bf', 'photo-1465495976277-4387d4b0b4c6', 'photo-1583939003579-730e3918a45a'],
  nature: ['photo-1441974231531-c6227db76b6e', 'photo-1470071459604-3b5ec3a7fe05', 'photo-1472214103451-9374bd1c798e', 'photo-1552083375-1447ce886485', 'photo-1500534314209-a25ddb2bd429', 'photo-1557050543-4d5f4e07ef46', 'photo-1426604966848-d7adac402bff', 'photo-1475924156734-496f6cac6ec1'],
  product: ['photo-1523275335684-37898b6baf30', 'photo-1505740420928-5e560c06d30e', 'photo-1526170375885-4d8ecf77b99f', 'photo-1542291026-7eec264c27ff', 'photo-1560343090-f0409e92791a', 'photo-1585386959984-a4155224a1ad', 'photo-1572635196237-14b3f281503f', 'photo-1491553895911-0055eca6402d'],
  baby: ['photo-1519689680058-324335c77eba', 'photo-1555252333-9f8e92e65df9', 'photo-1476703993599-0035a21b17a9', 'photo-1609220136736-443140cffec6', 'photo-1511895426328-dc8714191300', 'photo-1590649880765-91b1956b8276', 'photo-1544005313-94ddf0286df2', 'photo-1522771930-78848d9293e8'],
  cinema: ['photo-1485846234645-a62644f84728', 'photo-1478720568477-152d9b164e26', 'photo-1492691527719-9d1e07e534b4', 'photo-1440404653325-ab127d49abc1', 'photo-1489599849927-2ee91cede3ba', 'photo-1518676590629-3dcbd9c5a5c9', 'photo-1517604931442-7e0c8ed2963c', 'photo-1536440136628-849c177e76a1'],
};

// ── Template configs ──────────────────────────────────────────
// Each entry: theme tokens + a fully custom hero + layout variants.
const TEMPLATES = [
  {
    id: 'noir-studio', name: 'Noir Studio', navLabel: 'Portfolio',
    tagline: 'Cinematic luxury wedding & editorial photography',
    fonts: { link: 'family=Playfair+Display:wght@500;700&family=Inter:wght@300;400;600', head: "'Playfair Display',serif", body: "'Inter',sans-serif" },
    c: { bg: '#0a0a0a', card: '#161616', accent: '#d4af37', accentInk: '#0a0a0a', ink: '#ffffff', mut: '#9c9c9c', line: 'rgba(212,175,55,.28)' },
    imgs: IMGS.luxury, galleryLayout: 'masonry', btnStyle: 'sharp',
    services: [['Luxury Weddings', 'Full-day cinematic coverage with a two-photographer team.'], ['Editorial Portraits', 'Magazine-grade studio portraits with styled lighting.'], ['Destination Shoots', 'Udaipur, Goa, Jaipur — we travel with you.']],
    quote: ['"Every frame felt like a movie still. Worth every rupee."', '— Priya & Arjun, Mumbai'],
    hero(t) {
      return '<section class="relative min-h-[88vh] flex items-end">' +
        '<img src="' + img(t.imgs[0], 1200) + '" class="absolute inset-0 w-full h-full object-cover opacity-50" alt="hero">' +
        '<div class="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent"></div>' +
        '<div class="relative px-6 pb-16 max-w-3xl">' +
        '<p class="text-accent tracking-[.35em] uppercase text-xs mb-4">Est. 2016 · Mumbai</p>' +
        '<h1 class="font-head text-5xl md:text-6xl leading-tight">Noir Studio</h1>' +
        '<p class="mt-4 text-mut max-w-md">' + t.tagline + '. Dark, timeless, unforgettable.</p>' +
        '<div class="mt-8 flex gap-3 flex-wrap">' +
        '<a href="portfolio.html" class="px-7 py-3.5 bg-accent text-accentInk font-semibold text-sm tracking-wide">VIEW PORTFOLIO</a>' +
        '<a href="contact.html" class="px-7 py-3.5 border border-accent text-accent font-semibold text-sm tracking-wide">BOOK A DATE</a>' +
        '</div></div></section>';
    },
  },
  {
    id: 'golden-hour', name: 'Golden Hour', navLabel: 'Gallery',
    tagline: 'Romantic pre-wedding & couple stories in warm light',
    fonts: { link: 'family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500&family=Karla:wght@400;700', head: "'Cormorant Garamond',serif", body: "'Karla',sans-serif" },
    c: { bg: '#fdf6ec', card: '#f7e8d0', accent: '#c98a2d', accentInk: '#ffffff', ink: '#3d2c17', mut: '#8a6f4d', line: 'rgba(201,138,45,.35)' },
    imgs: IMGS.golden, galleryLayout: 'filmstrip', btnStyle: 'pill',
    services: [['Pre-Wedding Films', 'Sunset shoots at handpicked golden-hour locations.'], ['Couple Portraits', 'Candid, dreamy frames that feel like your love story.'], ['Save-the-Date Reels', 'Short cinematic reels ready for Instagram.']],
    quote: ['"Our pre-wedding shoot looked like a fairy tale. Everyone asks who shot it!"', '— Sneha & Rahul, Pune'],
    hero(t) {
      return '<section class="px-6 pt-14 pb-10 text-center">' +
        '<p class="italic font-head text-2xl text-accent">the light that loves you back</p>' +
        '<h1 class="font-head text-6xl mt-2">Golden Hour</h1>' +
        '<p class="mt-3 text-mut max-w-md mx-auto">' + t.tagline + '.</p>' +
        '<div class="mt-7 flex justify-center gap-3">' +
        '<a href="portfolio.html" class="px-7 py-3.5 rounded-full bg-accent text-accentInk font-bold text-sm">See the Gallery</a>' +
        '<a href="contact.html" class="px-7 py-3.5 rounded-full border-2 border-accent text-accent font-bold text-sm">Plan Your Shoot</a>' +
        '</div>' +
        '<div class="mt-10 grid grid-cols-3 gap-3 max-w-3xl mx-auto">' +
        '<img src="' + img(t.imgs[1], 500) + '" class="rounded-t-full h-56 md:h-72 w-full object-cover" alt="">' +
        '<img src="' + img(t.imgs[0], 500) + '" class="rounded-3xl h-56 md:h-72 w-full object-cover mt-6" alt="">' +
        '<img src="' + img(t.imgs[2], 500) + '" class="rounded-t-full h-56 md:h-72 w-full object-cover" alt="">' +
        '</div></section>';
    },
  },
  {
    id: 'minimal-frame', name: 'Minimal Frame', navLabel: 'Work',
    tagline: 'Fine-art photography. Nothing else on the page.',
    fonts: { link: 'family=Inter:wght@300;400;500;700', head: "'Inter',sans-serif", body: "'Inter',sans-serif" },
    c: { bg: '#ffffff', card: '#f4f4f4', accent: '#111111', accentInk: '#ffffff', ink: '#111111', mut: '#777777', line: 'rgba(0,0,0,.12)' },
    imgs: IMGS.minimal, galleryLayout: 'masonry', btnStyle: 'sharp',
    services: [['Fine-Art Prints', 'Museum-grade prints, editions of 10, shipped worldwide.'], ['Personal Portraits', 'One hour. Natural light. No props, no noise.'], ['Space & Architecture', 'Interiors and structures, composed with patience.']],
    quote: ['"Restraint is his superpower. The photos breathe."', '— Design Trust India'],
    hero(t) {
      return '<section class="px-6 pt-16 pb-12 max-w-4xl mx-auto">' +
        '<h1 class="font-head font-light text-4xl md:text-5xl tracking-tight leading-snug">Photographs that<br><span class="font-bold">say less, mean more.</span></h1>' +
        '<p class="mt-4 text-mut max-w-sm text-sm leading-relaxed">' + t.tagline + '</p>' +
        '<div class="mt-8 flex gap-6 text-sm font-medium">' +
        '<a href="portfolio.html" class="underline underline-offset-8 decoration-2">View Work →</a>' +
        '<a href="contact.html" class="text-mut hover:text-ink">Enquire</a>' +
        '</div>' +
        '<img src="' + img(t.imgs[0], 1200) + '" class="mt-12 w-full h-80 md:h-[430px] object-cover" alt="featured">' +
        '<p class="mt-2 text-[11px] text-mut tracking-wide">FIG. 01 — SELECTED WORK, 2026</p>' +
        '</section>';
    },
  },
  {
    id: 'bold-lens', name: 'Bold Lens', navLabel: 'Portfolio',
    tagline: 'Fashion, editorial & model portfolios with attitude',
    fonts: { link: 'family=Archivo+Black&family=Space+Grotesk:wght@400;600', head: "'Archivo Black',sans-serif", body: "'Space Grotesk',sans-serif" },
    c: { bg: '#12002b', card: '#26094a', accent: '#ff2d78', accentInk: '#ffffff', ink: '#ffffff', mut: '#b79ddb', line: 'rgba(255,45,120,.35)' },
    imgs: IMGS.fashion, galleryLayout: 'grid', btnStyle: 'pill',
    services: [['Editorial Campaigns', 'Concept-to-cover shoots for brands and magazines.'], ['Model Portfolios', 'Agency-ready digitals + styled portfolio in one day.'], ['Lookbooks & Reels', 'E-commerce lookbooks and vertical video content.']],
    quote: ['"The boldest lens in the city. Our campaign went viral."', '— Vogue Street Labels'],
    hero(t) {
      return '<section class="relative px-6 pt-14 pb-12 overflow-hidden">' +
        '<div class="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-accent/30 blur-3xl"></div>' +
        '<h1 class="font-head text-5xl md:text-7xl leading-[1.02]"><span class="text-transparent bg-clip-text bg-gradient-to-r from-accent to-fuchsia-400">BOLD</span><br>LENS</h1>' +
        '<p class="mt-4 text-mut max-w-xs">' + t.tagline + '.</p>' +
        '<div class="mt-7 flex gap-3 flex-wrap">' +
        '<a href="portfolio.html" class="px-7 py-3.5 rounded-full bg-gradient-to-r from-accent to-fuchsia-500 font-bold text-sm shadow-lg shadow-accent/40">SEE THE HEAT →</a>' +
        '<a href="contact.html" class="px-7 py-3.5 rounded-full border border-accent/60 text-accent font-bold text-sm">BOOK ME</a>' +
        '</div>' +
        '<div class="mt-10 flex gap-3 -mx-6 px-6 overflow-x-auto pb-2">' +
        t.imgs.slice(0, 4).map(function (im, i) { return '<img src="' + img(im, 480) + '" class="h-64 w-44 object-cover rounded-2xl shrink-0 ' + (i % 2 ? 'mt-6' : '') + ' border border-accent/30" alt="">'; }).join('') +
        '</div>' +
        '<div class="mt-8 grid grid-cols-3 gap-3 text-center">' +
        [['320+', 'Shoots'], ['48', 'Brands'], ['1.2M', 'Reach']].map(function (s) { return '<div class="rounded-2xl bg-card border border-accent/20 py-4"><div class="font-head text-xl text-accent">' + s[0] + '</div><div class="text-[11px] text-mut mt-1">' + s[1] + '</div></div>'; }).join('') +
        '</div></section>';
    },
  },
  {
    id: 'urban-street', name: 'Urban Street', navLabel: 'Frames',
    tagline: 'Raw street & documentary photography from Indian cities',
    fonts: { link: 'family=Oswald:wght@500;700&family=IBM+Plex+Mono:wght@400;600', head: "'Oswald',sans-serif", body: "'IBM Plex Mono',monospace" },
    c: { bg: '#101418', card: '#1c232b', accent: '#ff6b35', accentInk: '#101418', ink: '#e8e8e8', mut: '#8b949e', line: 'rgba(255,107,53,.3)' },
    imgs: IMGS.street, galleryLayout: 'filmstrip', btnStyle: 'sharp',
    services: [['City Photo-Walks', 'Documenting streets, markets and people at dawn.'], ['Event Documentary', 'Unscripted coverage of gigs, protests and festivals.'], ['Zines & Prints', 'Limited-run photo zines from every series.']],
    quote: ['"Gritty, honest, alive. This is what the city actually looks like."', '— The Metro Journal'],
    hero(t) {
      return '<section class="relative min-h-[80vh] flex items-center">' +
        '<img src="' + img(t.imgs[0], 1200) + '" class="absolute inset-0 w-full h-full object-cover opacity-40 grayscale" alt="">' +
        '<div class="relative px-6">' +
        '<p class="text-accent text-xs tracking-widest">// SHOT ON THE STREETS SINCE 2018</p>' +
        '<h1 class="font-head uppercase text-6xl md:text-8xl leading-none mt-3">URBAN<br><span class="text-accent">STREET</span></h1>' +
        '<p class="mt-4 text-mut text-sm max-w-sm">' + t.tagline + '.</p>' +
        '<div class="mt-8 flex gap-3">' +
        '<a href="portfolio.html" class="px-6 py-3 bg-accent text-accentInk font-bold text-sm uppercase">View frames</a>' +
        '<a href="contact.html" class="px-6 py-3 border border-ink/40 font-bold text-sm uppercase">Hire me</a>' +
        '</div></div></section>';
    },
  },
  {
    id: 'wedding-bliss', name: 'Wedding Bliss', navLabel: 'Weddings',
    tagline: 'Traditional & modern Indian wedding photography',
    fonts: { link: 'family=Great+Vibes&family=Lora:ital,wght@0,500;0,600;1,500&family=Mulish:wght@400;700', head: "'Lora',serif", body: "'Mulish',sans-serif" },
    c: { bg: '#fff7f8', card: '#fce9ee', accent: '#d96c82', accentInk: '#ffffff', ink: '#4a2c33', mut: '#96707a', line: 'rgba(217,108,130,.35)' },
    imgs: IMGS.wedding, galleryLayout: 'grid', btnStyle: 'pill',
    services: [['Wedding Day', 'Haldi to vidaai — every ritual, every tear, every laugh.'], ['Pre-Wedding', 'Styled couple shoots at palaces, beaches and cafes.'], ['Engagement & Mehendi', 'Intimate function coverage with candid teams.']],
    quote: ['"They captured our haldi like a festival of colour. Family keeps rewatching!"', '— Ananya & Vikram, Nagpur'],
    hero(t) {
      return '<section class="px-6 pt-12 pb-10 text-center">' +
        '<p style="font-family:\'Great Vibes\',cursive" class="text-4xl text-accent">forever begins here</p>' +
        '<h1 class="font-head text-5xl mt-2">Wedding Bliss</h1>' +
        '<p class="mt-3 text-mut max-w-md mx-auto text-sm">' + t.tagline + '.</p>' +
        '<div class="relative mt-8 max-w-md mx-auto">' +
        '<img src="' + img(t.imgs[0], 900) + '" class="rounded-[2.5rem] h-96 w-full object-cover shadow-xl" alt="">' +
        '<div class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-card border border-accent/30 rounded-full px-5 py-2.5 text-xs font-bold text-accent shadow">500+ weddings captured 💍</div>' +
        '</div>' +
        '<div class="mt-12 flex justify-center gap-3">' +
        '<a href="portfolio.html" class="px-7 py-3.5 rounded-full bg-accent text-accentInk font-bold text-sm shadow-lg shadow-accent/30">Real Weddings</a>' +
        '<a href="contact.html" class="px-7 py-3.5 rounded-full bg-card text-accent border border-accent/40 font-bold text-sm">Check Your Date</a>' +
        '</div></section>';
    },
  },
  {
    id: 'nature-focus', name: 'Nature Focus', navLabel: 'Expeditions',
    tagline: 'Wildlife & landscape photography from the wild side of India',
    fonts: { link: 'family=Fraunces:wght@500;700&family=Nunito+Sans:wght@400;700', head: "'Fraunces',serif", body: "'Nunito Sans',sans-serif" },
    c: { bg: '#f3f7f2', card: '#e2ede0', accent: '#2e6b3f', accentInk: '#ffffff', ink: '#1d3324', mut: '#5c7362', line: 'rgba(46,107,63,.3)' },
    imgs: IMGS.nature, galleryLayout: 'masonry', btnStyle: 'pill',
    services: [['Wildlife Expeditions', 'Tadoba, Kanha, Ranthambore — join a photo safari.'], ['Landscape Series', 'Himalayan and Western Ghats long-exposure work.'], ['Fine-Art Prints', 'Archival prints that fund forest conservation.']],
    quote: ['"His tiger series belongs in National Geographic."', '— Wild India Collective'],
    hero(t) {
      return '<section class="relative min-h-[82vh] flex items-center justify-center text-center">' +
        '<img src="' + img(t.imgs[0], 1200) + '" class="absolute inset-0 w-full h-full object-cover" alt="">' +
        '<div class="absolute inset-0 bg-black/45"></div>' +
        '<div class="relative px-6 text-white">' +
        '<p class="tracking-[.3em] uppercase text-xs opacity-90">Into the wild</p>' +
        '<h1 class="font-head text-5xl md:text-6xl mt-3">Nature Focus</h1>' +
        '<p class="mt-3 max-w-md mx-auto opacity-90 text-sm">' + t.tagline + '.</p>' +
        '<div class="mt-8 flex justify-center gap-3 flex-wrap">' +
        '<a href="portfolio.html" class="px-7 py-3.5 rounded-full bg-accent text-accentInk font-bold text-sm">Explore Expeditions</a>' +
        '<a href="contact.html" class="px-7 py-3.5 rounded-full bg-white/15 backdrop-blur border border-white/40 font-bold text-sm">Join a Safari</a>' +
        '</div></div></section>';
    },
  },
  {
    id: 'studio-pro', name: 'Studio Pro', navLabel: 'Services',
    tagline: 'Commercial product & brand photography that sells',
    fonts: { link: 'family=Manrope:wght@500;700;800', head: "'Manrope',sans-serif", body: "'Manrope',sans-serif" },
    c: { bg: '#f5f8ff', card: '#e4ecff', accent: '#1d4ed8', accentInk: '#ffffff', ink: '#101a33', mut: '#5a6b8c', line: 'rgba(29,78,216,.25)' },
    imgs: IMGS.product, galleryLayout: 'grid', btnStyle: 'soft',
    services: [['Product & E-commerce', 'White-background + lifestyle packs for marketplaces.'], ['Corporate Headshots', 'On-site team headshots, colour-managed and retouched.'], ['Brand Campaigns', 'Art-directed campaign shoots with full usage rights.']],
    quote: ['"Conversion on our listings jumped 32% after the reshoot."', '— Head of Growth, KartLeap'],
    hero(t) {
      return '<section class="px-6 pt-14 pb-12 max-w-5xl mx-auto">' +
        '<div class="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-xs font-bold text-accent">⚡ Trusted by 48+ brands</div>' +
        '<h1 class="font-head font-extrabold text-4xl md:text-5xl mt-5 leading-tight">Photos that make<br>products <span class="text-accent">fly off shelves.</span></h1>' +
        '<p class="mt-4 text-mut max-w-md">' + t.tagline + '. Brief on Monday, assets by Friday.</p>' +
        '<div class="mt-7 flex gap-3 flex-wrap">' +
        '<a href="contact.html" class="px-7 py-3.5 rounded-xl bg-accent text-accentInk font-bold text-sm shadow-lg shadow-accent/30">Get a Quote →</a>' +
        '<a href="portfolio.html" class="px-7 py-3.5 rounded-xl bg-card text-accent font-bold text-sm">View Services</a>' +
        '</div>' +
        '<div class="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">' +
        t.imgs.slice(0, 4).map(function (im) { return '<img src="' + img(im, 480) + '" class="rounded-2xl h-40 w-full object-cover bg-white shadow-sm" alt="">'; }).join('') +
        '</div>' +
        '<div class="mt-8 rounded-2xl bg-card p-4 flex flex-wrap gap-x-6 gap-y-2 justify-center text-xs font-bold text-mut">' +
        ['BRIEF', '→', 'SHOOT', '→', 'EDIT', '→', 'DELIVER IN 5 DAYS'].map(function (x) { return '<span class="' + (x === '→' ? 'text-accent' : '') + '">' + x + '</span>'; }).join('') +
        '</div></section>';
    },
  },
  {
    id: 'little-moments', name: 'Little Moments', navLabel: 'Sessions',
    tagline: 'Newborn, baby & family photography — soft, safe, full of love',
    fonts: { link: 'family=Quicksand:wght@500;700&family=Baloo+2:wght@600;700', head: "'Baloo 2',cursive", body: "'Quicksand',sans-serif" },
    c: { bg: '#fffdf5', card: '#fdeedd', accent: '#f4a259', accentInk: '#54402c', ink: '#54402c', mut: '#a08363', line: 'rgba(244,162,89,.4)' },
    imgs: IMGS.baby, galleryLayout: 'grid', btnStyle: 'pill',
    services: [['Newborn (0–30 days)', 'Safety-trained posing in a warm home studio.'], ['Milestones & Cake Smash', '6-month sitters and messy first-birthday fun.'], ['Maternity & Family', 'Outdoor golden-hour family sessions.']],
    quote: ['"So patient with our little one. The photos melt our hearts every day."', '— Aisha & Rohan, Nagpur'],
    hero(t) {
      return '<section class="px-6 pt-12 pb-10 text-center">' +
        '<div class="text-4xl">🧸</div>' +
        '<h1 class="font-head text-5xl mt-2">Little Moments</h1>' +
        '<p class="mt-3 text-mut max-w-sm mx-auto text-sm">' + t.tagline + '.</p>' +
        '<div class="mt-8 grid grid-cols-2 gap-3 max-w-sm mx-auto">' +
        '<img src="' + img(t.imgs[0], 500) + '" class="rounded-[2rem] h-52 w-full object-cover" alt="">' +
        '<img src="' + img(t.imgs[1], 500) + '" class="rounded-[2rem] h-52 w-full object-cover mt-6" alt="">' +
        '</div>' +
        '<div class="mt-9 flex justify-center gap-3">' +
        '<a href="portfolio.html" class="px-7 py-3.5 rounded-full bg-accent text-accentInk font-bold text-sm shadow-lg shadow-accent/40">See Sessions 🍼</a>' +
        '<a href="contact.html" class="px-7 py-3.5 rounded-full border-2 border-accent text-accent font-bold text-sm">Book a Slot</a>' +
        '</div>' +
        '<p class="mt-6 text-[11px] text-mut">✓ Safety-trained · ✓ Home-studio comfort · ✓ Parent-approved props</p>' +
        '</section>';
    },
  },
  {
    id: 'cinematic-reel', name: 'Cinematic Reel', navLabel: 'Films',
    tagline: 'Wedding films & cinematography with blockbuster energy',
    fonts: { link: 'family=Bebas+Neue&family=Sora:wght@400;600', head: "'Bebas Neue',sans-serif", body: "'Sora',sans-serif" },
    c: { bg: '#0d0d0f', card: '#1b1b20', accent: '#e50914', accentInk: '#ffffff', ink: '#f5f5f5', mut: '#9a9aa3', line: 'rgba(229,9,20,.35)' },
    imgs: IMGS.cinema, galleryLayout: 'filmstrip', btnStyle: 'sharp',
    services: [['Wedding Feature Films', '15–20 min cinematic films with licensed music.'], ['Teasers & Reels', '60-second trailers delivered within 48 hours.'], ['Corporate & Brand Films', 'Ad films, founder stories and event aftermovies.']],
    quote: ['"Our wedding film had a title card, a plot and an interval. Goosebumps."', '— The Kapoor Family'],
    hero(t) {
      return '<section class="relative min-h-[85vh] flex items-center justify-center text-center overflow-hidden">' +
        '<img src="' + img(t.imgs[0], 1200) + '" class="absolute inset-0 w-full h-full object-cover opacity-35" alt="">' +
        '<div class="absolute inset-x-0 top-0 h-10 bg-black"></div><div class="absolute inset-x-0 bottom-0 h-10 bg-black"></div>' +
        '<div class="relative px-6">' +
        '<p class="text-mut text-xs tracking-[.4em] uppercase">A WebsConnect Studios Production</p>' +
        '<h1 class="font-head text-7xl md:text-8xl tracking-wide mt-4 text-accent drop-shadow-[0_0_25px_rgba(229,9,20,.5)]">CINEMATIC REEL</h1>' +
        '<p class="mt-3 text-mut text-sm max-w-md mx-auto">' + t.tagline + '.</p>' +
        '<div class="mt-8 flex justify-center gap-3">' +
        '<a href="portfolio.html" class="px-8 py-3.5 bg-accent font-bold text-sm tracking-widest">▶ WATCH FILMS</a>' +
        '<a href="contact.html" class="px-8 py-3.5 border border-ink/40 font-bold text-sm tracking-widest">BOOK NOW</a>' +
        '</div></div></section>';
    },
  },
];

// ── Shared page builders ──────────────────────────────────────

function btnCls(t, filled) {
  const shape = t.btnStyle === 'pill' ? 'rounded-full' : t.btnStyle === 'soft' ? 'rounded-xl' : '';
  return filled
    ? 'px-6 py-3 ' + shape + ' bg-accent text-accentInk font-bold text-sm'
    : 'px-6 py-3 ' + shape + ' border border-accent text-accent font-bold text-sm';
}

function shell(t, title, active, body) {
  const nav = [
    ['index.html', 'Home', 'home'],
    ['portfolio.html', t.navLabel, 'portfolio'],
    ['contact.html', 'Contact', 'contact'],
  ].map(function (n) {
    const on = n[2] === active;
    return '<a href="' + n[0] + '" class="text-sm font-semibold ' + (on ? 'text-accent border-b-2 border-accent pb-0.5' : 'opacity-75 hover:opacity-100') + '">' + n[1] + '</a>';
  }).join('<span class="w-4"></span>');

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>' + title + ' — ' + t.name + '</title>\n' +
    '<link href="https://fonts.googleapis.com/css2?' + t.fonts.link + '&display=swap" rel="stylesheet">\n' +
    '<script src="https://cdn.tailwindcss.com"><\/script>\n' +
    '<script>tailwind.config={theme:{extend:{colors:{bg:"' + t.c.bg + '",card:"' + t.c.card + '",accent:"' + t.c.accent + '",accentInk:"' + t.c.accentInk + '",ink:"' + t.c.ink + '",mut:"' + t.c.mut + '"},fontFamily:{head:[' + JSON.stringify(t.fonts.head.replace(/'/g, '')) + '],body:[' + JSON.stringify(t.fonts.body.replace(/'/g, '')) + ']}}}}<\/script>\n' +
    '<style>body{font-family:' + t.fonts.body + '}.font-head{font-family:' + t.fonts.head + '}html{scroll-behavior:smooth}</style>\n' +
    '</head>\n<body class="bg-bg text-ink antialiased">\n' +
    '<header class="sticky top-0 z-40 backdrop-blur bg-bg/85" style="border-bottom:1px solid ' + t.c.line + '">' +
    '<div class="max-w-5xl mx-auto flex items-center justify-between px-5 py-3.5">' +
    '<a href="index.html" class="font-head text-lg text-accent">' + t.name + '</a>' +
    '<nav class="flex items-center">' + nav + '</nav>' +
    '</div></header>\n' +
    body +
    '\n<footer class="mt-4 px-6 py-10 text-center" style="border-top:1px solid ' + t.c.line + '">' +
    '<p class="font-head text-lg text-accent">' + t.name + '</p>' +
    '<p class="text-xs text-mut mt-1">' + t.tagline + '</p>' +
    '<div class="mt-4 flex justify-center gap-5 text-xs font-semibold">' +
    '<a href="index.html" class="hover:text-accent">Home</a><a href="portfolio.html" class="hover:text-accent">' + t.navLabel + '</a><a href="contact.html" class="hover:text-accent">Contact</a>' +
    '</div>' +
    '<p class="mt-5 text-[10px] text-mut opacity-70">Demo template · Built with <a class="underline" href="https://websconnect.in" target="_blank" rel="noopener">WebsConnect</a></p>' +
    '</footer>\n' +
    '<a href="' + DEMO_WA + '" target="_blank" rel="noopener" class="fixed bottom-5 right-5 z-50 w-13 h-13 px-4 py-3 rounded-full bg-[#25D366] text-white font-bold text-sm shadow-xl">WhatsApp 💬</a>\n' +
    '</body>\n</html>';
}

function homePage(t) {
  const services = '<section class="px-6 py-12 max-w-5xl mx-auto"><h2 class="font-head text-3xl text-center">What We Do</h2>' +
    '<div class="mt-8 grid md:grid-cols-3 gap-4">' +
    t.services.map(function (s, i) {
      return '<div class="bg-card p-6 ' + (t.btnStyle === 'sharp' ? '' : 'rounded-2xl') + '" style="border:1px solid ' + t.c.line + '">' +
        '<div class="text-accent font-head text-lg">0' + (i + 1) + '</div>' +
        '<h3 class="font-bold mt-2">' + s[0] + '</h3>' +
        '<p class="text-sm text-mut mt-2 leading-relaxed">' + s[1] + '</p></div>';
    }).join('') +
    '</div><div class="text-center mt-8"><a href="portfolio.html" class="' + btnCls(t, true) + '">Explore ' + t.navLabel + ' →</a></div></section>';

  const strip = '<section class="px-6 py-10"><div class="max-w-5xl mx-auto"><h2 class="font-head text-3xl text-center">Recent Work</h2>' +
    '<div class="mt-7 grid grid-cols-2 md:grid-cols-4 gap-3">' +
    t.imgs.slice(2, 6).map(function (im) { return '<a href="portfolio.html"><img src="' + img(im, 480) + '" class="h-44 w-full object-cover ' + (t.btnStyle === 'sharp' ? '' : 'rounded-2xl') + ' hover:opacity-85 transition" alt="work"></a>'; }).join('') +
    '</div></div></section>';

  const quote = '<section class="px-6 py-12"><div class="max-w-2xl mx-auto text-center">' +
    '<div class="font-head text-5xl text-accent leading-none">“</div>' +
    '<p class="font-head text-xl leading-relaxed">' + t.quote[0] + '</p>' +
    '<p class="mt-3 text-xs text-mut font-semibold">' + t.quote[1] + '</p></div></section>';

  const cta = '<section class="px-6 pb-12"><div class="max-w-3xl mx-auto bg-card text-center px-6 py-10 ' + (t.btnStyle === 'sharp' ? '' : 'rounded-3xl') + '" style="border:1px solid ' + t.c.line + '">' +
    '<h2 class="font-head text-2xl">Dates fill fast. Lock yours today.</h2>' +
    '<p class="text-sm text-mut mt-2">Tell us your date and vision — we reply within a few hours.</p>' +
    '<div class="mt-6 flex justify-center gap-3 flex-wrap">' +
    '<a href="contact.html" class="' + btnCls(t, true) + '">Book Now</a>' +
    '<a href="' + DEMO_WA + '" target="_blank" rel="noopener" class="' + btnCls(t, false) + '">WhatsApp Us</a>' +
    '</div></div></section>';

  return shell(t, 'Home', 'home', t.hero(t) + services + strip + quote + cta);
}

function galleryHtml(t) {
  const rounded = t.btnStyle === 'sharp' ? '' : 'rounded-2xl';
  if (t.galleryLayout === 'masonry') {
    return '<div class="columns-2 md:columns-3 gap-3 [&>img]:mb-3">' +
      t.imgs.map(function (im, i) { return '<img src="' + img(im, 600) + '" class="w-full object-cover ' + rounded + '" style="height:' + (i % 3 === 0 ? 300 : i % 3 === 1 ? 210 : 250) + 'px" alt="work">'; }).join('') +
      '</div>';
  }
  if (t.galleryLayout === 'filmstrip') {
    return [t.imgs.slice(0, 4), t.imgs.slice(4, 8)].map(function (row, r) {
      return '<p class="text-xs font-bold text-accent tracking-widest uppercase mb-2 ' + (r ? 'mt-8' : '') + '">Series ' + (r + 1) + '</p>' +
        '<div class="flex gap-3 overflow-x-auto pb-3 -mx-6 px-6">' +
        row.map(function (im) { return '<img src="' + img(im, 600) + '" class="h-60 w-72 shrink-0 object-cover ' + rounded + '" alt="work">'; }).join('') +
        '</div>';
    }).join('');
  }
  // uniform grid
  return '<div class="grid grid-cols-2 md:grid-cols-3 gap-3">' +
    t.imgs.map(function (im) { return '<img src="' + img(im, 600) + '" class="h-52 md:h-64 w-full object-cover ' + rounded + ' hover:opacity-85 transition" alt="work">'; }).join('') +
    '</div>';
}

function portfolioPage(t) {
  const chips = ['All', 'Featured', 'Recent', 'Client Work'].map(function (c, i) {
    return '<span class="px-4 py-1.5 text-xs font-bold ' + (t.btnStyle === 'sharp' ? '' : 'rounded-full') + ' ' + (i === 0 ? 'bg-accent text-accentInk' : 'bg-card text-mut') + '">' + c + '</span>';
  }).join('');

  const body = '<section class="px-6 pt-12 pb-6 text-center max-w-3xl mx-auto">' +
    '<h1 class="font-head text-4xl">' + t.navLabel + '</h1>' +
    '<p class="mt-3 text-mut text-sm">' + t.tagline + '. Every project below is real client work.</p>' +
    '<div class="mt-6 flex justify-center gap-2 flex-wrap">' + chips + '</div></section>' +
    '<section class="px-6 pb-10 max-w-5xl mx-auto">' + galleryHtml(t) + '</section>' +
    '<section class="px-6 pb-14 text-center">' +
    '<h2 class="font-head text-2xl">Liked what you saw?</h2>' +
    '<p class="text-sm text-mut mt-2">Let\u2019s create something like this for you.</p>' +
    '<div class="mt-5 flex justify-center gap-3"><a href="contact.html" class="' + btnCls(t, true) + '">Get in Touch →</a><a href="index.html" class="' + btnCls(t, false) + '">Back to Home</a></div>' +
    '</section>';

  return shell(t, t.navLabel, 'portfolio', body);
}

function contactPage(t) {
  const rounded = t.btnStyle === 'sharp' ? '' : 'rounded-2xl';
  const cards = [
    ['📞', 'Call Us', DEMO_PHONE, DEMO_TEL],
    ['💬', 'WhatsApp', 'Chat instantly', DEMO_WA],
    ['✉️', 'Email', 'hello@example.com', DEMO_MAIL],
    ['📍', 'Studio', 'Nagpur, Maharashtra', 'https://maps.google.com/?q=Nagpur'],
  ].map(function (c) {
    return '<a href="' + c[3] + '" ' + (c[3].startsWith('http') ? 'target="_blank" rel="noopener"' : '') + ' class="bg-card p-5 ' + rounded + ' block hover:opacity-90 transition" style="border:1px solid ' + t.c.line + '">' +
      '<div class="text-2xl">' + c[0] + '</div><div class="font-bold mt-2 text-sm">' + c[1] + '</div><div class="text-xs text-mut mt-1">' + c[2] + '</div></a>';
  }).join('');

  const form = '<form onsubmit="event.preventDefault();var n=this.n.value,m=this.m.value;window.open(\'https://wa.me/919876543210?text=\'+encodeURIComponent(\'Hi, I am \'+n+\'. \'+m),\'_blank\')" class="bg-card p-6 ' + rounded + '" style="border:1px solid ' + t.c.line + '">' +
    '<h2 class="font-head text-xl">Send an Enquiry</h2>' +
    '<input name="n" required placeholder="Your name" class="mt-4 w-full px-4 py-3 text-sm bg-bg ' + rounded + ' outline-none" style="border:1px solid ' + t.c.line + '">' +
    '<input name="m" required placeholder="Event date & what you need" class="mt-3 w-full px-4 py-3 text-sm bg-bg ' + rounded + ' outline-none" style="border:1px solid ' + t.c.line + '">' +
    '<button type="submit" class="mt-4 w-full py-3.5 ' + (t.btnStyle === 'pill' ? 'rounded-full' : t.btnStyle === 'soft' ? 'rounded-xl' : '') + ' bg-accent text-accentInk font-bold text-sm">Send on WhatsApp →</button>' +
    '<p class="mt-3 text-[10px] text-mut text-center">Opens WhatsApp with your message pre-filled.</p></form>';

  const hours = '<div class="bg-card p-6 ' + rounded + '" style="border:1px solid ' + t.c.line + '">' +
    '<h2 class="font-head text-xl">Studio Hours</h2>' +
    '<div class="mt-4 space-y-2 text-sm">' +
    [['Mon – Fri', '10:00 AM – 8:00 PM'], ['Saturday', '10:00 AM – 6:00 PM'], ['Sunday', 'Shoots only (by booking)']].map(function (h) {
      return '<div class="flex justify-between"><span class="text-mut">' + h[0] + '</span><span class="font-semibold">' + h[1] + '</span></div>';
    }).join('') +
    '</div></div>';

  const body = '<section class="px-6 pt-12 pb-8 text-center">' +
    '<h1 class="font-head text-4xl">Let\u2019s Talk</h1>' +
    '<p class="mt-3 text-mut text-sm max-w-md mx-auto">Bookings, pricing, dates — reach us any way you like. We usually reply within 2 hours.</p></section>' +
    '<section class="px-6 pb-8 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">' + cards + '</section>' +
    '<section class="px-6 pb-12 max-w-4xl mx-auto grid md:grid-cols-2 gap-4">' + form + hours + '</section>' +
    '<section class="px-6 pb-14 text-center"><a href="portfolio.html" class="' + btnCls(t, false) + '">← See our ' + t.navLabel.toLowerCase() + ' first</a></section>';

  return shell(t, 'Contact', 'contact', body);
}

// ── Build ─────────────────────────────────────────────────────
let count = 0;
TEMPLATES.forEach(function (t) {
  const dir = path.join(OUT_DIR, t.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), homePage(t));
  fs.writeFileSync(path.join(dir, 'portfolio.html'), portfolioPage(t));
  fs.writeFileSync(path.join(dir, 'contact.html'), contactPage(t));
  count += 3;
  console.log('✓ ' + t.id + ' (3 pages)');
});
console.log('\nDone: ' + count + ' pages written to public/templates/');
