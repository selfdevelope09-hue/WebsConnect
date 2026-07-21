# OpenRouter — AI Website Generation Setup

WebsConnect will call OpenRouter to turn chat answers into a real HTML website.

## Tumhe kya dena hai

1. **OpenRouter API Key** (zaroori)
   - https://openrouter.ai/keys pe jaao
   - Create key → copy (`sk-or-v1-...`)
   - Yahan chat mein paste karo (ya DigitalOcean env mein set)

2. **Model** (optional — default main choose karunga)
   Recommended for website HTML:
   - `anthropic/claude-sonnet-4` — best quality (thoda mehnga)
   - `google/gemini-2.5-flash` — fast + cheap (good start)
   - `openai/gpt-4.1-mini` — balanced

## Env vars (server pe)

```
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
OPENROUTER_MODEL=google/gemini-2.5-flash
```

## Flow (andar kaise kaam karega)

```
User chat answers (niche + vibe + feature + prompt)
        ↓
POST /api/generate
        ↓
OpenRouter chat completions
  system: "You are a mobile-first website generator. Return ONE complete HTML file..."
  user: business details
        ↓
AI returns full index.html
        ↓
Save to projects + sites table
        ↓
Serve on {slug}.websconnect.in
```

## Cost tip

Start with `google/gemini-2.5-flash` — website HTML ke liye enough, sasta.
Quality upgrade ke liye baad mein Claude Sonnet.
