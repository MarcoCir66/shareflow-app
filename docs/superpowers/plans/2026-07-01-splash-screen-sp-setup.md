# Splash Screen + SharePoint Setup Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All'avvio dell'app mostrare una splash screen animata (3.4s, tema logo) che si risolve sempre in una modale che raccoglie/conferma la SharePoint tenant URL.

**Architecture:** Tre unità: `SpSetupModal` (logica + UI credenziale), `SplashScreen` (animazione CSS-only), modifica di `App.jsx` per orchestrarle. La validazione URL è estratta come funzione pura per poter essere testata con Vitest senza RTL.

**Tech Stack:** React 18, Tailwind CSS (classi `ink-*` / `flow-*`), CSS custom animations, `localStorage`, Vitest (unit test della sola logica pura).

## Global Constraints

- Nessuna nuova dipendenza npm
- Font: `'Hanken Grotesk', system-ui, sans-serif` (già presente in `body` di `index.css`)
- Colori: `#34BFAE` (teal logo), `#0d0d1f` (sfondo splash), classi Tailwind `ink-*`/`flow-*` per la modale
- Durata splash: esattamente 3400ms
- Chiave localStorage: `sf_sp_url`
- Validazione URL: deve iniziare con `https://` e contenere `.sharepoint.com`
- File test con Vitest: stessa cartella del file testato, suffisso `.test.js`
- Commit dopo ogni task

---

## File Structure

| File | Azione | Responsabilità |
|------|--------|----------------|
| `client/src/utils/spUrl.js` | Crea | Funzione pura `validateSpUrl(url): boolean` |
| `client/src/utils/spUrl.test.js` | Crea | Unit test di `validateSpUrl` |
| `client/src/components/layout/SpSetupModal.jsx` | Crea | UI modale credenziale SharePoint |
| `client/src/components/layout/SplashScreen.jsx` | Crea | Animazione splash con logo |
| `client/src/index.css` | Modifica | Aggiunge `@keyframes pulse-ring` e classi animazione splash |
| `client/src/App.jsx` | Modifica | Orchestrazione splash → modale → app in `AppRoot` |

---

## Task 1: Validazione URL (funzione pura + test)

**Files:**
- Create: `client/src/utils/spUrl.js`
- Create: `client/src/utils/spUrl.test.js`

**Interfaces:**
- Produces: `validateSpUrl(url: string): boolean` — esportata named, usata da `SpSetupModal`

- [ ] **Step 1: Scrivi il test**

`client/src/utils/spUrl.test.js`:
```js
import { test, expect } from 'vitest'
import { validateSpUrl } from './spUrl.js'

test('accetta URL .sharepoint.com con https', () => {
  expect(validateSpUrl('https://contoso.sharepoint.com')).toBe(true)
})

test('accetta URL con path dopo il dominio', () => {
  expect(validateSpUrl('https://contoso.sharepoint.com/sites/intranet')).toBe(true)
})

test('rifiuta URL senza https', () => {
  expect(validateSpUrl('http://contoso.sharepoint.com')).toBe(false)
})

test('rifiuta URL senza .sharepoint.com', () => {
  expect(validateSpUrl('https://contoso.example.com')).toBe(false)
})

test('rifiuta stringa vuota', () => {
  expect(validateSpUrl('')).toBe(false)
})

test('rifiuta undefined / null', () => {
  expect(validateSpUrl(null)).toBe(false)
  expect(validateSpUrl(undefined)).toBe(false)
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

```bash
cd client && npx vitest run src/utils/spUrl.test.js
```
Atteso: errore `Cannot find module './spUrl.js'`

- [ ] **Step 3: Implementa la funzione**

`client/src/utils/spUrl.js`:
```js
export function validateSpUrl(url) {
  if (!url || typeof url !== 'string') return false
  return url.startsWith('https://') && url.includes('.sharepoint.com')
}
```

- [ ] **Step 4: Esegui il test e verifica che passi**

```bash
cd client && npx vitest run src/utils/spUrl.test.js
```
Atteso: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add client/src/utils/spUrl.js client/src/utils/spUrl.test.js
git commit -m "feat: add validateSpUrl pure utility with tests"
```

---

## Task 2: SpSetupModal

**Files:**
- Create: `client/src/components/layout/SpSetupModal.jsx`

**Interfaces:**
- Consumes: `validateSpUrl(url): boolean` da `../../utils/spUrl.js`
- Produces: componente `<SpSetupModal onConfirm={fn} onSkip={fn} />` — `onConfirm(url: string)` chiamato con URL validato, `onSkip()` chiamato senza argomenti

