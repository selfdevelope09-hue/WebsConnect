# WebsConnect — Poora Setup (Sirf 3 Steps)

> **Tumhe kuch samajhne ki zaroorat nahi.** Bas neeche 3 steps follow karo, copy-paste karo.

---

## STEP 1 — DigitalOcean par App Deploy Karo (10 minute)

### 1a. GitHub par code upload karo

1. [github.com](https://github.com) → Login → **New repository** → naam: `websConnect` → Create
2. Apne computer par yeh commands chalao (Cursor terminal mein):

```powershell
cd C:\Users\ATHARVA\websConnect
git add .
git commit -m "WebsConnect landing + server"
git branch -M main
git remote add origin https://github.com/TUMHARA_USERNAME/websConnect.git
git push -u origin main
```

> `TUMHARA_USERNAME` ko apne GitHub username se replace karo.

### 1b. DigitalOcean par app banao

1. [cloud.digitalocean.com](https://cloud.digitalocean.com) → Login
2. **Create** → **Apps** → **GitHub** connect karo
3. Repo select karo: **websConnect** → branch **main**
4. DO automatically `Dockerfile` detect karega ✅
5. **Add Database** → PostgreSQL 16 → naam: `websconnect-db`
6. Environment variables check karo:
   - `ROOT_DOMAIN` = `websconnect.in`
   - `DATABASE_URL` = database se auto-link hoga
7. **Create Resources** → wait 5-10 min deploy hone tak

### 1c. Database table banao

1. DO → **Databases** → `websconnect-db` → **Console** (ya Query tab)
2. `server/db/migrate.sql` file ka pura content copy karke paste karo → **Run**

---

## STEP 2 — Domain Connect Karo (5 minute)

Deploy success ke baad:

1. DO App → **Settings** → **Domains** → **Add Domain**
2. Ek ek karke add karo:
   - `websconnect.in`
   - `www.websconnect.in`
   - `api.websconnect.in`
   - `*.websconnect.in`

3. DO tumhe **DNS records** dikhayega — screenshot lo ya copy karo.

---

## STEP 3 — GoDaddy DNS (Sirf Copy-Paste)

### Option A — Aasaan tarika (Recommended): Nameservers change karo

GoDaddy mein sirf **3 nameservers** change karo, baaki DO sambhal lega:

1. [godaddy.com](https://godaddy.com) → **websconnect.in** → **DNS**
2. **Nameservers** → **Change** → **Enter my own nameservers**
3. Yeh 3 daalo:

```
ns1.digitalocean.com
ns2.digitalocean.com
ns3.digitalocean.com
```

4. Save karo
5. Wapas DigitalOcean → **Networking** → **Domains** → **Add Domain** → `websconnect.in`
6. DO apne aap saari DNS records bana dega ✅

### Option B — GoDaddy DNS records manually (agar nameserver change nahi karna)

DO Domains screen se jo values dikhe, wahi GoDaddy mein daalo:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | *(DO se IP #1)* | 1 Hour |
| A | `@` | *(DO se IP #2)* | 1 Hour |
| A | `@` | *(DO se IP #3)* | 1 Hour |
| CNAME | `www` | *(DO app hostname)* | 1 Hour |
| CNAME | `api` | *(DO app hostname)* | 1 Hour |
| CNAME | `*` | *(DO app hostname)* | 1 Hour |

**GoDaddy mein:**
- Purana parking A record **delete** karo
- Domain Forwarding **OFF** karo
- Name field mein sirf `@`, `www`, `api`, `*` likho

---

## Ho Gaya! Test Karo (1-2 ghante baad)

| URL | Kya dikhna chahiye |
|-----|-------------------|
| https://websconnect.in | Landing page |
| https://api.websconnect.in/health | `{"status":"ok"}` |
| https://demo.websconnect.in | Demo bakery site |

---

## Problem?

| Issue | Fix |
|-------|-----|
| Site nahi khul rahi | 1-2 ghante wait karo (DNS propagate) |
| 502 error | DO App logs check karo → Runtime Logs |
| Database error | `migrate.sql` run kiya? `DATABASE_URL` set hai? |
| GoDaddy records save nahi ho rahe | Domain Forwarding band karo pehle |

---

## Mujhse madad chahiye?

Cursor chat mein bhejo:
1. DigitalOcean app ka screenshot (Domains page)
2. Ya app hostname (`something.ondigitalocean.app`)

Main exact DNS values likh dunga — bas copy-paste karna.
