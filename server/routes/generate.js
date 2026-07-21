'use strict';

const crypto = require('crypto');
const { getPool } = require('../db/sites');
const { authMiddleware } = require('./auth');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'websconnect.in';

const NICHE_NAMES = {
  food: 'Food, Restaurant & Cafe',
  fashion: 'Fashion, Clothing & Boutique',
  services: 'Local Services Business',
  creative: 'Creative Agency or Freelancer',
  clinic: 'Clinic, Healthcare & Pharmacy',
  education: 'Coaching, School & Education',
  photography: 'Photography Studio',
  gym: 'Gym & Fitness Center',
  bakery: 'Bakery & Cafe',
  salon: 'Salon & Spa',
  business: 'Local Business',
  portfolio: 'Personal Portfolio',
  store: 'Online Store',
  blog: 'Blog',
  auto: 'Auto Garage, Car Wash & Detailing',
  movers: 'Packers, Movers & Transport',
  legal: 'Legal, CA & Financial Consultancy',
  interior: 'Interior Design & Contracting',
  venue: 'Event Venue, Banquet Hall & Catering',
  petcare: 'Pet Care, Vet Clinic & Grooming',
  tailor: 'Custom Tailoring & Fashion Design',
  agri: 'Agriculture Equipment, Seeds & Nursery',
};

// ── Category page blueprints ──────────────────────────────────
// Exact 3-page structures per business category. The AI must follow
// the matching blueprint so every generated site has the right
// conversion-focused layout for its niche.

const FOOD_BLUEPRINT = {
  second: 'menu',
  text: `PAGE 1 — HOME (===PAGE:index===):
- Header: business name/logo, nav (Home, Menu, Contact Us), WhatsApp CTA button in the header.
- Hero: high-res food/bakery image background, catchy localized headline (e.g. "Freshly Baked Everyday in <city>"), two CTAs: "Order on WhatsApp" (wa.me) + "View Menu" (/menu).
- Top 3 Bestsellers: card layout with image, item name, price tag, and an "Add to Order" button that opens WhatsApp with that exact item name pre-filled.
- Why Choose Us: 3 icon cards (e.g. 100% Eggless, Pure Butter, Same-Day Delivery — adapt to the supplied details).
- Quick Contact Strip: phone, shop address, today's opening hours (only supplied details).
PAGE 2 — FULL MENU (===PAGE:menu===):
- Category filter tabs: [All] [Cakes] [Pastries] [Savories] [Beverages] (adapt categories to the actual business) — must actually filter the grid with vanilla JS.
- Product grid: each item has image, name, weight/size options (500g / 1kg), price, and a direct WhatsApp order button that sends the exact item name in the chat message.
- Custom Order Banner: "Planning a Wedding or Birthday? Order Custom Designer Cakes" with a CTA to /contact.
PAGE 3 — ABOUT, REVIEWS & LOCATION (===PAGE:contact===):
- Founder/bakery story: short paragraph about the journey and hygiene standards.
- Customer testimonials: 4-5 star review cards.
- Location & hours: exact address, opening/closing timings, and an "Open in Google Maps" link (https://maps.google.com/?q=<address>) if the address is supplied.
- Direct Payment: if a UPI ID is supplied, embed a UPI QR code image (https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=<url-encoded upi://pay?pa=UPIID&pn=NAME>) plus an upi://pay button.`,
};

const SALON_GYM_BLUEPRINT = {
  second: 'services',
  text: `PAGE 1 — HOME (===PAGE:index===):
- Hero banner: premium interior photo, headline like "Transform Your Look Today" (adapt for gym), CTA button "Book Appointment" → /contact.
- Popular Packages: 3 pricing cards (e.g. Bridal Glow, Hair Spa Combo, Monthly Gym Pass — adapt) each with a booking CTA.
- Stats counter strip: use supplied numbers/ratings only; otherwise qualitative badges (Expert Stylists, Hygienic Studio, Flexible Timings).
- Urgency banner: "Need a slot today? Check availability on WhatsApp" with a wa.me button.
PAGE 2 — SERVICES RATE CARD (===PAGE:services===):
- Service categories as tab/accordion view (Hair, Skin, Nails, Spa — or workout programs for a gym) working with vanilla JS.
- Detailed rate table: service name, duration (e.g. 45 mins), price, and a "Book This" button that opens WhatsApp with the service name pre-filled.
- Transformation gallery: before vs after image pairs.
PAGE 3 — EXPERTS, REVIEWS & BOOKING (===PAGE:contact===):
- Meet the Experts: team profile cards with specialization.
- Reviews grid: client feedback cards with star ratings.
- Appointment booking form: date picker (input type=date), time slot select, service select, name — submit opens WhatsApp with all details pre-filled.
- Map link to the address (if supplied) + UPI QR code for slot confirmation (only if UPI ID supplied, same qrserver.com technique).`,
};

