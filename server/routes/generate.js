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

function buildSystemPrompt() {
  return [
    'You are WebsConnect AI, an expert mobile-first website generator for small Indian businesses.',
    'Generate ONE complete, production-ready, self-contained index.html file.',
    'Rules:',
    '- Use Tailwind CSS via <script src="https://cdn.tailwindcss.com"></script>.',
    '- Mobile-first, responsive, modern, polished. Smooth scroll, nice typography (Google Fonts via link).',
    '- Include: sticky header with business name, hero section with strong headline + CTA, about/services section, gallery or features grid, testimonials (2-3 realistic), contact section with phone/WhatsApp button, footer.',
    '- Use royalty-free Unsplash image URLs (https://images.unsplash.com/...) relevant to the business.',
    '- All text content in English, tailored to the business. Realistic sample content — no lorem ipsum.',
    '- Follow every supplied business requirement precisely. Do not ignore contact, audience, hours, color, pricing, trust, or niche-specific details.',
    '- Never invent a phone number, email, address, UPI ID, certification, rating, client count, or business claim. If not supplied, omit it or use a clearly editable placeholder.',
    '- If a WhatsApp number is supplied, normalize it for a functional https://wa.me/ link.',
    '- If UPI is requested, include the supplied UPI ID and a functional upi://pay link. Never fabricate an ID.',
    '- If portfolio requested: a responsive image grid gallery.',
    '- No external JS frameworks. Vanilla JS only if needed.',
    '- Output ONLY the raw HTML document. No markdown fences, no explanation. Start with <!DOCTYPE html>.',
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
  return [
    `Business type: ${NICHE_NAMES[niche] || niche || 'local business'}`,
    `Business name: ${businessName || 'create a catchy realistic name'}`,
    vibe ? `Visual style key: ${vibe}` : '',
    feature ? `Primary action key: ${feature}` : '',
    prompt ? `Owner's description: ${prompt}` : '',
    detailedRequirements ? `\nCOMPLETE DISCOVERY ANSWERS:\n${detailedRequirements}` : '',
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
      max_tokens: 16000,
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

      const html = extractHtml(content);
      if (!html) {
        console.error('generate: model returned non-HTML, length', content.length);
        return res.status(502).json({ error: 'AI returned invalid output. Try again.' });
      }

      let slug = chosenSlug;
      if (slug) {
        // Re-verify in case someone claimed it during generation
        const { rows } = await pool.query('SELECT 1 FROM sites WHERE slug = $1', [slug]);
        if (rows.length) slug = null;
      }
      if (!slug) slug = await uniqueSlug(pool, makeSlugBase(niche, businessName));

      await pool.query(
        `INSERT INTO sites (slug, index_html, status) VALUES ($1, $2, 'active')`,
        [slug, html]
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
