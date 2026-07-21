'use strict';

const fs = require('fs');
const path = require('path');
const TEMPLATES = require('./template-gallery-data');

const OUT_DIR = path.join(__dirname, '..', 'public', 'templates');
const PHONE = '+91 98765 43210';
const TEL = 'tel:+919876543210';
const WA = 'https://wa.me/919876543210';
const MAP = 'https://maps.google.com/?q=Nagpur%2C%20Maharashtra';
const QR = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi%3A%2F%2Fpay%3Fpa%3Ddemo%40upi%26pn%3DBusiness';
const UPI = 'upi://pay?pa=demo@upi&pn=Business';

const FONT_PAIRS = [
  ['Playfair Display', 'Inter'], ['DM Serif Display', 'Nunito Sans'], ['Bebas Neue', 'Manrope'],
  ['Fraunces', 'Work Sans'], ['Sora', 'Inter'], ['Merriweather', 'Lato'], ['Oswald', 'Source Sans 3'],
  ['Cormorant Garamond', 'Montserrat'], ['Archivo Black', 'Roboto'], ['Libre Baskerville', 'Karla'],
];

const IMAGE_IDS = {
  food: ['photo-1555507036-ab1f4038808a', 'photo-1578985545062-69928b1d9587', 'photo-1551024506-0bccd828d307'],
  salon: ['photo-1560066984-138dadb4c035', 'photo-1522337360788-8b13dee7a37e', 'photo-1562322140-8baeececf3df'],
  fashion: ['photo-1445205170230-053b83016050', 'photo-1483985988355-763728e1935b', 'photo-1496747611176-843222e1e57c'],
  services: ['photo-1581578731548-c64695cc6952', 'photo-1621905252507-b35492cc74b4', 'photo-1505798577917-a65157d3320a'],
  photography: ['photo-1519741497674-611481863552', 'photo-1452587925148-ce544e77e70d', 'photo-1516035069371-29a1b244cc32'],
  clinic: ['photo-1538108149393-fbbd81895907', 'photo-1629909613654-28e377c37b09', 'photo-1576091160399-112ba8d25d1d'],
  education: ['photo-1523240795612-9a054b0db644', 'photo-1509062522246-3755977927d7', 'photo-1524178232363-1fb2b075b655'],
  auto: ['photo-1507136566006-cfc505b114fc', 'photo-1487754180451-c456f719a1fc', 'photo-1607860108855-64acf2078ed9'],
  movers: ['photo-1600518464441-9306b23ba1ff', 'photo-1586528116311-ad8dd3c8310d', 'photo-1601584115197-04ecc0da31d7'],
  legal: ['photo-1450101499163-c8848c66ca85', 'photo-1521791055366-0d553872125f', 'photo-1589829545856-d10d557cf95f'],
  interior: ['photo-1600566753086-00f18fb6b3ea', 'photo-1616486338812-3dadae4b4ace', 'photo-1600210492486-724fe5c67fb0'],
  venue: ['photo-1507504031003-b417219a0fde', 'photo-1519167758481-83f550bb49b3', 'photo-1464366400600-7168b8af9bc3'],
  petcare: ['photo-1450778869180-41d0601e046e', 'photo-1583337130417-3346a1be7dee', 'photo-1548199973-03cce0bbc87b'],
  tailor: ['photo-1558618666-fcd25c85cd64', 'photo-1598033129183-c4f50c736f10', 'photo-1617127365659-c47fa864d8bc'],
  agri: ['photo-1500382017468-9049fed747ef', 'photo-1464226184884-fa280b87c399', 'photo-1523348837708-15d4a09cfac2'],
  hardware: ['photo-1504148455328-c376907d081c', 'photo-1581244277943-fe4a9c777189', 'photo-1530124566582-a618bc2615dc'],
  coworking: ['photo-1497366811353-6870744d04b2', 'photo-1497366754035-f200968a6e72', 'photo-1497215728101-856f4ea42174'],
  printing: ['photo-1562654501-a0ccc0fc3fb1', 'photo-1586075010923-2dd4570fb338', 'photo-1568871391149-449702439177'],
  gadgets: ['photo-1581092921461-eab62e97a780', 'photo-1517336714731-489689fd1ca8', 'photo-1593642532400-2682810df593'],
  driving: ['photo-1449965408869-eaa3f722e40d', 'photo-1503736334956-4c8f8e92946d', 'photo-1493238792000-8113da705763'],
  cleaning: ['photo-1581578731548-c64695cc6952', 'photo-1527515637462-cff94eecc1ac', 'photo-1585421514738-01798e348b17'],
  mobileshop: ['photo-1511707171634-5f897ff02aa9', 'photo-1523206489230-c012c64b2b48', 'photo-1598327105666-5b89351aff97'],
  solar: ['photo-1508514177221-188b1cf16e9d', 'photo-1497435334941-8c899ee9e8e9', 'photo-1509391366360-2e959784a276'],
  gifts: ['photo-1549465220-1a8b9238cd48', 'photo-1513885535751-8b9238bd345a', 'photo-1602173574767-37ac01994b2a'],
  tutor: ['photo-1546410531-bb4caa6b424d', 'photo-1503676260728-1c00da094a0b', 'photo-1524178232363-1fb2b075b655'],
  sports: ['photo-1526232761682-d26e03ac148e', 'photo-1540747913346-19e32dc3e97e', 'photo-1579952363873-27f3bade9f55'],
  tattoo: ['photo-1598371839696-5c5bb00bdc28', 'photo-1568515045052-f9a854d70bfd', 'photo-1611501275019-9b5cda994e8d'],
  babystore: ['photo-1515488042361-ee00e0ddd4e4', 'photo-1596461404969-9ae70f2830c1', 'photo-1519689680058-324335c77eba'],
  warehouse: ['photo-1553413077-190dd305871c', 'photo-1586528116311-ad8dd3c8310d', 'photo-1565793298595-6a879b1d9492'],
  tyre: ['photo-1578844251758-2f71da64c96f', 'photo-1486262715619-67b85e0b08d3', 'photo-1492144534655-ae79c964c9d7'],
};

