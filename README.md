# Meraki Șantier

Checklist colaborativ pentru execuția șantierului Meraki Lago Resort & Spa.

Stack: Cloudflare Workers + KV pentru state global sincronizat între toate dispozitivele echipei. Deploy automat la fiecare push pe GitHub.

---

## Deploy inițial (totul de pe telefon)

### A. Creezi repo-ul pe GitHub

1. Deschizi **github.com** pe telefon
2. Buton **+** sus dreapta → **New repository**
3. Nume: `meraki-santier`
4. Vizibilitate: **Private** (recomandat — nu vrei ca lumea să-ți vadă lista de subcontractori)
5. **Create repository**
6. Buton **uploading an existing file** → uploadezi conținutul ZIP-ului
7. La final → **Commit changes**

> Alternativ: dacă ai GitHub mobile app, e mai ușor să uploadezi.

### B. Conectezi repo-ul cu Cloudflare

1. Deschizi **dash.cloudflare.com** pe telefon
2. Sidebar: **Compute (Workers)** → **Workers & Pages**
3. Buton **Create**
4. Tab **Import a repository** → autorizezi GitHub dacă prima dată
5. Selectezi `meraki-santier` din lista de repo-uri
6. Pe pagina de configurare:
   - **Project name**: `meraki-santier`
   - **Production branch**: `main`
   - **Build command**: `npm run build`
   - **Deploy command**: `npx wrangler deploy` (rămâne default)
7. **Save and Deploy**

Primul build durează ~1-2 minute. Cloudflare va detecta din `wrangler.jsonc` că vrei un KV namespace `STATE` și-l va crea automat.

### C. URL-ul tău

După deploy, în pagina worker-ului apare URL-ul:

```
https://meraki-santier.<contul-tău>.workers.dev
```

Îl deschizi pe telefon, prima dată îți cere numele cu care să apari, gata.

---

## Modificări ulterioare (totul de pe telefon)

1. Deschizi github.com → repo-ul `meraki-santier`
2. Navighezi la fișierul de modificat (de ex. `src/checklist.html`)
3. Buton **creion** (Edit) sus
4. Faci modificările
5. Scroll jos → **Commit changes**

În ~30-60 secunde, modificarea apare live pentru toată echipa.

> **Tip pe iOS**: în GitHub mobile app sau pe github.com din Safari, editorul are wrap automat și e mai ușor de folosit decât crezi.

---

## Cum funcționează

- **`src/checklist.html`** — frontend-ul. Aici modifici taskuri, design, contacte, etc.
- **`src/worker.js`** — backend-ul (rar de modificat). Servește HTML-ul și are API-ul `/api/state`
- **`build.js`** — injectează HTML-ul în Worker la build time
- **`wrangler.jsonc`** — config Cloudflare (nu modifici)
- **KV namespace `STATE`** — stochează datele globale

### Sincronizare

- La fiecare bifă/asignare/notă, clientul trimite o operație fină către server
- Polling la 5 secunde pentru a vedea modificările echipei
- Optimistic UI: schimbarea apare instant pe device-ul tău, sync-ul rulează în background
- Offline fallback: dacă pierzi netul, salvezi local; când revine, se sincronizează

---

## Operațiuni utile (din dashboard Cloudflare)

### Logs live
- Worker-ul tău → **Logs** tab → vezi request-uri, erori în timp real

### Vezi datele curente
- Sidebar: **Storage & Databases** → **KV**
- Click pe `STATE` namespace
- Cheia `global-state` are tot state-ul (bife, asignări, etc.)
- Cheia `audit-log` are ultimele 100 acțiuni

### Reset complet din dashboard
- KV namespace `STATE` → ștergi cheia `global-state`
- Sau, din UI: long-press pe butonul ↺ din header → confirmi

### Custom domain (opțional)
- Worker-ul tău → **Settings** → **Domains & Routes** → **Add**
- Introduci `santier.merakiestate.ro` → DNS-ul se setează automat dacă domeniul e pe Cloudflare

---

## Costuri estimate

La volumul echipei tale (5-10 oameni, ~100 acțiuni/zi):

- **Workers Free tier**: 100.000 requests/zi
- **KV Free tier**: 100.000 reads/zi, 1.000 writes/zi

Polling-ul la 5s × 10 oameni × 8 ore = ~57.600 reads/zi → sub limită.

**Cost lunar așteptat: 0 USD.**

---

## Troubleshooting

### Build-ul eșuează la primul deploy
- Verifică în log-uri dacă `npm install` a mers
- De obicei: lipsește `package-lock.json` → în Cloudflare, **Settings → Builds → Edit configuration** → schimbi build command în `npm install && npm run build`

### KV nu se conectează (eroare 500 pe /api/state)
- Dashboard → Worker → **Settings → Bindings**
- Verifică să existe binding `STATE` → KV namespace
- Dacă nu există, **Add binding** manual

### Vreau să șterg tot și să iau de la zero
- Worker-ul tău → **Settings → Delete**
- KV namespace → Settings → Delete
- Reconectezi repo-ul

---

## Dezvoltare locală (opțional, de pe laptop)

Dacă vrei să testezi modificările înainte să faci push:

```bash
git clone <repo-url>
cd meraki-santier
npm install
npx wrangler login
npm run dev   # pornește server local pe :8787
```

---

## Securitate

În prima fază, oricine cu URL-ul poate vedea și edita. Pentru a adăuga login (Cloudflare Access cu Google OAuth pentru echipă), spune-mi și adaug — sunt ~10 minute de configurare în Cloudflare.

---

## Structura fișierelor

```
meraki-santier/
├── src/
│   ├── worker.js              # Backend (API + serving)
│   └── checklist.html         # Frontend
├── .github/workflows/
│   └── deploy.yml             # Backup CI/CD (folosit doar dacă nu mergi pe Workers Builds)
├── build.js                   # Bundle script
├── wrangler.jsonc             # Config Cloudflare
├── package.json
├── .gitignore
└── README.md                  # Acest fișier
```
