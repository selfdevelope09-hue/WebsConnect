'use strict';

// Conversational AI site editor — a Cursor-style chat where the owner says
// "change this on that page" and the AI patches the live site. Uses the
// active free generator (Groq) so edits cost nothing.

const { getPool } = require('../db/sites');
const { authMiddleware } = require('./auth');
const { activeGenerator, extractHtml } = require('./generate');

// Unlike full generation, an edit response may contain ANY subset of pages
// (e.g. only "menu"), so we can't reuse generate.js's index-required parser.
function parseEditedPages(text) {
  const parts = String(text || '').split(/===\s*PAGE:\s*([a-z0-9-]+)\s*===/i);
  const pages = {};
  for (let i = 1; i < parts.length - 1; i += 2) {
    const key = parts[i].toLowerCase().trim();
    const html = extractHtml(parts[i + 1]);
    if (key && html) pages[key] = html;
  }
  return Object.keys(pages).length ? pages : null;
}

const MAX_INSTRUCTION = 1500;
const MAX_HISTORY = 8;

const EDITOR_SYSTEM_PROMPT = `You are WebsConnect AI Site Editor. You receive the complete current HTML pages of a live small-business website plus the owner's change request (often in Hinglish). Apply EXACTLY the requested changes.

OUTPUT FORMAT (strict):
Line 1 onwards: a very short friendly Hinglish summary of what you changed (1-3 lines, no markdown), then for EVERY page you modified output:
===PAGE:<key>===
<the COMPLETE updated HTML document for that page>

RULES:
- Output ONLY pages you actually changed. Unchanged pages must NOT be output.
- Each output page must be the FULL document (<!DOCTYPE html> to </html>) with the change applied — never a fragment or diff.
- Keep everything else on the page identical: same Tailwind CDN setup, same nav links, same working buttons (tel:, wa.me, upi://, internal links).
- Never invent phone numbers, prices, addresses or claims the owner didn't give. If the request needs info you don't have, make the change with a clearly editable placeholder and mention it in the summary.
- Keep the design mobile-first and consistent across pages.
- If the request is unclear or impossible, output ONLY the summary asking one short clarifying question (no ===PAGE:=== blocks).
- No markdown fences anywhere.`;

const estimateTokens = (str) => Math.ceil(String(str || '').length / 4);

/**
 * Groq free tier caps tokens/minute (input + output both count), so send
 * only the pages the instruction actually targets when the site is large.
 */
function selectPages(pages, instruction) {
  const keys = Object.keys(pages);
  const totalTokens = keys.reduce((sum, k) => sum + estimateTokens(pages[k]), 0);
  if (totalTokens <= 4200) return keys;

  const text = instruction.toLowerCase();
  const matched = keys.filter((k) => k !== 'index' && text.includes(k));
  if (/\b(home|hero|landing|main page|front|index)\b/.test(text)) matched.unshift('index');
  if (/\b(contact|phone|number|address|map|timing|hours|baat|call)\b/.test(text) && keys.includes('contact') && !matched.includes('contact')) {
    matched.push('contact');
  }
  const picked = matched.length ? [...new Set(matched)] : ['index'];
  // Trim to budget, keeping at least one page
  let budget = 4200;
  const result = [];
  for (const k of picked) {
    const cost = estimateTokens(pages[k]);
    if (result.length && cost > budget) break;
    result.push(k);
    budget -= cost;
  }
  return result.length ? result : ['index'];
}

async function callEditor(messages) {
  const generator = activeGenerator();
  if (!generator.apiKey) throw new Error('AI editor not configured');
  const res = await fetch(generator.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${generator.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: generator.model,
      messages,
      max_tokens: Math.min(generator.maxTokens, 6000),
      temperature: 0.4,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`${generator.name} ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 1200) }));
}

function mountEditRoutes(router) {
  router.post('/site-edit', authMiddleware, async (req, res) => {
    try {
      const pool = getPool();
      if (!pool) return res.status(503).json({ error: 'Database unavailable' });

      const slug = String(req.body?.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
      const instruction = String(req.body?.instruction || '').trim().slice(0, MAX_INSTRUCTION);
      const history = sanitizeHistory(req.body?.history);
      if (!slug || !instruction) {
        return res.status(400).json({ error: 'Please describe the change you want.' });
      }

      // Only the site owner can edit
      const owned = await pool.query(
        'SELECT 1 FROM projects WHERE slug = $1 AND user_id = $2 LIMIT 1',
        [slug, req.userId]
      );
      if (!owned.rows.length) return res.status(404).json({ error: 'Website not found' });

      const site = await pool.query('SELECT index_html, pages FROM sites WHERE slug = $1', [slug]);
      if (!site.rows.length) return res.status(404).json({ error: 'Website not found' });

      let pages = site.rows[0].pages;
      if (typeof pages === 'string') { try { pages = JSON.parse(pages); } catch (_e) { pages = null; } }
      if (!pages || typeof pages !== 'object' || !pages.index) {
        pages = { index: site.rows[0].index_html };
      }

      const sendKeys = selectPages(pages, instruction);
      const pagesBlock = sendKeys
        .map((key) => `===PAGE:${key}===\n${pages[key]}`)
        .join('\n');
      const otherKeys = Object.keys(pages).filter((k) => !sendKeys.includes(k));

      const raw = await callEditor([
        { role: 'system', content: EDITOR_SYSTEM_PROMPT },
        ...history,
        {
          role: 'user',
          content: `CURRENT WEBSITE — you received ${sendKeys.length} of ${Object.keys(pages).length} pages (${sendKeys.join(', ')})${otherKeys.length ? `; pages ${otherKeys.join(', ')} exist but are not shown — only edit the pages you received` : ''}:\n${pagesBlock}\n\nOWNER'S CHANGE REQUEST:\n${instruction}`,
        },
      ]);

      // Split summary (before first marker) from updated pages
      const markerIndex = raw.search(/===\s*PAGE:/i);
      const summary = (markerIndex >= 0 ? raw.slice(0, markerIndex) : raw).trim();
      const updated = markerIndex >= 0 ? parseEditedPages(raw.slice(markerIndex)) : null;

      if (!updated || !Object.keys(updated).length) {
        // No page changes — the model asked a question or couldn't comply
        return res.json({ reply: summary || 'Mujhe samajh nahi aaya — thoda aur detail me batao?', changed: [] });
      }

      const merged = Object.assign({}, pages);
      const changed = [];
      Object.keys(updated).forEach((key) => {
        if (sendKeys.includes(key)) {
          merged[key] = updated[key];
          changed.push(key);
        }
      });
      if (!changed.length) {
        return res.json({ reply: summary || 'Koi matching page nahi mila. Dobara try karo?', changed: [] });
      }

      await pool.query(
        `UPDATE sites SET pages = $1, index_html = $2, updated_at = NOW() WHERE slug = $3`,
        [JSON.stringify(merged), merged.index, slug]
      );
      await pool.query(
        `UPDATE projects SET index_html = $1, updated_at = NOW() WHERE slug = $2 AND user_id = $3`,
        [merged.index, slug, req.userId]
      );

      res.json({
        reply: summary || `Done! ${changed.join(', ')} page${changed.length > 1 ? 's' : ''} update ho gaye. ✅`,
        changed,
      });
    } catch (err) {
      console.error('site-edit:', err.message);
      res.status(500).json({ error: 'Edit failed. Please try again in a moment.' });
    }
  });
}

module.exports = { mountEditRoutes };
