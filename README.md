# WebsConnect

India's first 100% mobile-first AI website builder. Domain: **[websconnect.in](https://websconnect.in)**  
Hosting: **DigitalOcean App Platform** · DNS: **GoDaddy**

---

## DNS & Routing Architecture

This section documents how incoming HTTP requests are expected to flow from GoDaddy DNS → DigitalOcean App Platform → Express.js routing.

```
                    ┌─────────────────────────────────────┐
                    │         GoDaddy DNS Manager          │
                    │           websconnect.in             │
                    └─────────────────┬───────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
    A @ (apex)                  CNAME subdomains              CNAME *
    DO_IP_1/2/3                 www, api                    * (wildcard)
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      ▼
                    ┌─────────────────────────────────────┐
                    │   DigitalOcean App Platform          │
                    │   your-app-xxxxx.ondigitalocean.app  │
                    │   TLS terminated · single Express app │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────┴───────────────────┐
                    │     subdomainRouter middleware       │
                    └─────────────────┬───────────────────┘
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
   websconnect.in              api.websconnect.in        rameshbakery.websconnect.in
   www.websconnect.in          /api/* routes              DB lookup → custom index.html
   → public/index.html         JSON API                   (tenant site)
```

---

## Step 1 — Add domains in DigitalOcean

Before editing GoDaddy, register every hostname on the App Platform app:

