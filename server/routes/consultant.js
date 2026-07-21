'use strict';

// WebsConnect AI Consultant — a warm Hinglish business advisor powered by Groq.
// It chats with the user, understands their business, and recommends the exact
// 3-page website structure + the best-matching category preset from the catalog.

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'websconnect.in';

// Build a compact catalog string (niche id + title + group) so the model can
// recommend a real preset the frontend can launch.
let CATALOG_LINES = '';
let VALID_NICHES = new Set();

function addCatalogEntry(lines, seen, niche, title, group) {
  if (!niche || seen.has(niche)) return;
  seen.add(niche);
  VALID_NICHES.add(niche);
  lines.push(`${niche} = ${title || group || niche}${group && group !== title ? ` (${group})` : ''}`);
}

function loadCatalog() {
  const seen = new Set();
  const lines = [];

  // Preferred: the generated browser data file, which ships in the Docker image.
  try {
    const fs = require('fs');
    const path = require('path');
    const file = path.join(__dirname, '..', '..', 'public', 'templates-data.js');
    const src = fs.readFileSync(file, 'utf8');
    const grab = (key) => {
      // Each assignment lives on its own line; match greedily to its final "];".
      const m = src.match(new RegExp('^\\s*window\\.' + key + '\\s*=\\s*(\\[.*\\]);\\s*$', 'm'));
      return m ? JSON.parse(m[1]) : null;
    };
    const cats = grab('WC_CATEGORIES');
    const tmpls = grab('WC_TEMPLATES');
    if (Array.isArray(cats)) {
      // Prefer template list for real category titles; fall back to WC_CATEGORIES groups.
      if (Array.isArray(tmpls)) {
        tmpls.forEach((t) => addCatalogEntry(lines, seen, t.niche, t.category, t.category));
      }
      cats.forEach((c) => addCatalogEntry(lines, seen, c.value, c.group, c.group));
    }
  } catch (e) {
    console.warn('consultant: templates-data.js load failed —', e.message);
  }

  // Fallback (dev): the raw template source module.
  if (!lines.length) {
    try {
      const { ALL_TEMPLATES } = require('../../scripts/all-templates');
      ALL_TEMPLATES.forEach((t) => addCatalogEntry(lines, seen, t.niche, t.title || t.category, t.category));
    } catch (e) {
      console.warn('consultant: scripts/all-templates load failed —', e.message);
    }
  }

  CATALOG_LINES = lines.join('\n');
  console.log(`consultant: loaded ${VALID_NICHES.size} category presets`);
}

loadCatalog();

function buildSystemPrompt() {
  return `You are "WebsConnect AI Consultant", an expert local business and website advisor for WebsConnect (websconnect.in) — India's 100% mobile-first AI website builder.

## LANGUAGE
- Always reply in warm, friendly, natural Hinglish (Hindi + English mix), e.g. "Bhai aapka bakery business hai, toh 3-page layout best rahega...".
- Sound like a helpful local expert, not a robot. Be encouraging and clear. No heavy technical jargon.

## YOUR JOB
1. If you don't know their business yet, ask just 1-2 simple questions (business type, city/location, main products or services). Ask ONE thing at a time — don't interrogate.
2. Once you understand enough, recommend the exact 3-Page Website Structure tailored to their business:
   - Page 1: High-impact Home page & key offerings
   - Page 2: Detailed Catalog / Menu / Rate Card / Services
   - Page 3: About, Google Maps, Reviews & WhatsApp Booking / UPI Payment
3. Recommend the single best-matching WebsConnect category preset from the catalog below.
4. Give 1-2 quick, practical tips to grow their local sales & trust (WhatsApp CTA, UPI QR, reviews, etc.).
5. BUILD-READY DETAILS: You are also the requirements collector for the website builder AI. After recommending the category, in the SAME or next messages, gently collect these build details (2-3 at a time, never all at once):
   - Business name (exact spelling)
   - Phone / WhatsApp number
   - Main products or services with prices (top 3-5)
   - Address / area + opening hours
   - UPI ID (optional, for payment QR)
   - Preferred look: Dark & Premium / Light & Minimal / Colorful & Bold
   Whatever the user shares, acknowledge it. When you have at least the business name + a phone/WhatsApp number + main offerings, tell them: "Ab bas 'Build this website now' button dabao — main saari details website AI ko de dunga! 🚀"
   Never invent details the user didn't share.

## RESPONSE STYLE
- Keep it concise, scannable and mobile-friendly. Use short bullet points. NEVER write huge walls of text.
- Use light emojis for warmth (📸🍰💈💪), but don't overdo it.

## CATEGORY RECOMMENDATION (VERY IMPORTANT)
- When (and only when) you recommend a specific category, add this machine-readable tag as the VERY LAST line of your message, on its own line, using the exact niche id from the catalog:
[[category:<niche_id>]]
- Example: [[category:food]]
- Use ONLY an id that exists in the catalog. If you are still asking questions and not yet recommending, do NOT add the tag.

## WEBSCONNECT CATEGORY CATALOG (id = Title (Group))
${CATALOG_LINES || 'food = Food & Bakery, salon = Salon & Beauty, services = Home Services (fallback list)'}`;
}

