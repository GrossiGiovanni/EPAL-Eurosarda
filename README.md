# EPAL Dashboard — Eurosarda Milano

Dashboard per la gestione dei bancali EPAL: clienti, corrispondenti, buoni EPAL, export Excel.

## Stack
- **Frontend**: React + Vite
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Excel**: SheetJS

---

## Setup iniziale (una tantum)

### 1. Configura Supabase

1. Vai su [supabase.com](https://supabase.com) → apri il tuo progetto
2. Vai su **SQL Editor** → clicca **New query**
3. Copia e incolla tutto il contenuto di `supabase_schema.sql`
4. Clicca **Run** — questo crea tutte le tabelle, le viste e inserisce i dati iniziali

### 2. Crea il primo utente

In Supabase → **Authentication** → **Users** → **Add user**:
- Email: `mario@eurosarda.it` (o quella che preferisci)
- Password: scegli una password sicura
- Clicca **Create user**

Ripeti per ogni persona che deve accedere (Federico, Fabio, ecc.)

### 3. Installa e avvia in locale

```bash
# Clona il repository
git clone git@github.com:GrossiGiovanni/EPAL-Eurosarda.git
cd EPAL-Eurosarda

# Installa dipendenze
npm install

# Crea il file .env (già incluso, non modificare se le credenziali sono corrette)
# VITE_SUPABASE_URL=https://uogusncgcfpmzrklelmg.supabase.co
# VITE_SUPABASE_ANON_KEY=sb_publishable_usip2Mgj-RY0NYhGYjVB7g_nGnAZd7a

# Avvia in locale
npm run dev
# → Apri http://localhost:5173
```

### 4. Deploy su Vercel

1. Vai su [vercel.com](https://vercel.com) → **Add New Project**
2. Importa il repository GitHub `GrossiGiovanni/EPAL-Eurosarda`
3. In **Environment Variables** aggiungi:
   - `VITE_SUPABASE_URL` = `https://uogusncgcfpmzrklelmg.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_usip2Mgj-RY0NYhGYjVB7g_nGnAZd7a`
4. Clicca **Deploy**

Da questo momento ogni `git push` sul branch `main` aggiorna automaticamente il sito.

---

## Uso quotidiano

### Aggiungere un movimento cliente
1. Vai su **Clienti**
2. Clicca sulla riga del cliente per espanderla
3. Clicca **+ Movimento**
4. Inserisci data, affidati/consegnati, eventuale anomalia
5. Salva

### Aggiungere un movimento corrispondente
1. Vai su **Corrispondenti**
2. Espandi il corrispondente
3. Clicca **+ Movimento**
4. Inserisci distinta, affidati, riscontro scarico

### Esportare gli Excel
1. Vai su **Esporta / Importa**
2. Clicca il bottone del file che vuoi scaricare
3. Il file viene generato nel browser con la struttura originale

### Inventario settimanale
1. Vai su **Esporta / Importa** → sezione **Inventario settimanale**
2. Inserisci la data e il conteggio fisico dei pallet
3. Salva

---

## Struttura del progetto

```
src/
  components/
    Sidebar.jsx         # Navigazione laterale
  pages/
    Login.jsx           # Pagina di accesso
    Dashboard.jsx       # KPI e grafici
    Clienti.jsx         # Gestione clienti
    Corrispondenti.jsx  # Gestione corrispondenti
    BuoniEpal.jsx       # Gestione buoni EPAL
    ExportImport.jsx    # Export Excel e inventario
  lib/
    supabase.js         # Client Supabase
    excel.js            # Import/export Excel
  hooks/
    useToast.js         # Notifiche
```

---