const RETAIL_BLUEPRINT = {
  second: 'collection',
  text: `PAGE 1 — HOME (===PAGE:index===):
- Hero: high-fashion lookbook banner, headline like "Exclusive Designer Ethnic Wear" (adapt), CTA "Explore Collection" → /collection.
- Featured Collections: category cards (e.g. Lehengas, Sarees, Western Dresses, Accessories — adapt to the store).
- New Arrivals: horizontal scroll slider of latest products with price badges.
- Trust badges strip: e.g. Custom Fitting Available, Premium Fabric, Easy Exchange (adapt to supplied details; no fake shipping claims).
PAGE 2 — PRODUCT SHOWCASE (===PAGE:collection===):
- Filter bar: filter chips by occasion/category/price range — must actually filter the grid with vanilla JS.
- Product cards: image, product title, SKU/code, price, and a "Buy via WhatsApp" button that pre-fills the product code + name in the message.
- Size & Fitting Guide: a popup modal (vanilla JS) with measurement instructions.
PAGE 3 — STORY, STORE & SUPPORT (===PAGE:contact===):
- Designer story: brief note on heritage and craftsmanship.
- Store visit / video-call booking: small form (name, preferred date/time) whose submit opens WhatsApp.
- FAQ section: shipping, return/exchange policy (use supplied policies or clearly generic wording).
- Map link + UPI QR code (only if address / UPI ID supplied).`,
};

const REPAIR_BLUEPRINT = {
  second: 'services',
  text: `PAGE 1 — HOME (===PAGE:index===):
- Hero: clean bold banner, urgency headline (e.g. "24/7 Professional AC Repair & Plumbing — at your door in 30 mins", adapt to the trade), one BIG high-contrast "Call Technician Now" button (tel: if phone supplied, else wa.me).
- Core services grid: icon cards (e.g. Plumbing, Electrical, AC Service, Cleaning — adapt).
- Why Us: Verified Technicians | Upfront Pricing | Service Guarantee badges.
- Instant rate estimator: a dropdown of common jobs that shows the estimated price with vanilla JS.
PAGE 2 — RATE CARD (===PAGE:services===):
- Categorized service cards: detailed task list (e.g. AC Jet Wash, PCB Repair, Gas Refill) with fixed prices and a WhatsApp book button per task.
- Work process timeline: Book Online → Technician Arrives → Pay After Satisfaction (3-step visual).
PAGE 3 — TRUST, REVIEWS & BOOKING (===PAGE:contact===):
- Trust section: verified staff / background-checked badges (qualitative unless specifics supplied).
- Customer reviews with photos of completed work (relevant Unsplash images).
- Service booking form: address input, preferred time, issue description — submit opens WhatsApp with everything pre-filled.`,
};

const CREATIVE_BLUEPRINT = {
  second: 'portfolio',
  text: `PAGE 1 — HOME (===PAGE:index===):
- Hero: full-screen photography/work banner with two CTAs: "View Portfolio" → /portfolio and "Check Availability" → /contact.
- Selected Work: masonry grid of 6 best shots/projects (link to /portfolio).
- Stats/clients strip: use supplied numbers only; otherwise qualitative highlights.
PAGE 2 — PORTFOLIO & PACKAGES (===PAGE:portfolio===):
- Category tabs: e.g. [Weddings] [Pre-Weddings] [Commercial] [Events] (adapt) — must actually filter with vanilla JS.
- High-res gallery grid with a lightbox modal view on tap (vanilla JS).
- Package pricing cards: Basic / Standard / Premium with feature checklists and "Book" CTAs → /contact.
PAGE 3 — ABOUT, TESTIMONIALS & INQUIRY (===PAGE:contact===):
- Creator bio: story plus equipment details (cameras, drones) if supplied.
- Client testimonials: quote cards.
- Inquiry & booking form: event date, event type, venue location — submit opens WhatsApp with a pre-filled quote request.`,
};