function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));
}

async function callGroq(messages, opts) {
  opts = opts || {};
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: opts.maxTokens || 900,
      temperature: opts.temperature != null ? opts.temperature : 0.75,
      top_p: 0.9,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Groq ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

const HANDOFF_PROMPT = `You are a requirements extractor for WebsConnect's website builder AI.
You will receive a consultation chat between a business owner and an advisor.
Extract ONLY facts the OWNER actually stated (never invent anything) and reply with a single JSON object, no markdown, no explanation:
{
  "businessName": "exact business name or empty string",
  "city": "city/area or empty string",
  "phone": "phone/WhatsApp number digits or empty string",
  "whatsapp": "WhatsApp number if different from phone, else empty",
  "upiId": "UPI id or empty string",
  "address": "full address or empty string",
  "hours": "opening hours or empty string",
  "offerings": ["main products/services with prices if stated"],
  "audience": "target customers if stated, else empty",
  "vibe": "one of: dark, light, colorful — or empty if not stated",
  "usp": "what makes them special, if stated",
  "notes": "any other important requirements the owner mentioned (languages, delivery, booking, social links, etc.)",
  "summary": "2-3 sentence English brief of the business and what the website must achieve"
}
Use empty strings / empty arrays for anything not mentioned. Output valid JSON only.`;

function mountConsultantRoutes(router) {
  router.get('/consultant/status', (_req, res) => {
    res.json({ enabled: Boolean(GROQ_API_KEY), presets: VALID_NICHES.size });
  });

  // Summarize the consultation chat into a structured brief for the builder AI.
  router.post('/consultant/handoff', async (req, res) => {
    try {
      if (!GROQ_API_KEY) {
        return res.status(503).json({ error: 'AI Consultant not configured.' });
      }
      const history = sanitizeHistory(req.body?.messages);
      if (!history.length) {
        return res.json({ brief: null });
      }
      const transcript = history
        .map((m) => `${m.role === 'user' ? 'OWNER' : 'ADVISOR'}: ${m.content}`)
        .join('\n');
      const raw = await callGroq([
        { role: 'system', content: HANDOFF_PROMPT },
        { role: 'user', content: `CONSULTATION CHAT:\n${transcript}\n\nExtract the JSON brief now.` },
      ], { temperature: 0.1, maxTokens: 700 });
      let brief = null;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) brief = JSON.parse(jsonMatch[0]);
      } catch (_e) { /* fall through with null brief */ }
      res.json({ brief });
    } catch (err) {
      console.error('consultant handoff:', err.message);
      // Handoff is best-effort — the builder can still run without a brief.
      res.json({ brief: null });
    }
  });

  router.post('/consultant', async (req, res) => {
    try {
      if (!GROQ_API_KEY) {
        return res.status(503).json({ error: 'AI Consultant not configured (GROQ_API_KEY missing).' });
      }
      const history = sanitizeHistory(req.body?.messages);
      const message = String(req.body?.message || '').trim().slice(0, 2000);
      if (!message && !history.length) {
        return res.status(400).json({ error: 'Please type a message.' });
      }

      const messages = [{ role: 'system', content: buildSystemPrompt() }, ...history];
      if (message) messages.push({ role: 'user', content: message });

      const raw = await callGroq(messages);

      // Extract the optional [[category:<id>]] tag and strip it from display text.
      let category = null;
      const reply = raw.replace(/\[\[category:\s*([a-z0-9_-]+)\s*\]\]/i, (_m, id) => {
        const clean = String(id).toLowerCase();
        if (VALID_NICHES.size === 0 || VALID_NICHES.has(clean)) category = clean;
        return '';
      }).trim();

      res.json({ reply, category });
    } catch (err) {
      console.error('consultant:', err.message);
      res.status(500).json({ error: 'Consultant is busy right now. Please try again in a moment.' });
    }
  });
}

module.exports = { mountConsultantRoutes };