1. Open [DigitalOcean Cloud](https://cloud.digitalocean.com) → **Apps** → your WebsConnect app.
2. Go to **Settings → Domains → Add Domain**.
3. Add each of the following:

| Hostname | Purpose |
|----------|---------|
| `websconnect.in` | Apex — main marketing landing page |
| `www.websconnect.in` | Canonical www alias |
| `api.websconnect.in` | REST API (optional dedicated hostname) |
| `*.websconnect.in` | Wildcard — customer tenant sites |

4. DigitalOcean will display the **exact DNS records** required. Copy the three **A record IP addresses** shown for the apex domain and the **CNAME target** (`your-app-xxxxx.ondigitalocean.app`).

> **Important:** Replace every placeholder below with the values from *your* DO dashboard. IPs can change if you recreate the app.

---

## Step 2 — GoDaddy DNS records

Open **GoDaddy → My Products → websconnect.in → DNS → Manage DNS**.

### Pre-flight cleanup

Delete or disable conflicting records before adding new ones:

- Old **Domain Forwarding** (must be OFF)
- GoDaddy parking **A** record on `@`
- Stale **CNAME** / **A** records for `www`, `api`, or `*`

---

### Apex domain — A records (`@`)

GoDaddy does **not** support CNAME flattening on the root `@`, so the apex must use **A records** pointing to DigitalOcean App Platform load-balancer IPs.

| Type | Name | Value | TTL |
|------|------|-------|-----|
| **A** | `@` | `DO_IP_1` | 1 Hour |
| **A** | `@` | `DO_IP_2` | 1 Hour |
| **A** | `@` | `DO_IP_3` | 1 Hour |

| Placeholder | Where to find the real value |
|-------------|------------------------------|
| `DO_IP_1` | DO App → Settings → Domains → `websconnect.in` → first A record IP |
| `DO_IP_2` | Same screen → second A record IP |
| `DO_IP_3` | Same screen → third A record IP |

**GoDaddy field reference**

```
Type:  A
Name:  @
Value: <paste DO_IP_1>
TTL:   1 Hour
```

Repeat for `DO_IP_2` and `DO_IP_3`. All three A records are required for redundancy.

---

### Subdomain & wildcard — CNAME records

All subdomains (including the wildcard) point to the single DigitalOcean app endpoint. Express middleware on the server distinguishes traffic by `Host` header.

| Type | Name | Value | TTL | Routes to |
|------|------|-------|-----|-----------|
| **CNAME** | `www` | `your-app-xxxxx.ondigitalocean.app` | 1 Hour | Main landing page |
| **CNAME** | `api` | `your-app-xxxxx.ondigitalocean.app` | 1 Hour | `/api/*` JSON routes |
| **CNAME** | `*` | `your-app-xxxxx.ondigitalocean.app` | 1 Hour | Tenant sites by slug |

| Placeholder | Where to find the real value |
|-------------|------------------------------|
| `your-app-xxxxx.ondigitalocean.app` | DO App → Overview → live URL, or Domains config screen |

**GoDaddy field reference (example: `www`)**

```
Type:  CNAME
Name:  www
Value: your-app-xxxxx.ondigitalocean.app
TTL:   1 Hour
```

For the wildcard record, enter only `*` in the Name field — not `*.websconnect.in`.

---

### Complete record summary (copy template)

Replace placeholders, then paste into GoDaddy:

```
# Apex (3 separate A records)
A      @      DO_IP_1          TTL: 1 Hour
A      @      DO_IP_2          TTL: 1 Hour
A      @      DO_IP_3          TTL: 1 Hour

# Subdomains (CNAME — same target for all three)
CNAME  www    your-app-xxxxx.ondigitalocean.app    TTL: 1 Hour
CNAME  api    your-app-xxxxx.ondigitalocean.app    TTL: 1 Hour
CNAME  *      your-app-xxxxx.ondigitalocean.app    TTL: 1 Hour
```

---

## Step 3 — Request routing (Express.js)

Once DNS propagates, every request hits the same DO App Platform instance. The `subdomainRouter` middleware inspects the hostname and branches:

| Incoming Host | Subdomain parsed | Server behavior |
|---------------|------------------|-----------------|
| `websconnect.in` | *(none / apex)* | Serve `public/index.html` (marketing landing) |
| `www.websconnect.in` | `www` | Serve `public/index.html` (marketing landing) |
| `api.websconnect.in` | `api` | Pass through to `/api/*` Express routes |
| `rameshbakery.websconnect.in` | `rameshbakery` | Query PostgreSQL for slug `rameshbakery` → serve stored `index_html` |
| `unknown.websconnect.in` | `unknown` | `404` if slug not found in database |

Implementation lives in:

```
server/
├── index.js                        # Express entrypoint
├── middleware/
│   └── subdomainRouter.js          # Host-based routing logic
└── db/
    └── sites.js                      # DigitalOcean PostgreSQL queries
```

### Run the server locally

```bash
cd server
npm install
cp .env.example .env   # fill in DATABASE_URL, ROOT_DOMAIN
npm start              # http://localhost:3000
```

### Environment variables

| Variable | Example | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP listen port (DO sets this automatically) |
| `ROOT_DOMAIN` | `websconnect.in` | Base domain for subdomain parsing |
| `DATABASE_URL` | `postgresql://user:pass@host:25060/db?sslmode=require` | DigitalOcean Managed PostgreSQL connection string |

---

## Step 4 — Verify DNS propagation

Allow **30 minutes to 2 hours** after saving GoDaddy records.

| Check | Command / URL |
|-------|---------------|
| Apex A records | [dnschecker.org — A / websconnect.in](https://dnschecker.org/#A/websconnect.in) |
| Wildcard CNAME | [dnschecker.org — CNAME / test.websconnect.in](https://dnschecker.org/#CNAME/test.websconnect.in) |
| Landing page | `https://websconnect.in` |
| API health | `https://api.websconnect.in/api/health` |
| Tenant site | `https://<slug>.websconnect.in` |

```bash
# Quick terminal checks
nslookup websconnect.in
nslookup www.websconnect.in
nslookup api.websconnect.in
nslookup demo.websconnect.in
```

---

## Database schema (tenant sites)

Expected PostgreSQL table for wildcard subdomain resolution:

```sql
CREATE TABLE sites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(63) UNIQUE NOT NULL,   -- subdomain, e.g. 'rameshbakery'
  index_html  TEXT NOT NULL,                 -- AI-generated full HTML document
  status      VARCHAR(20) DEFAULT 'draft',   -- 'draft' | 'active' | 'suspended'
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sites_slug_active ON sites (slug) WHERE status = 'active';
```

Only rows with `status = 'active'` are served on the public internet. Draft sites remain watermarked until the ₹499 activation flow completes.

---

## Optional — Move DNS to DigitalOcean

For easier wildcard and apex management, you can delegate DNS from GoDaddy to DigitalOcean:

1. DO → **Networking → Domains** → Add `websconnect.in`
2. GoDaddy → Domain → **Nameservers** → Custom:
   ```
   ns1.digitalocean.com
   ns2.digitalocean.com
   ns3.digitalocean.com
   ```
3. Manage all records inside the DO Networking panel instead of GoDaddy.

---

## License

See [LICENSE](LICENSE).