const CONTENT = {
  food: ['Freshly baked happiness, every day', ['Signature Cakes', 'Flaky Pastries', 'Celebration Hampers'], ['Pure Ingredients', 'Fresh Daily', 'Custom Designs'], ['Cakes', 'Pastries', 'Savories'], ['Chocolate Truffle|₹699', 'Butter Croissant|₹120', 'Paneer Puff|₹90']],
  salon: ['Transform your look today', ['Bridal Glow', 'Hair Spa', 'Nail Art'], ['Expert Stylists', 'Hygienic Studio', 'Flexible Slots'], ['Hair', 'Skin', 'Nails'], ['Precision Haircut|₹499', 'Hydra Facial|₹1,499', 'Gel Nail Art|₹899']],
  fashion: ['Style made for your moment', ['Festive Edit', 'Modern Classics', 'Accessories'], ['Custom Fitting', 'Premium Fabrics', 'Easy Support'], ['Ethnic', 'Western', 'Accessories'], ['Silk Celebration Saree|₹3,499', 'Evening Co-ord Set|₹2,299', 'Statement Clutch|₹999']],
  services: ['Trusted repairs, right at your door', ['AC Service', 'Plumbing', 'Electrical'], ['Verified Team', 'Upfront Rates', 'Service Support'], ['Repair', 'Installation', 'Maintenance'], ['AC Jet Wash|₹699', 'Tap Replacement|₹299', 'Switchboard Repair|₹399']],
  photography: ['Stories that live beyond the moment', ['Weddings', 'Portraits', 'Commercial'], ['Cinematic Frames', 'Curated Edits', 'Clear Packages'], ['Weddings', 'Portraits', 'Commercial'], ['Intimate Wedding Story|From ₹35,000', 'Editorial Portrait Session|From ₹7,500', 'Brand Campaign|Quote on request']],
  clinic: ['Thoughtful care for every family', ['Preventive Care', 'Advanced Treatment', 'Follow-up Support'], ['Modern Facility', 'Sterilized Equipment', 'Easy Appointments'], ['Consultation', 'Dental', 'Wellness'], ['General Consultation|₹500', 'Dental Cleaning|From ₹999', 'Preventive Health Review|₹799']],
  education: ['Learn with clarity. Achieve with confidence.', ['Foundation Batch', 'Entrance Prep', 'Skill Courses'], ['Small Batches', 'Practice Tests', 'Personal Mentoring'], ['Foundation', 'Entrance', 'Skills'], ['Class 8–10 Foundation|₹1,999/mo', 'Entrance Test Prep|₹3,499/mo', 'Communication Skills|₹1,499/mo']],
  auto: ['Bring back the showroom shine', ['Express Wash', 'Interior Detail', 'Ceramic Care'], ['Quality Products', 'Skilled Detailers', 'Slot-Based Service'], ['Silver', 'Gold', 'Platinum'], ['Express Wash|₹599', 'Deep Interior Detail|₹2,499', 'Ceramic Protection|From ₹9,999']],
  movers: ['Safe, organized relocation from door to door', ['Home Shifting', 'Office Moves', 'Vehicle Transport'], ['Trained Crew', 'Quality Packing', 'On-Time Planning'], ['Local', 'Intercity', 'Storage'], ['Local 1BHK Move|From ₹4,999', 'Intercity 2BHK Move|Estimate required', 'Monthly Storage|From ₹1,499']],
  legal: ['Compliance and tax support made simple', ['GST Registration', 'ITR Filing', 'Company Setup'], ['Confidential Process', 'Clear Documentation', 'Professional Guidance'], ['Business Setup', 'Tax', 'Legal'], ['GST Registration Support|₹1,499', 'Individual ITR Filing|₹999', 'Private Limited Setup|From ₹7,999']],
  interior: ['Turn your space into a place you love', ['Full Home Design', 'Modular Kitchen', 'Commercial Interiors'], ['Quality Materials', 'Thoughtful Planning', 'Transparent Budgets'], ['Modern', 'Classic', 'Industrial'], ['Modern Living Room|From ₹2.5L', 'Modular Kitchen|From ₹1.8L', 'Office Transformation|Custom quote']],
  venue: ['Celebrate your biggest moments in grand style', ['Wedding Celebrations', 'Corporate Events', 'Private Parties'], ['Elegant Spaces', 'Curated Catering', 'Event Support'], ['Decor', 'Catering', 'Venue Tour'], ['Royal Wedding Package|From ₹2.5L', 'Corporate Day Event|From ₹95,000', 'Celebration Dinner|From ₹1,200/plate']],
  petcare: ['Gentle care for happy, healthy pets', ['Grooming Spa', 'Vet Consultation', 'Pet Boarding'], ['Stress-Free Handling', 'Clean Facilities', 'Pet-First Care'], ['Grooming', 'Vet Care', 'Boarding'], ['Bath & Dry|From ₹599', 'Full Grooming|From ₹999', 'Vet Consultation|₹500']],
  tailor: ['Bespoke fits, finished by hand', ['Suits & Blazers', 'Ethnic Wear', 'Alterations'], ['Precise Fitting', 'Fabric Guidance', 'Doorstep Measurement'], ['Menswear', 'Womenswear', 'Uniforms'], ['Shirt Stitching|₹699', 'Designer Blouse|From ₹1,299', 'Two-Piece Suit|From ₹5,999']],
  agri: ['Reliable farm inputs for a stronger harvest', ['Hybrid Seeds', 'Crop Nutrition', 'Farm Tools'], ['Genuine Products', 'Seasonal Guidance', 'Bulk Support'], ['Seeds', 'Nutrition', 'Equipment'], ['Hybrid Vegetable Seeds|₹450/pack', 'Organic Soil Booster|₹799/bag', 'Battery Sprayer|₹2,499']],
  hardware: ['Everything your project needs, under one roof', ['Plumbing', 'Electricals', 'Sanitaryware'], ['Original Products', 'Bulk Rates', 'Site Delivery Support'], ['Plumbing', 'Electrical', 'Sanitaryware'], ['CPVC Pipe Bundle|Quote on request', 'Modular Switch Set|From ₹499', 'Countertop Basin|From ₹2,999']],
  coworking: ['A better place to focus, meet and grow', ['Flexi Desks', 'Private Cabins', 'Meeting Rooms'], ['Fast Wi-Fi', 'Power Backup', 'Ergonomic Setup'], ['Flexi', 'Cabin', 'Meeting'], ['Day Pass|₹399/day', 'Dedicated Desk|₹5,999/mo', 'Meeting Room|₹699/hour']],
  printing: ['Sharp print. Strong impact.', ['Business Stationery', 'Signage', 'Custom Merchandise'], ['High-Resolution Output', 'Fast Proofing', 'Bulk Pricing'], ['Stationery', 'Signage', 'Gifts'], ['Premium Visiting Cards|₹1,299/1000', 'Star Flex Banner|₹35/sq.ft', 'Custom Printed Mug|₹299']],
  gadgets: ['Fast, careful repairs for the tech you rely on', ['Screen Repair', 'Battery Service', 'Laptop Care'], ['Data-Safe Process', 'Clear Estimates', 'Tested Parts'], ['Mobile', 'Laptop', 'Refurbished'], ['Phone Screen Replacement|From ₹1,499', 'Battery Replacement|From ₹999', 'Laptop Service|₹799']],
  driving: ['Learn to drive with calm, practical coaching', ['Beginner Course', 'Refresher Course', 'RTO Assistance'], ['Dual-Control Cars', 'Flexible Slots', 'Structured Lessons'], ['Beginner', 'Refresher', 'RTO'], ['Beginner 15-Day Course|₹5,999', 'Refresher 7-Day Course|₹3,499', 'RTO Documentation Support|Quote']],
  cleaning: ['A cleaner, healthier space starts here', ['Deep Cleaning', 'Sofa Care', 'Pest Control'], ['Family-Safe Products', 'Verified Team', 'Professional Equipment'], ['Home', 'Pest', 'Upholstery'], ['1BHK Deep Cleaning|₹2,499', 'Cockroach Treatment|From ₹999', 'Sofa Shampooing|₹399/seat']],
  mobileshop: ['Smart accessories and mobile services, in one stop', ['Premium Covers', 'Audio & Charging', 'SIM & DTH'], ['Tested Products', 'Latest Models', 'Quick Fitting'], ['Covers', 'Audio', 'Services'], ['Armor Phone Case|₹499', 'Wireless Earbuds|₹1,299', 'Tempered Glass Fitting|₹199']],
  solar: ['Power your future with rooftop solar', ['On-Grid Systems', 'Battery Backup', 'Commercial Solar'], ['Site-Based Design', 'Net-Metering Support', 'Performance Guidance'], ['On-Grid', 'Off-Grid', 'Commercial'], ['3kW Home System|Estimate after survey', '5kW Hybrid System|Custom quote', 'Commercial Rooftop|Site assessment']],
  gifts: ['Make every gift personal', ['Photo Gifts', 'Corporate Awards', 'Celebration Hampers'], ['Custom Designs', 'Proof Before Print', 'Careful Packing'], ['Personalized', 'Trophies', 'Hampers'], ['Magic Photo Mug|₹399', 'Crystal Trophy|From ₹699', 'Celebration Hamper|From ₹999']],
  tutor: ['Build fluency, confidence and real-world skill', ['Spoken English', 'Foreign Languages', 'IELTS Prep'], ['Personal Attention', 'Flexible Batches', 'Practical Sessions'], ['English', 'Foreign', 'Test Prep'], ['Spoken English Foundation|₹2,499', 'German A1|₹5,999', 'IELTS Preparation|₹7,499']],
  sports: ['Train harder. Play longer. Book your ground.', ['Sports Academy', 'Turf Rental', 'Weekend Leagues'], ['Experienced Coaches', 'Quality Facilities', 'Flexible Bookings'], ['Academy', 'Turf', 'Events'], ['Junior Cricket Academy|₹2,499/mo', 'Football Turf|₹1,200/hour', 'Corporate Tournament|Custom quote']],
  tattoo: ['Original art, made part of you', ['Custom Tattoos', 'Fine-Line Work', 'Piercing'], ['Sterile Setup', 'Single-Use Needles', 'Aftercare Guidance'], ['Minimal', 'Blackwork', 'Color'], ['Minimal Tattoo|From ₹1,499', 'Custom Blackwork|Design quote', 'Professional Piercing|From ₹699']],
  babystore: ['Gentle essentials for every little milestone', ['Newborn Care', 'Learning Toys', 'Maternity'], ['Parent-Friendly Guidance', 'Age-Appropriate Picks', 'Safety-Focused Range'], ['Newborn', 'Toys', 'Maternity'], ['Newborn Essentials Kit|₹1,499', 'Wooden Learning Toy|₹699', 'Maternity Support Pillow|₹1,199']],
  warehouse: ['Secure, scalable storage for growing businesses', ['Dry Storage', 'Cold Storage', 'Inventory Handling'], ['Monitored Facility', 'Organized Handling', 'Flexible Space'], ['Dry', 'Cold', 'Handling'], ['Dry Storage Bay|From ₹18/sq.ft', 'Temperature-Controlled Space|Custom rate', 'Pick & Pack Service|Per order']],
  tyre: ['Grip, balance and confidence for every drive', ['Tyre Replacement', 'Wheel Alignment', 'Battery Care'], ['Precision Equipment', 'Multi-Brand Options', 'Fast Fitment'], ['Tyres', 'Alignment', 'Battery'], ['Wheel Alignment|₹599', 'Wheel Balancing|₹399', 'Battery Check & Fitment|Free with purchase']],
};