const CLINIC_BLUEPRINT = {
  second: 'treatments',
  text: `PAGE 1 — HOME (===PAGE:index===):
- Header: clinic name/logo, doctor's name, an Emergency Call button (tel: if phone supplied) and a WhatsApp slot-booking button.
- Hero: clean doctor/clinic photo, trust headline (e.g. "Expert Dental Care in <city> | <X>+ Years Experience" — use supplied experience only), CTAs: "Book Appointment" → /contact and "Emergency Call" (tel:).
- Quick stats strip: use ONLY supplied numbers/ratings; otherwise qualitative badges like "Sterilized Equipment", "Modern Facility".
- Key specialties: 4 quick cards for the main treatments (adapt to the actual specialty — dental, general, skin, etc.).
- Clinic timings card: morning & evening OPD timings with Sunday status (use supplied hours).
PAGE 2 — TREATMENTS & FACILITIES (===PAGE:treatments===):
- Specialized treatments grid: each treatment gets an image, short summary, duration (e.g. 30 mins), and pricing range (e.g. "Starting at ₹999") — use supplied pricing style.
- Technology & hygiene section: modern equipment highlights and sterilization/safety badges.
- Pre-appointment guidelines: patient tips list (e.g. "Bring previous medical reports").
PAGE 3 — DOCTOR, REVIEWS & BOOKING (===PAGE:contact===):
- Doctor bio & degrees: qualifications (MBBS/MDS etc. only if supplied), doctor's message paragraph.
- Patient testimonials: review cards with star ratings.
- Slot booking form: date picker (input type=date), preferred slot select (Morning/Evening), issue description — submit opens WhatsApp with all details pre-filled.
- Map link (https://maps.google.com/?q=<address>) + advance token fee via UPI QR (only if UPI ID supplied; use https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=<url-encoded upi://pay?pa=UPIID&pn=NAME>).`,
};

const EDUCATION_BLUEPRINT = {
  second: 'courses',
  text: `PAGE 1 — HOME (===PAGE:index===):
- Hero: student/classroom banner, results-focused headline (e.g. "Crack JEE/NEET with <city>'s Top Faculty" — adapt to the subjects taught), CTAs: "Register for Free Demo" → /contact and "View Courses" → /courses.
- Topper results section: ranker cards with achievements — ONLY if results are supplied; otherwise a "Our Teaching Promise" section.
- Key features: Small Batch Sizes | Daily Practice Papers | Personal Mentorship (adapt to supplied details).
- Upcoming batches banner: start dates for new batches (use supplied info or an editable placeholder).
PAGE 2 — COURSES & FEES (===PAGE:courses===):
- Course selection tabs (e.g. [JEE] [NEET] [Class 8-10] [Crash Courses] — adapt) that actually filter with vanilla JS.
- Detailed course cards: duration, weekly class hours, subjects covered, fee structure vs installment plans (use supplied pricing style).
- Faculty profiles: subject experts with qualification and teaching experience (only supplied facts).
PAGE 3 — CAMPUS, REVIEWS & ADMISSION (===PAGE:contact===):
- Campus photos: classrooms, library, test-series center (relevant Unsplash images).
- Parent & student testimonials: quote cards.
- Free demo registration form: student name, class select, target exam, parent phone — submit opens WhatsApp with everything pre-filled.
- Map link + admission fee via UPI QR (only if supplied).`,
};

const AUTO_BLUEPRINT = {
  second: 'packages',
  text: `PAGE 1 — HOME (===PAGE:index===):
- Hero: glossy car detailing/repair photo, headline like "Give Your Car a Brand New Showroom Look" (adapt), CTAs: "Book Slot on WhatsApp" (wa.me) and "View Rates" → /packages.
- Service badges: e.g. Genuine Spare Parts | Ceramic Coating Experts | Pick & Drop Available (adapt to supplied services).
- Top 3 packages: cards (e.g. Express Wash, Deep Interior Cleaning, Ceramic Coating) with price and a WhatsApp book button.
PAGE 2 — PACKAGES & GALLERY (===PAGE:packages===):
- Package comparison table: Silver / Gold / Platinum checklist of what's included (✓/✗ rows).
- Before vs after transformation section: paired photos of dirty vs detailed vehicles.
- Add-on services list: e.g. Teflon Coating, AC Gas Refill, Engine Wash with prices and WhatsApp book buttons.
PAGE 3 — GARAGE, REVIEWS & PICKUP (===PAGE:contact===):
- Garage infrastructure: photos of equipment/workspace and customer waiting area.
- Customer reviews: feedback cards with vehicle photos.
- Doorstep pickup form: car model, preferred time, pickup address, service type select — submit opens WhatsApp with all details pre-filled.
- Map link + UPI QR (only if supplied).`,
};

