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