- [ ] **Step 1: Crea il componente**

`client/src/components/layout/SpSetupModal.jsx`:
```jsx
import { useState } from 'react'
import { validateSpUrl } from '../../utils/spUrl.js'

export default function SpSetupModal({ onConfirm, onSkip }) {
  const [value, setValue] = useState(() => localStorage.getItem('sf_sp_url') ?? '')
  const [error, setError]  = useState(false)

  function handleConfirm() {
    const trimmed = value.trim()
    if (!validateSpUrl(trimmed)) {
      setError(true)
      return
    }
    localStorage.setItem('sf_sp_url', trimmed)
    onConfirm(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-ink-800 rounded-2xl border border-ink-700 w-full max-w-md shadow-2xl p-6 space-y-5">
        <div>
          <h2 className="text-white font-semibold text-lg">Configura SharePoint</h2>
          <p className="text-ink-400 text-sm mt-1">
            Connetti Shareflow al tuo tenant Microsoft 365 per abilitare la pubblicazione su SharePoint.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-ink-300 font-medium" htmlFor="sp-url-input">
            SharePoint URL
          </label>
          <input
            id="sp-url-input"
            type="url"
            value={value}
            onChange={e => { setValue(e.target.value); setError(false) }}
            placeholder="https://contoso.sharepoint.com"
            className="w-full bg-ink-950 border border-ink-600 rounded-lg px-3 py-2 text-sm text-white placeholder-ink-500 focus:outline-none focus:border-flow-400"
          />
          {error && (
            <p className="text-xs text-red-400">
              Inserisci un URL valido (es. https://contoso.sharepoint.com)
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 rounded-lg bg-flow-400 text-ink-950 font-semibold text-sm hover:bg-flow-600 transition-colors"
          >
            Attiva
          </button>
          <button
            onClick={onSkip}
            className="flex-1 py-2 rounded-lg bg-ink-700 text-white text-sm hover:bg-ink-600 transition-colors"
          >
            Salta per ora
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verifica visiva rapida** (opzionale, se dev server è già avviato)

Importa temporaneamente `SpSetupModal` in `App.jsx` e renderizzalo al posto di `<AppRoot />`, poi ripristina.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/layout/SpSetupModal.jsx
git commit -m "feat: add SpSetupModal for SharePoint URL configuration"
```

---

## Task 3: CSS animazioni splash

**Files:**
- Modify: `client/src/index.css`

**Interfaces:**
- Produces: classi CSS `.splash-logo-entering`, `.splash-logo-entered`, `.splash-ring`, `.splash-wordmark`, `.splash-wordmark-visible`, `.splash-exit` + `@keyframes pulse-ring`

- [ ] **Step 1: Aggiungi le regole CSS in fondo a `client/src/index.css`**

```css
/* ── SplashScreen ─────────────────────────────────── */
.splash-logo-entering {
  opacity: 0;
  transform: scale(0.6);
}
.splash-logo-entered {
  opacity: 1;
  transform: scale(1);
  transition: opacity 400ms cubic-bezier(0.34, 1.56, 0.64, 1),
              transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.splash-ring {
  animation: pulse-ring 1000ms ease-out 2;
  pointer-events: none;
}

.splash-wordmark {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 400ms ease 200ms, transform 400ms ease 200ms;
}
.splash-wordmark-visible {
  opacity: 1;
  transform: translateY(0);
}

.splash-exit {
  animation: splash-exit-anim 600ms ease-in-out forwards;
}

@keyframes pulse-ring {
  0%   { transform: scale(1);   opacity: 0.6; }
  100% { transform: scale(2.5); opacity: 0; }
}

@keyframes splash-exit-anim {
  from { clip-path: inset(0 0 0% 0); }
  to   { clip-path: inset(0 0 100% 0); }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/index.css
git commit -m "feat: add splash screen CSS keyframes and animation classes"
```

---

## Task 4: SplashScreen component

**Files:**
- Create: `client/src/components/layout/SplashScreen.jsx`

**Interfaces:**
- Consumes: classi CSS da Task 3
- Produces: `<SplashScreen onDone={fn} />` — chiama `onDone()` dopo 3400ms (al termine di `splash-exit-anim`)

- [ ] **Step 1: Crea il componente**

