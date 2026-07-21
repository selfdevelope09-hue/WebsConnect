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
try {
  const { ALL_TEMPLATES } = require('../../scripts/all-templates');
  const seen = new Set();
  const lines = [];
  ALL_TEMPLATES.forEach((t) => {
    if (seen.has(t.niche)) return;
    seen.add(t.niche);
    VALID_NICHES.add(t.niche);
    lines.push(`${t.niche} = ${t.title || t.category} (${t.category})`);
  });
  CATALOG_LINES = lines.join('\n');
  console.log(`consultant: loaded ${VALID_NICHES.size} category presets`);
} catch (e) {
  console.warn('consultant: could not load category catalog —', e.message);
}

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

async function callGroq(messages) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: 900,
      temperature: 0.75,
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

function mountConsultantRoutes(router) {
  router.get('/consultant/status', (_req, res) => {
    res.json({ enabled: Boolean(GROQ_API_KEY), presets: VALID_NICHES.size });
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