const MOVERS_BLUEPRINT = {
  second: 'rates',
  text: `PAGE 1 — HOME (===PAGE:index===):
- Hero: delivery truck/relocation banner, reliability headline (e.g. "Safe & Zero-Damage Home Relocation Across India"), CTAs: "Get Instant WhatsApp Quote" (wa.me) and "Calculate Shifting Cost" → /rates.
- Trust counters: use ONLY supplied numbers; otherwise qualitative badges (Trained Crew, Quality Packing, On-Time Delivery).
- Services grid: Household Shifting, Office Relocation, Bike/Car Transport, Storage/Warehousing (adapt to supplied services).
PAGE 2 — RATES, PROCESS & INSURANCE (===PAGE:rates===):
- Estimated rates table: Local (1BHK/2BHK/3BHK) vs Intercity base prices (use supplied pricing style; mark as estimates).
- 4-step shifting process: Packing → Loading → Safe Transit → Unpacking (visual timeline).
- Insurance & safety section: transit insurance details and packing material standards (bubble wrap, corrugated boxes) — only claim insurance if supplied.
PAGE 3 — REVIEWS & INSTANT QUOTE (===PAGE:contact===):
- Customer reviews: testimonial cards from families/offices that shifted.
- Detailed quote request form: Moving From (city/pincode), Moving To, shifting date (input type=date), items checklist (checkboxes: Furniture, Appliances, Vehicle, Fragile Items...) — submit opens WhatsApp with a fully pre-filled quote request.
- Office address, registration/GST badges (only if supplied), map link + token payment UPI QR (only if supplied).`,
};

const LEGAL_BLUEPRINT = {
  second: 'services',
  text: `PAGE 1 — HOME (===PAGE:index===):
- Hero: professional office photo, headline like "Hassle-Free Income Tax Filing & Business Registration" (adapt to the practice), CTAs: "Consult on WhatsApp" (wa.me) and "View Services" → /services.
- Trust badges: e.g. 100% Legal Compliance | Confidential Data Guarantee | <X>+ Years Experience (experience only if supplied).
- Popular services: cards like GST Registration, ITR Filing, Company Incorporation, Trademark Filing (adapt).
PAGE 2 — SERVICES & PRICING (===PAGE:services===):
- Service categories as accordion view (Business Setup, Tax & Audit, Legal Drafting, Licensing — adapt) working with vanilla JS.
- Transparent pricing cards: service name, required-documents checklist, turnaround time (e.g. 3-5 working days), fee (use supplied pricing style; separate govt fee vs professional fee if given).
PAGE 3 — FIRM, CLIENTS & CONSULTATION (===PAGE:contact===):
- Senior partner profile: name, qualifications/enrollment numbers (ONLY if supplied), practice areas.
- Client reviews: rating cards from business owners.
- Consultation booking form: service type select, preferred date/time, brief description — submit opens WhatsApp; add a "Share Documents on WhatsApp" button.
- Office address + map link + consultation fee UPI QR (only if supplied).`,
};

const INTERIOR_BLUEPRINT = {
  second: 'portfolio',
  text: `PAGE 1 — HOME (===PAGE:index===):
- Hero: full-width finished living room / 3D render photo, headline like "Turn Your House Into a Luxury Dream Home", CTAs: "Book Free Design Consultation" → /contact and "View Portfolio" → /portfolio.
- Trust counters: use ONLY supplied numbers (homes designed, warranty years, delivery days); otherwise qualitative badges (Quality Materials, On-Time Delivery, Transparent Pricing).
- Service badges: Full Home Interiors, Modular Kitchen, Commercial Office Setup, Turnkey Civil Contracting (adapt to supplied services).
PAGE 2 — PORTFOLIO & ESTIMATOR (===PAGE:portfolio===):
- Interactive design style tabs: [Modern Minimalist] [Royal Classic] [Industrial] [Bohemian] (adapt) — must actually filter the gallery with vanilla JS.
- Gallery grid: high-res photos of living rooms, bedrooms, modular kitchens (relevant Unsplash images).
- Instant cost estimator: dropdown (1BHK / 2BHK / 3BHK / Villa) that shows an estimated budget range with vanilla JS (use supplied pricing style, mark as estimates).
PAGE 3 — DESIGNER, REVIEWS & BOOKING (===PAGE:contact===):
- Lead designer/architect profile: experience, certifications (only if supplied), design philosophy.
- Homeowner testimonials: quote cards.
- Consultation booking form: city/area, home type select, budget preference select — submit opens WhatsApp with all details pre-filled, plus a note "Share your floor plan on WhatsApp".
- Office/experience center address + map link + advance token UPI QR (only if UPI ID supplied; use https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=<url-encoded upi://pay?pa=UPIID&pn=NAME>).`,
};