function image(niche, index, width) {
  const ids = IMAGE_IDS[niche] || IMAGE_IDS.services;
  return `https://images.unsplash.com/${ids[index % ids.length]}?auto=format&fit=crop&q=82&w=${width || 1000}`;
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function waText(text) {
  return `${WA}?text=${encodeURIComponent(text)}`;
}

function theme(t, index) {
  const fonts = FONT_PAIRS[index % FONT_PAIRS.length];
  return {
    ...t,
    head: fonts[0],
    body: fonts[1],
    content: CONTENT[t.niche],
    images: IMAGE_IDS[t.niche],
    radius: index % 3 === 0 ? '0' : index % 3 === 1 ? '1.25rem' : '.6rem',
  };
}

function button(t, href, label, outline) {
  return `<a href="${href}" class="inline-flex items-center justify-center px-6 py-3 font-bold transition hover:-translate-y-0.5 ${outline ? 'border-2' : ''}" style="border-radius:${t.radius};${outline ? `border-color:${t.colors.accent};color:${t.colors.accent}` : `background:${t.colors.accent};color:${t.colors.bg}`}">${label}</a>`;
}

function ecosystem(t) {
  if (!['venue', 'sports'].includes(t.niche)) return '';
  return `<section class="px-5 py-5 text-center" style="background:${t.colors.accent};color:${t.colors.bg}"><p class="text-sm font-bold">Part of the StadiumConnect ecosystem for sports venues and mega-event bookings · <a class="underline" href="https://stadiumconnect.in" target="_blank" rel="noopener">Visit StadiumConnect →</a></p></section>`;
}

function shell(t, title, active, body) {
  const secondLabel = t.page2 === 'ratecard' ? 'Rate Card' : t.page2[0].toUpperCase() + t.page2.slice(1);
  const links = [['index.html', 'Home', 'home'], [`${t.page2}.html`, secondLabel, 'second'], ['contact.html', 'Contact', 'contact']];
  const nav = links.map(([href, label, key]) => `<a href="${href}" class="text-xs sm:text-sm font-bold ${active === key ? 'border-b-2 pb-1' : 'opacity-70 hover:opacity-100'}" style="${active === key ? `border-color:${t.colors.accent};color:${t.colors.accent}` : ''}">${label}</a>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)} — ${esc(t.name)}</title>
  <meta name="description" content="${esc(t.desc)}">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${t.head.replace(/ /g, '+')}:wght@600;700&family=${t.body.replace(/ /g, '+')}:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>:root{--bg:${t.colors.bg};--card:${t.colors.card};--accent:${t.colors.accent};--text:${t.colors.text}}html{scroll-behavior:smooth}body{font-family:'${t.body}',sans-serif;background:var(--bg);color:var(--text)}h1,h2,h3,.display{font-family:'${t.head}',serif}.card{background:var(--card);border-radius:${t.radius};box-shadow:0 14px 40px rgba(15,23,42,.08)}input,select,textarea{color:#172033}</style>
</head>
<body>
  <header class="sticky top-0 z-50 border-b backdrop-blur-xl" style="background:${t.colors.bg}eF;border-color:${t.colors.accent}33">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3"><a href="index.html" class="display text-lg font-bold" style="color:${t.colors.accent}">${t.emoji} ${esc(t.name)}</a><nav class="flex gap-4 sm:gap-7">${nav}</nav></div>
  </header>
  ${body}
  <footer class="border-t px-5 py-10 text-center" style="border-color:${t.colors.accent}33"><p class="display text-xl font-bold">${esc(t.name)}</p><div class="mt-3 flex justify-center gap-5 text-sm">${links.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}</div><p class="mt-4 text-xs opacity-60">Demo website by WebsConnect · Nagpur, Maharashtra</p></footer>
  <a href="${waText(`Hi ${t.name}, I would like more information.`)}" target="_blank" rel="noopener" class="fixed bottom-4 right-4 z-50 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-white shadow-xl">WhatsApp 💬</a>
</body></html>`;
}

function homePage(t) {
  const [headline, cards, trust] = t.content;
  const cardsHtml = cards.map((name, i) => `<article class="card overflow-hidden"><img src="${image(t.niche, i + 1, 650)}" alt="${esc(name)}" class="h-44 w-full object-cover"><div class="p-5"><p class="text-xs font-bold uppercase tracking-widest" style="color:${t.colors.accent}">0${i + 1}</p><h3 class="mt-2 text-xl font-bold">${esc(name)}</h3><p class="mt-2 text-sm opacity-70">Thoughtfully designed service with clear guidance and easy WhatsApp assistance.</p></div></article>`).join('');
  return shell(t, 'Home', 'home', `
    <main>
      <section class="relative min-h-[76vh] overflow-hidden px-5 py-20 flex items-center">
        <img src="${image(t.niche, 0, 1600)}" alt="${esc(t.category)}" class="absolute inset-0 h-full w-full object-cover">
        <div class="absolute inset-0 bg-black/55"></div>
        <div class="relative mx-auto w-full max-w-6xl text-white"><p class="text-xs font-bold uppercase tracking-[.3em]">${esc(t.category)} · Nagpur</p><h1 class="mt-4 max-w-3xl text-5xl font-bold leading-tight md:text-7xl">${esc(headline)}</h1><p class="mt-5 max-w-xl text-base text-white/80 md:text-lg">${esc(t.desc)}</p><div class="mt-8 flex flex-wrap gap-3">${button(t, `${t.page2}.html`, `Explore ${t.page2 === 'ratecard' ? 'Rate Card' : t.page2}`, false)}${button(t, 'contact.html', 'Book / Enquire', true)}</div></div>
      </section>
      ${ecosystem(t)}
      <section class="px-5 py-8"><div class="mx-auto grid max-w-6xl grid-cols-1 gap-3 sm:grid-cols-3">${trust.map(x => `<div class="card p-4 text-center text-sm font-bold">✓ ${esc(x)}</div>`).join('')}</div></section>
      <section class="px-5 py-14"><div class="mx-auto max-w-6xl"><div class="max-w-2xl"><p class="text-xs font-bold uppercase tracking-widest" style="color:${t.colors.accent}">What we offer</p><h2 class="mt-2 text-4xl font-bold">Made around what customers need most</h2></div><div class="mt-8 grid gap-5 md:grid-cols-3">${cardsHtml}</div><div class="mt-8">${button(t, `${t.page2}.html`, `View full ${t.page2}`, false)}</div></div></section>
      <section class="px-5 pb-16"><div class="card mx-auto max-w-5xl p-8 text-center md:p-12"><p class="text-sm font-bold" style="color:${t.colors.accent}">QUICK CONTACT</p><h2 class="mt-2 text-3xl font-bold">Ready when you are</h2><p class="mt-3 opacity-70">Call ${PHONE} · Open Monday–Saturday, 9:00 AM–7:00 PM · Nagpur, Maharashtra</p><div class="mt-6 flex flex-wrap justify-center gap-3">${button(t, TEL, 'Call Now', false)}${button(t, waText(`Hi ${t.name}, I would like to enquire.`), 'WhatsApp Us', true)}</div></div></section>
    </main>`);
}

function secondPage(t) {
  const categories = t.content[3];
  const items = t.content[4].map((entry, i) => {
    const [name, price] = entry.split('|');
    return { name, price, category: categories[i % categories.length] };
  });
  const filters = ['All', ...categories].map((cat, i) => `<button type="button" data-filter="${esc(cat)}" class="filter px-4 py-2 text-sm font-bold ${i ? 'opacity-70' : ''}" style="border-radius:999px;${i ? `background:${t.colors.card}` : `background:${t.colors.accent};color:${t.colors.bg}`}">${esc(cat)}</button>`).join('');
  const itemCards = items.concat(items.map((x, i) => ({ ...x, name: `${x.name} ${i % 2 ? 'Plus' : 'Classic'}` }))).map((item, i) => `<article class="product card overflow-hidden" data-category="${esc(item.category)}"><img src="${image(t.niche, i + 1, 700)}" alt="${esc(item.name)}" class="h-52 w-full object-cover"><div class="p-5"><p class="text-xs font-bold uppercase tracking-wider" style="color:${t.colors.accent}">${esc(item.category)}</p><h3 class="mt-2 text-xl font-bold">${esc(item.name)}</h3><p class="mt-2 text-sm opacity-65">Quality options, practical guidance and transparent assistance.</p><div class="mt-5 flex items-center justify-between gap-3"><strong>${esc(item.price)}</strong><a href="${waText(`Hi ${t.name}, I am interested in ${item.name}.`)}" target="_blank" rel="noopener" class="rounded-full px-4 py-2 text-xs font-bold" style="background:${t.colors.accent};color:${t.colors.bg}">Ask on WhatsApp</a></div></div></article>`).join('');
  const special = {
    photography: ['Package pricing', 'Choose Essential, Signature or Premium coverage, then request availability.', 'Open any image to discuss a similar shoot.'],
    interior: ['Instant cost estimator', 'Select your home size for a planning range.', '1BHK: ₹4–7L · 2BHK: ₹7–12L · 3BHK: ₹11–18L (estimates)'],
    solar: ['Savings estimator', 'A site survey confirms system size and payback.', '₹2,000–₹5,000 bill: consider 3kW · ₹5,000+: consider 5kW (estimates)'],
    movers: ['How shifting works', 'Packing → Loading → Safe Transit → Unpacking', 'Final rates depend on distance, floor access and volume.'],
  }[t.niche] || ['How it works', 'Choose an option → Send your requirement → Confirm on WhatsApp', 'Every quote is confirmed before work begins.'];
  return shell(t, t.page2, 'second', `
    <main class="px-5 py-14"><section class="mx-auto max-w-6xl"><p class="text-xs font-bold uppercase tracking-[.25em]" style="color:${t.colors.accent}">${esc(t.category)}</p><h1 class="mt-2 text-5xl font-bold">${esc(t.page2 === 'ratecard' ? 'Rate Card' : t.page2[0].toUpperCase() + t.page2.slice(1))}</h1><p class="mt-4 max-w-2xl opacity-70">Explore detailed options, transparent sample pricing and direct assistance from ${esc(t.name)}.</p><div class="mt-7 flex flex-wrap gap-2">${filters}</div></section>
      <section class="mx-auto mt-9 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3" id="products">${itemCards}</section>
      <section class="card mx-auto mt-14 max-w-6xl p-7 md:p-10"><h2 class="text-3xl font-bold">${special[0]}</h2><p class="mt-3 opacity-70">${special[1]}</p><p class="mt-4 font-bold" style="color:${t.colors.accent}">${special[2]}</p><div class="mt-6">${button(t, 'contact.html', 'Continue to booking', false)}</div></section>
    </main>
    <script>
      document.querySelectorAll('.filter').forEach(function(button){button.addEventListener('click',function(){var selected=button.dataset.filter;document.querySelectorAll('.product').forEach(function(card){card.style.display=selected==='All'||card.dataset.category===selected?'block':'none'});document.querySelectorAll('.filter').forEach(function(x){x.style.opacity='.65'});button.style.opacity='1'})});
    <\/script>`);
}

function formFields(t) {
  const fields = {
    salon: [['date', 'Preferred date'], ['select', 'Service', 'Hair service|Skin service|Nail service'], ['select', 'Time slot', 'Morning|Afternoon|Evening']],
    clinic: [['date', 'Preferred date'], ['select', 'Preferred slot', 'Morning|Evening'], ['text', 'Issue or treatment']],
    movers: [['text', 'Moving from'], ['text', 'Moving to'], ['date', 'Shifting date']],
    venue: [['select', 'Event type', 'Wedding|Birthday|Corporate'], ['number', 'Expected guests'], ['date', 'Preferred date']],
    sports: [['select', 'Booking type', 'Academy admission|Turf rental|Tournament'], ['date', 'Preferred date'], ['select', 'Preferred slot', 'Morning|Afternoon|Evening']],
    tattoo: [['select', 'Service', 'Custom tattoo|Cover-up|Piercing'], ['text', 'Style and placement'], ['date', 'Consultation date']],
    babystore: [['text', 'Child age / maternity stage'], ['text', 'Product needed'], ['text', 'Budget range']],
    warehouse: [['select', 'Storage type', 'Dry storage|Cold storage|Inventory handling'], ['text', 'Space or pallet requirement'], ['date', 'Required from']],
    tyre: [['text', 'Vehicle model'], ['select', 'Service', 'Tyre replacement|Alignment|Balancing|Battery'], ['date', 'Preferred date']],
    solar: [['number', 'Monthly electricity bill'], ['number', 'Roof area (sq.ft)'], ['select', 'Connection type', 'Residential|Commercial']],
  };
  return fields[t.niche] || [['text', 'Service or product needed'], ['date', 'Preferred date'], ['text', 'Area / location']];
}

function contactPage(t) {
  const inputs = formFields(t).map(([type, label, options], index) => {
    if (type === 'select') return `<label class="block text-sm font-bold">${label}<select name="field${index}" required class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"><option value="">Choose one</option>${options.split('|').map(x => `<option>${esc(x)}</option>`).join('')}</select></label>`;
    return `<label class="block text-sm font-bold">${label}<input name="field${index}" type="${type}" required placeholder="${esc(label)}" class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"></label>`;
  }).join('');
  return shell(t, 'Contact', 'contact', `
    <main class="px-5 py-14"><section class="mx-auto max-w-6xl text-center"><p class="text-xs font-bold uppercase tracking-[.25em]" style="color:${t.colors.accent}">Contact & booking</p><h1 class="mt-2 text-5xl font-bold">Let’s plan the next step</h1><p class="mx-auto mt-4 max-w-2xl opacity-70">Use the form for a pre-filled WhatsApp request, or reach ${esc(t.name)} directly.</p></section>
      <section class="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-3"><a class="card p-6" href="${TEL}"><span class="text-2xl">📞</span><h2 class="mt-3 text-lg font-bold">Call us</h2><p class="mt-1 text-sm opacity-70">${PHONE}</p></a><a class="card p-6" href="${waText(`Hi ${t.name}`)}" target="_blank" rel="noopener"><span class="text-2xl">💬</span><h2 class="mt-3 text-lg font-bold">WhatsApp</h2><p class="mt-1 text-sm opacity-70">Quick questions and bookings</p></a><a class="card p-6" href="${MAP}" target="_blank" rel="noopener"><span class="text-2xl">📍</span><h2 class="mt-3 text-lg font-bold">Visit us</h2><p class="mt-1 text-sm opacity-70">Nagpur, Maharashtra · Open in Maps</p></a></section>
      <section class="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[1.3fr_.7fr]"><form id="booking-form" class="card space-y-5 p-6 md:p-8"><h2 class="text-2xl font-bold">Send an enquiry</h2><label class="block text-sm font-bold">Your name<input name="name" required placeholder="Your name" class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"></label>${inputs}<label class="block text-sm font-bold">Notes<textarea name="notes" rows="3" placeholder="Anything else we should know?" class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"></textarea></label><button class="w-full px-6 py-3 font-bold" style="border-radius:${t.radius};background:${t.colors.accent};color:${t.colors.bg}" type="submit">Send on WhatsApp →</button></form>
        <aside class="space-y-5"><div class="card p-6"><h2 class="text-2xl font-bold">Direct payment</h2><p class="mt-2 text-sm opacity-70">Scan the demo UPI QR or open your UPI app.</p><img src="${QR}" alt="Demo UPI payment QR code" class="mx-auto mt-5 h-[220px] w-[220px] rounded-xl bg-white p-2"><a href="${UPI}" class="mt-4 block text-center font-bold underline" style="color:${t.colors.accent}">Pay demo@upi</a></div><div class="card p-6"><h2 class="text-xl font-bold">What customers value</h2><div class="mt-4 space-y-3 text-sm">${t.content[2].map(x => `<p>★★★★★ <strong>${esc(x)}</strong></p>`).join('')}</div><a class="mt-5 block text-sm font-bold underline" href="${MAP}" target="_blank" rel="noopener">Open in Google Maps →</a></div></aside>
      </section>
    </main>
    <script>
      document.getElementById('booking-form').addEventListener('submit',function(event){event.preventDefault();var data=new FormData(event.currentTarget),lines=['Hi ${esc(t.name)}, I would like to enquire:'];data.forEach(function(value,key){if(value)lines.push(key+': '+value)});window.open('${WA}?text='+encodeURIComponent(lines.join('\\n')),'_blank','noopener')});
    <\/script>`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const entry of fs.readdirSync(OUT_DIR, { withFileTypes: true })) {
  if (entry.isDirectory()) fs.rmSync(path.join(OUT_DIR, entry.name), { recursive: true, force: true });
}

let pages = 0;
TEMPLATES.forEach((raw, index) => {
  const t = theme(raw, index);
  const dir = path.join(OUT_DIR, t.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), homePage(t));
  fs.writeFileSync(path.join(dir, `${t.page2}.html`), secondPage(t));
  fs.writeFileSync(path.join(dir, 'contact.html'), contactPage(t));
  pages += 3;
  console.log(`✓ ${t.id}: index.html, ${t.page2}.html, contact.html`);
});

console.log(`\nDone: ${TEMPLATES.length} templates × 3 pages = ${pages} pages written to public/templates/`);
