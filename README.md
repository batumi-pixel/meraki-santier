# Meraki Șantier

Checklist colaborativ pentru execuția șantierului Meraki Lago Resort & Spa.

**Arhitectură:**
- **`src/worker.js`** — Worker minimal cu API-ul (`/api/state`, `/api/audit`). Rar de modificat.
- **`public/index.html`** — Frontend-ul. Modificările aici se aplică instant fără să atingi worker-ul.
- **KV namespace `STATE`** — datele globale (bife, asignări, contacte, audit log)

Deploy automat la fiecare push pe GitHub.

---

## Pasul 1: Repo GitHub

1. github.com → **New repository**
2. Nume: `meraki-santier`, Private
3. Upload conținutul ZIP-ului (păstrând structura `src/`, `public/`)
4. Commit

## Pasul 2: Conectează la Cloudflare

1. dash.cloudflare.com → **Workers & Pages** → **Create**
2. Tab **Import a repository**
3. Selectează `meraki-santier`
4. Configurare:
   - **Project name**: `meraki-santier`
   - **Production branch**: `main`
   - **Build command**: lăsi gol
   - **Deploy command**: `npx wrangler deploy` (default)
5. **Save and Deploy**

Cloudflare detectează din `wrangler.jsonc`:
- Asset binding (uploadează automat `public/` ca static assets)
- KV namespace `STATE` (îl creează la primul deploy)

Primul deploy: ~1-2 minute.

## Pasul 3: URL-ul

În pagina worker-ului apare:
```
https://meraki-santier.<contul-tău>.workers.dev
```

Îl deschizi, prima dată îți cere numele cu care să apari, gata.

---

## De ce e mai bună arhitectura asta

**Două scenarii pentru update:**

### Scenariu A: Modifici HTML-ul (90% din cazuri)
- github.com → `public/index.html` → ✎ Edit
- Faci modificarea (adaugi task, schimbi text, modifici design)
- Commit
- ~30 secunde și e live

### Scenariu B: Modifici worker-ul (foarte rar)
- github.com → `src/worker.js` → ✎ Edit
- Commit

În ambele cazuri, **nimic copy-paste**, totul prin git.

---

## Bonus: editare HTML direct prin Cloudflare Dashboard

Dacă vrei să modifici HTML-ul **fără să mai treci prin GitHub**:

1. Worker-ul tău → tab **Edit code**
2. Sidebar stânga arată structura: `src/worker.js` și `public/index.html`
3. Click pe `public/index.html` → editezi → **Deploy**

> ⚠ Atenție: modificările făcute din dashboard **nu se reflectă în git**. La următorul push de pe GitHub, modificările din dashboard se pierd. Folosește dashboard-ul doar pentru fix-uri rapide pe care le replici după aceea în git.

Cel mai curat e tot prin github.com — păstrezi istoria modificărilor.

---

## Operațiuni utile

### Logs live
Worker-ul tău → **Logs** tab

### Vezi datele curente
Sidebar Cloudflare → **Storage & Databases** → **KV** → namespace `meraki-santier-STATE` → cheia `global-state`

### Audit log
În browser: `https://meraki-santier.<cont>.workers.dev/api/audit`

### Reset complet
Long-press pe butonul ↺ în header → confirmi

### Custom domain
Worker → **Settings** → **Domains & Routes** → Add `santier.merakiestate.ro`

---

## Cum funcționează sincronizarea

- La fiecare bifă/asignare/notă, clientul trimite o **operație fină** către server (`toggleDone`, `setAssign`, etc.)
- Polling la 5 secunde pentru a vedea modificările echipei
- Optimistic UI: schimbarea apare instant pe device-ul tău, sync rulează în background
- Offline fallback: dacă pierzi netul, bifezi local; când revine, se sincronizează
- Fine-grained ops: dacă tu bifezi task-A și Marian asignează task-B simultan, ambele se aplică (nu se calcă)
- Audit log: ultimele 100 acțiuni cu autorul lor

---

## Costuri estimate

- **Workers Free**: 100k req/zi
- **KV Free**: 100k reads/zi, 1k writes/zi
- **Static Assets Free**: incluse

La 10 oameni × polling 5s × 8h = ~58k reads/zi → sub limită.

**Cost lunar așteptat: 0 USD.**

---

## Dezvoltare locală (opțional, de pe laptop)

```bash
git clone <repo-url>
cd meraki-santier
npm install
npx wrangler login
npm run dev   # server local pe :8787
```

---

## Securitate

În prima fază, oricine cu URL-ul poate vedea și edita. Pentru auth (Cloudflare Access cu Google login), spune-mi și adaug.

---

## Structura fișierelor

```
meraki-santier/
├── public/
│   └── index.html             ← Frontend (modifici aici)
├── src/
│   └── worker.js              ← Backend API
├── wrangler.jsonc             ← Config Cloudflare
├── package.json
├── .gitignore
└── README.md
```