const VENUE_BLUEPRINT = {
  second: 'packages',
  text: `PAGE 1 — HOME (===PAGE:index===):
- Hero: grand decorated banquet hall/lawn photo, headline like "<city>'s Premium Venue for Weddings & Corporate Events", CTAs: "Check Date Availability" → /contact and "View Packages" → /packages.
- Ecosystem strip: a small section noting large-scale sports and mega-event bookings are powered by StadiumConnect, linking to https://stadiumconnect.in (target=_blank).
- Capacity highlights: guest capacity, AC banquet + lawn, in-house catering, parking — use supplied numbers only, else qualitative.
PAGE 2 — MENUS, DECOR & PACKAGES (===PAGE:packages===):
- Decor themes grid: photos of stage setup, mandap, entrance, lighting options.
- Catering menu cards: e.g. Deluxe Veg, Royal Non-Veg, Live Counters (Chaat, Chinese, Mocktails) with per-plate rates (use supplied pricing style).
- Venue tour: large gallery section of the venue spaces.
PAGE 3 — RULES, REVIEWS & DATE INQUIRY (===PAGE:contact===):
- Policy checklist: parking, DJ curfew timing, green rooms, safety standards (adapt to supplied details).
- Client reviews: cards from couples and corporate organizers.
- Date inquiry form: event type select (Wedding/Birthday/Corporate), expected guest count, preferred date (input type=date) — submit opens WhatsApp with everything pre-filled for the venue manager.
- Map link + booking advance UPI QR (only if supplied).`,
};

const PETCARE_BLUEPRINT = {
  second: 'services',
  text: `PAGE 1 — HOME (===PAGE:index===):
- Hero: cute dog/cat photo, headline like "Professional Pet Care, Grooming & Veterinary Clinic", CTAs: "Book Grooming Slot" → /contact and "Emergency Vet Call" (tel: if phone supplied).
- Service icons grid: Pet Grooming & Spa, Vet Vaccination, Pet Boarding/Hostel, Emergency Care (adapt).
- Trust badges: Certified Veterinarians | Stress-Free Handling | Organic Products (certifications only if supplied).
PAGE 2 — PACKAGES & OPD (===PAGE:services===):
- Grooming package cards: Bath & Dry, Full Haircut & Styling, Nail Trimming, Tick Treatment — prices by pet size (Small/Medium/Large) using supplied pricing style.
- Vaccination & OPD chart: common puppy/kitten vaccination schedule table and consulting fees.
- Pet hostel facilities: photos of boarding space, play area, monitoring facilities.
PAGE 3 — VET, GALLERY & BOOKING (===PAGE:contact===):
- Vet bio: qualifications (BVSc/MVSc ONLY if supplied) and experience.
- Happy pets gallery: before/after grooming photos (relevant Unsplash pet images).
- Slot booking form: pet type select (Dog/Cat/Other), breed input, service select, date & preferred time — submit opens WhatsApp with all details pre-filled.
- Clinic address + map link + UPI QR for slot confirmation (only if supplied).`,
};

const TAILOR_BLUEPRINT = {
  second: 'ratecard',
  text: `PAGE 1 — HOME (===PAGE:index===):
- Hero: fabric & sewing aesthetic banner, headline like "Perfect Fitting Suits, Sherwanis & Designer Blouses", CTAs: "Book Doorstep Measurement" → /contact and "View Rate Card" → /ratecard.
- Key USPs: e.g. Express Delivery | Free Alterations | Home Pickup & Delivery (adapt to supplied services).
- Services grid: Men's Suits & Tuxedos, Kurta Pajama, Women's Designer Suits/Lehengas, Uniform Stitching (adapt).
PAGE 2 — RATE CARD & FABRICS (===PAGE:ratecard===):
- Transparent stitching price list: shirt/trouser, blazer, lehenga, blouse etc. with rates (use supplied pricing style).
- Measurement guide: simple visual/text guide showing how to measure shoulders, chest and length at home.
- Fabric & pattern showcase: photos of suitings, silks and embroidery options.
PAGE 3 — BOUTIQUE, REVIEWS & ORDER (===PAGE:contact===):
- Master tailor story: bespoke tailoring heritage and experience (supplied facts only).
- Customer reviews with fitting photos.
- Doorstep measurement/pickup form: address, preferred date/time, garment type select — submit opens WhatsApp with all details pre-filled.
- Shop address + map link + token advance UPI QR (only if supplied).`,
};

