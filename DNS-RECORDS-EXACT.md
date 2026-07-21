# WebsConnect — EXACT GoDaddy DNS Records
# App live: https://websconnect-op4o6.ondigitalocean.app
# Generated: 2026-07-12

## DELETE these old records first (GoDaddy parking)

| Type | Name | Value | Action |
|------|------|-------|--------|
| A | @ | 3.33.130.190 | DELETE |
| A | @ | 15.197.148.33 | DELETE |

Also turn OFF **Domain Forwarding**.

---

## ADD these 5 records in GoDaddy

| Type | Name | Value | TTL |
|------|------|-------|-----|
| **A** | `@` | `162.159.140.98` | 1 Hour |
| **A** | `@` | `172.66.0.96` | 1 Hour |
| **CNAME** | `www` | `websconnect-op4o6.ondigitalocean.app` | 1 Hour |
| **CNAME** | `api` | `websconnect-op4o6.ondigitalocean.app` | 1 Hour |
| **CNAME** | `*` | `websconnect-op4o6.ondigitalocean.app` | 1 Hour |

---

## Copy-paste for GoDaddy

```
DELETE  A  @  3.33.130.190
DELETE  A  @  15.197.148.33

ADD     A      @    162.159.140.98                         TTL 1 Hour
ADD     A      @    172.66.0.96                            TTL 1 Hour
ADD     CNAME  www  websconnect-op4o6.ondigitalocean.app   TTL 1 Hour
ADD     CNAME  api  websconnect-op4o6.ondigitalocean.app   TTL 1 Hour
ADD     CNAME  *    websconnect-op4o6.ondigitalocean.app   TTL 1 Hour
```

---

## What each URL does

| URL | Serves |
|-----|--------|
| https://websconnect.in | Landing page |
| https://www.websconnect.in | Landing page |
| https://api.websconnect.in/health | API health check |
| https://demo.websconnect.in | Customer tenant site |

---

## Test now (before DNS propagates)

- App: https://websconnect-op4o6.ondigitalocean.app
- Health: https://websconnect-op4o6.ondigitalocean.app/api/health

---

## DigitalOcean App

- App ID: `05824e52-8e54-43c6-bffb-6e89a56dbfb7`
- Region: Bangalore (blr)
- Database: PostgreSQL 16 (dev)

Run `server/db/migrate.sql` in DO Database Console to create tenant sites table.
