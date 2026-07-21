'use strict';

const crypto = require('crypto');
const { getPool } = require('../db/sites');
const { authMiddleware } = require('./auth');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'websconnect.in';

const NICHE_NAMES = {
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
    '- If WhatsApp feature requested: floating WhatsApp button (https://wa.me/919999999999).',
    '- If UPI payments requested: a "Pay via UPI" section with a styled QR placeholder box.',
    '- If portfolio requested: a responsive image grid gallery.',
    '- No external JS frameworks. Vanilla JS only if needed.',
    '- Output ONLY the raw HTML document. No markdown fences, no explanation. Start with <!DOCTYPE html>.',
  ].join('\n');
}

function buildUserPrompt({ niche, vibe, feature, prompt, businessName }) {
  const vibeText = {
    dark: 'dark premium theme (dark background, gold/blue accents, luxury feel)',
    light: 'light minimal theme (white background, clean, lots of whitespace)',
    colorful: 'colorful bold theme (vibrant gradients, energetic, playful)',
  }[vibe] || 'modern clean theme';

  const featureText = {
    whatsapp: 'floating WhatsApp chat button',
    upi: 'UPI/QR payment section',
    portfolio: 'image portfolio grid gallery',
  }[feature] || 'contact form';

  return [
    `Business type: ${NICHE_NAMES[niche] || niche || 'local business'}`,
    `Business name: ${businessName || 'create a catchy realistic name'}`,
    `Visual style: ${vibeText}`,
    `Must-have feature: ${featureText}`,
    prompt ? `Owner's description: ${prompt}` : '',
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
  router.post('/generate', authMiddleware, async (req, res) => {
    try {
      if (!OPENROUTER_API_KEY) {
        return res.status(503).json({ error: 'AI generation not configured (OPENROUTER_API_KEY missing)' });
      }
      const pool = getPool();
      if (!pool) {
        return res.status(503).json({ error: 'Database unavailable' });
      }

      const { niche, vibe, feature, prompt, businessName } = req.body || {};

      const content = await callOpenRouter([
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt({ niche, vibe, feature, prompt, businessName }) },
      ]);

      const html = extractHtml(content);
      if (!html) {
        console.error('generate: model returned non-HTML, length', content.length);
        return res.status(502).json({ error: 'AI returned invalid output. Try again.' });
      }

      const slug = await uniqueSlug(pool, makeSlugBase(niche, businessName));

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
          prompt || null,
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