const AGRI_BLUEPRINT = {
  second: 'catalog',
  text: `PAGE 1 — HOME (===PAGE:index===):
- Hero: lush green farm/nursery photo, headline like "Certified Hybrid Seeds, Organic Fertilizers & Farm Equipment", CTAs: "Order on WhatsApp" (wa.me) and "View Product Catalog" → /catalog.
- Trust badges: Govt Approved Dealer | Genuine Products | Doorstep Village Delivery (govt approval only if supplied).
- Seasonal highlights banner: recommended seeds/fertilizers for the current season (Kharif/Rabi).
PAGE 2 — CATALOG & RENTALS (===PAGE:catalog===):
- Category tabs: [Seeds] [Fertilizers & Pesticides] [Garden Plants] [Farm Tools & Pumps] (adapt) — must actually filter with vanilla JS.
- Product cards: item name, weight/quantity (e.g. 5kg bag), dosage instructions, price, and a WhatsApp order button that sends the exact item name in chat.
- Equipment rental section: tools/sprayers/cutters with per-day rental rates (if the business offers rentals).
PAGE 3 — ADVISORY, REVIEWS & ORDERS (===PAGE:contact===):
- Expert/agronomist profile: crop advisory support details (supplied facts only).
- Farmer testimonials: review cards from local farmers.
- Bulk order & soil testing inquiry form: name, village/city, requirement description — submit opens WhatsApp with everything pre-filled.
- Shop address + map link + UPI QR for direct payments (only if supplied).`,
};

const CATEGORY_BLUEPRINTS = {
  food: FOOD_BLUEPRINT,
  bakery: FOOD_BLUEPRINT,
  salon: SALON_GYM_BLUEPRINT,
  gym: SALON_GYM_BLUEPRINT,
  fashion: RETAIL_BLUEPRINT,
  store: RETAIL_BLUEPRINT,
  services: REPAIR_BLUEPRINT,
  photography: CREATIVE_BLUEPRINT,
  creative: CREATIVE_BLUEPRINT,
  portfolio: CREATIVE_BLUEPRINT,
  clinic: CLINIC_BLUEPRINT,
  education: EDUCATION_BLUEPRINT,
  auto: AUTO_BLUEPRINT,
  movers: MOVERS_BLUEPRINT,
  legal: LEGAL_BLUEPRINT,
  interior: INTERIOR_BLUEPRINT,
  venue: VENUE_BLUEPRINT,
  petcare: PETCARE_BLUEPRINT,
  tailor: TAILOR_BLUEPRINT,
  agri: AGRI_BLUEPRINT,
};

function buildSystemPrompt() {
  return [
    'You are WebsConnect AI, an expert mobile-first website generator for small Indian businesses.',
    'Generate a complete MULTI-PAGE website: exactly THREE standalone HTML pages, in this EXACT output format:',
    '',
    '===PAGE:index===',
    '<!DOCTYPE html>... complete home page ...',
    '===PAGE:<second>===',
    '<!DOCTYPE html>... complete second page ...',
    '===PAGE:contact===',
    '<!DOCTYPE html>... complete contact page ...',
    '',
    'For <second>, pick ONE lowercase word that fits the business: portfolio, services, menu, collection, gallery, or about. If the user message specifies a PAGE BLUEPRINT, use its exact page names and follow its structure section-by-section.',
    'Rules for EVERY page:',
    '- Complete self-contained HTML document using Tailwind CSS via <script src="https://cdn.tailwindcss.com"></script>.',
    '- Identical sticky header/nav on all three pages with working links: <a href="/">Home</a>, <a href="/<second>">, <a href="/contact">Contact</a>. Highlight the active page.',
    '- Identical footer on all pages with nav links repeated.',
    '- EVERY button and link must work: internal page links (/, /<second>, /contact), tel:, mailto:, https://wa.me/, upi://pay, or same-page #anchors. NEVER a dead href="#".',
    '- Primary CTAs on the home page should lead to /contact or the second page.',
    '- Mobile-first, responsive, modern, polished. Consistent colors/fonts across all pages (Google Fonts via link).',
    '- Home page: hero with strong headline + CTA buttons, highlights/services preview, trust signals, teaser of second page content.',
    '- Second page: the full detailed content (complete portfolio grid / full menu / all services with details).',
    '- Contact page: all contact details, working hours, WhatsApp/call CTAs, address, and a simple enquiry form whose submit button opens WhatsApp (wa.me link) if a number exists.',
    '- Use royalty-free Unsplash image URLs (https://images.unsplash.com/...) relevant to the business.',
    '- All text content in English, tailored to the business. Realistic sample content — no lorem ipsum.',
    '- Follow every supplied business requirement precisely. Do not ignore contact, audience, hours, color, pricing, trust, or niche-specific details.',
    '- Never invent a phone number, email, address, UPI ID, certification, rating, client count, or business claim. If not supplied, omit it or use a clearly editable placeholder.',
    '- If a WhatsApp number is supplied, normalize it for a functional https://wa.me/ link.',
    '- If UPI is requested, include the supplied UPI ID and a functional upi://pay link. Never fabricate an ID.',
    '- No external JS frameworks. Vanilla JS only if needed.',
    '- Output ONLY the three pages with ===PAGE:xxx=== markers. No markdown fences, no explanation.',
  ].join('\n');
}

