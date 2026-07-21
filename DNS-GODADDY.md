# GoDaddy DNS — WebsConnect (websconnect.in)

## Current status (detected)

| Item | Value |
|------|-------|
| Nameservers | `ns33.domaincontrol.com`, `ns34.domaincontrol.com` (GoDaddy) |
| Apex IPs | `3.33.130.190`, `15.197.148.33` (GoDaddy parking — **delete these**) |
| DigitalOcean | Not connected yet |

---

## OPTION A — Easiest (2 minutes)

GoDaddy → **websconnect.in** → **Nameservers** → **Change** → Custom:

```
ns1.digitalocean.com
ns2.digitalocean.com
ns3.digitalocean.com
```

Then DigitalOcean → **Networking** → **Domains** → Add `websconnect.in`

Done. DO manages all DNS automatically.

---

## OPTION B — Manual records in GoDaddy

After deploying on DigitalOcean App Platform, get values from:
**DO → Apps → websconnect → Settings → Domains → websconnect.in**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `DO_IP_1` | 1 Hour |
| A | `@` | `DO_IP_2` | 1 Hour |
| A | `@` | `DO_IP_3` | 1 Hour |
| CNAME | `www` | `your-app.ondigitalocean.app` | 1 Hour |
| CNAME | `api` | `your-app.ondigitalocean.app` | 1 Hour |
| CNAME | `*` | `your-app.ondigitalocean.app` | 1 Hour |

### Delete first

- A `@` → `3.33.130.190`
- A `@` → `15.197.148.33`
- Turn OFF Domain Forwarding

---

## Auto-deploy script

```powershell
cd C:\Users\ATHARVA\websConnect
$env:DIGITALOCEAN_ACCESS_TOKEN = "your_do_token_here"
.\scripts\auto-deploy.ps1
```

This creates the DO app and prints exact DNS values.