`client/src/components/layout/SplashScreen.jsx`:
```jsx
import { useState, useEffect } from 'react'

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('entering')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('pulsing'),  400)
    const t2 = setTimeout(() => setPhase('exiting'),  2800)
    const t3 = setTimeout(() => onDone(),             3400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center${phase === 'exiting' ? ' splash-exit' : ''}`}
      style={{
        background: 'radial-gradient(ellipse at center, color-mix(in srgb, #34BFAE 20%, transparent) 0%, #0d0d1f 70%)',
      }}
    >
      <div className="relative flex items-center justify-center">
        {phase !== 'entering' && (
          <div
            className="splash-ring absolute rounded-full border-2 border-flow-400"
            style={{ width: 80, height: 80 }}
          />
        )}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="80"
          height="76"
          viewBox="0 0 48 46"
          fill="none"
          className={phase === 'entering' ? 'splash-logo-entering' : 'splash-logo-entered'}
        >
          <path
            fill="#34BFAE"
            d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
          />
        </svg>
      </div>

      <p
        className={`mt-4 text-flow-400 font-semibold text-xl tracking-wide splash-wordmark${phase !== 'entering' ? ' splash-wordmark-visible' : ''}`}
      >
        Shareflow
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/layout/SplashScreen.jsx
git commit -m "feat: add SplashScreen animation component"
```

---

## Task 5: Integrazione in App.jsx

**Files:**
- Modify: `client/src/App.jsx` (righe 157–183, funzione `AppRoot`)

**Interfaces:**
- Consumes: `<SplashScreen onDone={fn} />` da Task 4
- Consumes: `<SpSetupModal onConfirm={fn} onSkip={fn} />` da Task 2

- [ ] **Step 1: Aggiungi gli import in cima a `App.jsx`**

Dopo la riga `import { updateProject } from './lib/projectsApi.js'` aggiungi:
```js
import SplashScreen from './components/layout/SplashScreen.jsx'
import SpSetupModal from './components/layout/SpSetupModal.jsx'
```

- [ ] **Step 2: Sostituisci `AppRoot`**

Sostituisci l'intera funzione `AppRoot` (righe 157–183):
```jsx
function AppRoot() {
  const { dispatch, ACTIONS } = useConfigurator()
  const [splashDone, setSplashDone] = useState(false)
  const [modalDone, setModalDone]   = useState(false)
  const [activeProject, setActiveProject] = useState(null)

  function handleOpenProject(project) {
    dispatch({ type: ACTIONS.LOAD_PROJECT, payload: { canvasState: project.canvasState } })
    setActiveProject({ id: project.id, name: project.name, description: project.description, client: project.client, tags: project.tags, status: project.status })
  }

  function handleUpdateMeta(meta) {
    setActiveProject(prev => ({ ...prev, ...meta }))
  }

  if (!splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />
  if (!modalDone)  return <SpSetupModal onConfirm={() => setModalDone(true)} onSkip={() => setModalDone(true)} />

  if (!activeProject) return <ProjectDashboard onOpen={handleOpenProject} />

  return (
    <AppCanvas
      projectId={activeProject.id}
      projectName={activeProject.name}
      projectMeta={activeProject}
      onUpdateMeta={handleUpdateMeta}
      onGoToDashboard={() => setActiveProject(null)}
    />
  )
}
```

- [ ] **Step 3: Verifica che l'app si avvii**

```bash
cd client && npm run dev
```

Apri `http://localhost:5173`. Verifica:
1. Splash appare su sfondo scuro con logo teal centrato
2. Logo scala in ingresso (spring) nella prima frazione di secondo
3. Ring pulse teal emesso attorno al logo (2 volte)
4. Testo "Shareflow" appare con fade-in
5. Dopo ~2.8s lo splash fa clip-path exit (wipe verso l'alto)
6. Modale appare con campo URL pre-compilato dall'ultima sessione (o vuoto alla prima visita)
7. Click "Salta per ora" → modale si chiude, app si avvia normalmente
8. Ricarica → splash riparte da capo, modale mostra il valore precedente
9. Inserire `https://contoso.sharepoint.com` → click "Attiva" → modale si chiude
10. URL salvato: `localStorage.getItem('sf_sp_url')` nel console = `'https://contoso.sharepoint.com'`
11. Inserire URL non valido (es. `http://foo.com`) → messaggio errore inline, modale resta aperta

- [ ] **Step 4: Commit finale**

```bash
git add client/src/App.jsx
git commit -m "feat: wire SplashScreen and SpSetupModal into AppRoot"
```