function formatRequirements(requirements) {
  if (!requirements || typeof requirements !== 'object') return '';
  return Object.values(requirements).map((answer) => {
    if (!answer || typeof answer !== 'object' || !answer.question) return '';
    if (Array.isArray(answer.values)) {
      const values = answer.values.map((item) =>
        `${item.label || item.value}${item.input ? ` — ${item.input}` : ''}`
      );
      return `${answer.question}: ${values.join('; ')}`;
    }
    return `${answer.question}: ${answer.label || answer.value}${answer.input ? ` — ${answer.input}` : ''}`;
  }).filter(Boolean).join('\n');
}

function buildUserPrompt({ niche, vibe, feature, prompt, businessName, requirements }) {
  const detailedRequirements = formatRequirements(requirements);
  const blueprint = CATEGORY_BLUEPRINTS[niche];
  return [
    `Business type: ${NICHE_NAMES[niche] || niche || 'local business'}`,
    `Business name: ${businessName || 'create a catchy realistic name'}`,
    vibe ? `Visual style key: ${vibe}` : '',
    feature ? `Primary action key: ${feature}` : '',
    prompt ? `Owner's description: ${prompt}` : '',
    detailedRequirements ? `\nCOMPLETE DISCOVERY ANSWERS:\n${detailedRequirements}` : '',
    blueprint
      ? `\nPAGE BLUEPRINT — follow this structure section-by-section (second page must be named "${blueprint.second}", so nav links are /, /${blueprint.second}, /contact):\n${blueprint.text}`
      : '',
    'Create the navigation, content hierarchy, calls-to-action, sections, and integrations from these answers.',
    'Generate the complete website now.',
  ].filter(Boolean).join('\n');
}

function extractHtml(text) {
  if (!text) return null;
  // Strip markdown code fences if the model added them anyway
  let html = text.trim();
  const fenceMatch = html.match(/```(?:html)?\s*([\s\S]*?)```/);
  if (fenceMatch) html = fenceMatch[1].trim();
  const docStart = html.indexOf('<!DOCTYPE');
  if (docStart > 0) html = html.slice(docStart);
  if (!html.toLowerCase().startsWith('<!doctype') && !html.toLowerCase().startsWith('<html')) {
    return null;
  }
  return html;
}

/** Parse ===PAGE:key=== delimited multi-page output into { key: html }. */
function extractPages(text) {
  if (!text) return null;
  const parts = text.split(/===\s*PAGE:\s*([a-z0-9-]+)\s*===/i);
  const pages = {};
  for (let i = 1; i < parts.length - 1; i += 2) {
    const key = parts[i].toLowerCase().trim();
    const html = extractHtml(parts[i + 1]);
    if (key && html) pages[key] = html;
  }
  if (pages.index) return pages;
  // Fallback: model returned a single page without markers
  const single = extractHtml(text);
  return single ? { index: single } : null;
}

function makeSlugBase(niche, businessName) {
  const src = (businessName || niche || 'site').toLowerCase();
  const cleaned = src.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
  return cleaned || 'site';
}

const RESERVED_SLUGS = new Set([
  'www', 'api', 'mail', 'email', 'admin', 'app', 'ftp', 'smtp', 'ns1', 'ns2',
  'blog', 'shop', 'store', 'support', 'help', 'status', 'dashboard', 'login',
  'auth', 'cdn', 'static', 'assets', 'dev', 'staging', 'test', 'websconnect',
  'stadiumconnect', 'auronx', 'connect',
]);

function sanitizeSlug(raw) {
  return String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

async function uniqueSlug(pool, base) {
  for (let i = 0; i < 8; i++) {
    const suffix = crypto.randomBytes(2).toString('hex');
    const slug = i === 0 ? base : `${base}-${suffix}`;
    const { rows } = await pool.query('SELECT 1 FROM sites WHERE slug = $1', [slug]);
    if (!rows.length) return slug;
  }
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}

async function callOpenRouter(messages) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': `https://${ROOT_DOMAIN}`,
      'X-Title': 'WebsConnect AI',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      max_tokens: 50000,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function mountGenerateRoutes(router) {
  router.get('/slug-check', async (req, res) => {
    try {
      const slug = sanitizeSlug(req.query.slug);
      if (!slug || slug.length < 3) {
        return res.json({ available: false, slug, reason: 'Kam se kam 3 characters chahiye' });
      }
      if (RESERVED_SLUGS.has(slug)) {
        return res.json({ available: false, slug, reason: 'Yeh naam reserved hai' });
      }
      const pool = getPool();
      if (!pool) return res.status(503).json({ error: 'Database unavailable' });
      const { rows } = await pool.query('SELECT 1 FROM sites WHERE slug = $1', [slug]);
      res.json({ available: !rows.length, slug, reason: rows.length ? 'Yeh domain already taken hai' : '' });
    } catch (err) {
      console.error('slug-check:', err.message);
      res.status(500).json({ error: 'Check failed' });
    }
  });

  router.post('/generate', authMiddleware, async (req, res) => {
    try {
      if (!OPENROUTER_API_KEY) {
        return res.status(503).json({ error: 'AI generation not configured (OPENROUTER_API_KEY missing)' });
      }
      const pool = getPool();
      if (!pool) {
        return res.status(503).json({ error: 'Database unavailable' });
      }

      const { niche, vibe, feature, prompt, businessName, requirements, desiredSlug } = req.body || {};
      if (requirements && (typeof requirements !== 'object' || JSON.stringify(requirements).length > 20000)) {
        return res.status(400).json({ error: 'Invalid or oversized requirements' });
      }

      // Reserve the user's chosen domain before spending AI tokens
      let chosenSlug = null;
      const wanted = sanitizeSlug(desiredSlug);
      if (wanted && wanted.length >= 3) {
        if (RESERVED_SLUGS.has(wanted)) {
          return res.status(409).json({ error: `"${wanted}" reserved hai — doosra naam choose karo.` });
        }
        const { rows } = await pool.query('SELECT 1 FROM sites WHERE slug = $1', [wanted]);
        if (rows.length) {
          return res.status(409).json({ error: `"${wanted}.${ROOT_DOMAIN}" already taken hai — doosra naam try karo.` });
        }
        chosenSlug = wanted;
      }

      const content = await callOpenRouter([
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt({ niche, vibe, feature, prompt, businessName, requirements }) },
      ]);

      const pages = extractPages(content);
      if (!pages || !pages.index) {
        console.error('generate: model returned non-HTML, length', content.length);
        return res.status(502).json({ error: 'AI returned invalid output. Try again.' });
      }
      const html = pages.index;
      console.log('generate: pages =', Object.keys(pages).join(', '));

      let slug = chosenSlug;
      if (slug) {
        // Re-verify in case someone claimed it during generation
        const { rows } = await pool.query('SELECT 1 FROM sites WHERE slug = $1', [slug]);
        if (rows.length) slug = null;
      }
      if (!slug) slug = await uniqueSlug(pool, makeSlugBase(niche, businessName));

      await pool.query(
        `INSERT INTO sites (slug, index_html, pages, status) VALUES ($1, $2, $3, 'active')`,
        [slug, html, JSON.stringify(pages)]
      );
      await pool.query(
        `INSERT INTO projects (user_id, title, slug, niche, vibe, feature, prompt, status, index_html)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)`,
        [
          req.userId,
          businessName || `My ${NICHE_NAMES[niche] || 'Website'}`,
          slug,
          niche || null,
          vibe || null,
          feature || null,
          requirements ? JSON.stringify({ prompt: prompt || '', requirements }) : (prompt || null),
          html,
        ]
      );

      res.json({ slug, url: `https://${slug}.${ROOT_DOMAIN}` });
    } catch (err) {
      console.error('generate:', err.message);
      res.status(500).json({ error: 'Generation failed. Please try again.' });
    }
  });
}

module.exports = { mountGenerateRoutes };
