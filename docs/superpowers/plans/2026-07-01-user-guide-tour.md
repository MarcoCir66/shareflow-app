# User Guide Tour — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere un tour guidato interattivo (5 step, spotlight overlay) avviabile dal pulsante "Guida" nella Navbar.

**Architecture:** Dati statici in `tourSteps.js`, logica di stato in `useTour.js`, rendering in `TourOverlay.jsx`. Elementi target identificati tramite attributi `data-tour`. Il tutto si integra in `AppCanvas` via `useTour` e in `Navbar` con un nuovo pulsante.

**Tech Stack:** React 18, Tailwind CSS (`ink-*`/`flow-*`), Vitest (test struttura dati), nessuna libreria aggiuntiva.

## Global Constraints

- Nessuna nuova dipendenza npm
- Tailwind: `bg-ink-800 border-ink-700 rounded-2xl` per il popover (coerente con DeployModal)
- Colori: `flow-400` per accenti, `ink-300`/`ink-400` per testi secondari
- Attributi `data-tour`: valori esatti `block-library`, `canvas`, `properties-panel`, `preview-btn`, `deploy-btn`
- Popover: larghezza fissa 320px, offset 12px dal target
- Spotlight: `box-shadow: 0 0 0 9999px rgba(13, 13, 31, 0.85)`, `border-radius: 8px`, padding 4px
- z-index overlay: `z-[60]`
- Step count: esattamente 5, nell'ordine block-library → canvas → properties-panel → preview-btn → deploy-btn
- File test: Vitest, stessa cartella del sorgente, suffisso `.test.js`

---

## File Structure

| File | Azione | Responsabilità |
|------|--------|----------------|
| `client/src/data/tourSteps.js` | Crea | Array statico `TOUR_STEPS` con i 5 step |
| `client/src/data/tourSteps.test.js` | Crea | Valida struttura di `TOUR_STEPS` |
| `client/src/hooks/useTour.js` | Crea | Hook: stato active/stepIndex/rect, metodi start/next/prev/skip, ResizeObserver |
| `client/src/components/layout/TourOverlay.jsx` | Crea | Overlay + spotlight + popover |
| `client/src/components/layout/LeftSidebar.jsx` | Modifica | Aggiunge `data-tour="block-library"` al div root |
| `client/src/components/canvas/CanvasDropZone.jsx` | Modifica | Aggiunge `data-tour="canvas"` al div root |
| `client/src/components/layout/WorkspaceShell.jsx` | Modifica | Aggiunge `data-tour="properties-panel"` all'aside destro |
| `client/src/components/layout/Navbar.jsx` | Modifica | Aggiunge `data-tour` a preview/deploy + pulsante "Guida" con prop `onGuideClick` |
| `client/src/App.jsx` | Modifica | Instanzia `useTour` in `AppCanvas`, passa `onGuideClick={start}`, monta `TourOverlay` |

---

## Task 1: tourSteps data + test

**Files:**
- Create: `client/src/data/tourSteps.js`
- Create: `client/src/data/tourSteps.test.js`

**Interfaces:**
- Produces: `TOUR_STEPS` — array esportato named, usato da `useTour.js` e `TourOverlay.jsx`

- [ ] **Step 1: Scrivi il test**

`client/src/data/tourSteps.test.js`:
```js
import { test, expect } from 'vitest'
import { TOUR_STEPS } from './tourSteps.js'

const VALID_POSITIONS = ['top', 'bottom', 'left', 'right']

test('TOUR_STEPS has exactly 5 entries', () => {
  expect(TOUR_STEPS).toHaveLength(5)
})

test('every step has required string fields', () => {
  for (const step of TOUR_STEPS) {
    expect(typeof step.id).toBe('string')
    expect(step.id.length).toBeGreaterThan(0)
    expect(typeof step.targetSelector).toBe('string')
    expect(typeof step.title).toBe('string')
    expect(typeof step.description).toBe('string')
    expect(VALID_POSITIONS).toContain(step.popoverPosition)
  }
})

test('step ids are unique', () => {
  const ids = TOUR_STEPS.map(s => s.id)
  expect(new Set(ids).size).toBe(ids.length)
})

test('targetSelector matches data-tour id convention', () => {
  for (const step of TOUR_STEPS) {
    expect(step.targetSelector).toBe(`[data-tour="${step.id}"]`)
  }
})

test('steps are in expected order', () => {
  const ids = TOUR_STEPS.map(s => s.id)
  expect(ids).toEqual([
    'block-library',
    'canvas',
    'properties-panel',
    'preview-btn',
    'deploy-btn',
  ])
})
```

- [ ] **Step 2: Esegui il test — verifica che fallisca**

```bash
cd client && npx vitest run src/data/tourSteps.test.js
```
Atteso: errore `Cannot find module './tourSteps.js'`

- [ ] **Step 3: Crea il file dati**

`client/src/data/tourSteps.js`:
```js
export const TOUR_STEPS = [
  {
    id: 'block-library',
    targetSelector: '[data-tour="block-library"]',
    title: 'La libreria dei blocchi',
    description: 'I blocchi sono i mattoni della tua intranet. Ogni blocco rappresenta un widget — news, eventi, documenti, meteo e molto altro. Sono organizzati in 4 categorie: Comunicazione, Learning, Produttività, Knowledge Base.',
    popoverPosition: 'right',
  },
  {
    id: 'canvas',
    targetSelector: '[data-tour="canvas"]',
    title: 'Il canvas',
    description: 'Trascina un blocco dalla libreria e rilascialo qui per aggiungerlo alla pagina. Puoi riordinare i blocchi trascinandoli, e organizzarli in colonne affiancate.',
    popoverPosition: 'top',
  },
  {
    id: 'properties-panel',
    targetSelector: '[data-tour="properties-panel"]',
    title: 'Configura ogni blocco',
    description: 'Seleziona un blocco sul canvas per accedere alle sue proprietà: scope di visibilità, commenti, like, lettura obbligatoria. Ogni blocco ha le sue opzioni specifiche.',
    popoverPosition: 'left',
  },
  {
    id: 'preview-btn',
    targetSelector: '[data-tour="preview-btn"]',
    title: 'Anteprima in tempo reale',
    description: "Clicca qui per vedere l'intranet così come la vedranno i tuoi colleghi su SharePoint. L'anteprima si aggiorna ad ogni modifica.",
    popoverPosition: 'bottom',
  },
  {
    id: 'deploy-btn',
    targetSelector: '[data-tour="deploy-btn"]',
    title: 'Pubblica su SharePoint',
    description: 'Quando la tua intranet è pronta, clicca qui per pubblicarla direttamente nel tuo tenant Microsoft 365. Il processo è automatico e richiede pochi minuti.',
    popoverPosition: 'bottom',
  },
]
```

- [ ] **Step 4: Esegui il test — verifica che passi**

```bash
cd client && npx vitest run src/data/tourSteps.test.js
```
Atteso: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add client/src/data/tourSteps.js client/src/data/tourSteps.test.js
git commit -m "feat: add TOUR_STEPS data with Vitest validation"
```

---

## Task 2: useTour hook

**Files:**
- Create: `client/src/hooks/useTour.js`

**Interfaces:**
- Consumes: `TOUR_STEPS` da `../data/tourSteps.js`
- Produces: `useTour()` → `{ active: boolean, stepIndex: number, rect: DOMRect|null, start: () => void, next: () => void, prev: () => void, skip: () => void }`

- [ ] **Step 1: Crea il hook**

`client/src/hooks/useTour.js`:
```js
import { useState, useEffect, useCallback } from 'react'
import { TOUR_STEPS } from '../data/tourSteps.js'

export function useTour() {
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState(null)

  const readRect = useCallback((index) => {
    const step = TOUR_STEPS[index]
    if (!step) return
    const el = document.querySelector(step.targetSelector)
    if (el) setRect(el.getBoundingClientRect())
  }, [])

  useEffect(() => {
    if (!active) return
    readRect(stepIndex)

    const step = TOUR_STEPS[stepIndex]
    if (!step) return
    const el = document.querySelector(step.targetSelector)
    if (!el) return

    const observer = new ResizeObserver(() => readRect(stepIndex))
    observer.observe(el)
    const onResize = () => readRect(stepIndex)
    window.addEventListener('resize', onResize)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [active, stepIndex, readRect])

  const start = useCallback(() => {
    setStepIndex(0)
    setActive(true)
  }, [])

  const next = useCallback(() => {
    setStepIndex(prev => {
      if (prev >= TOUR_STEPS.length - 1) {
        setActive(false)
        return 0
      }
      return prev + 1
    })
  }, [])

  const prev = useCallback(() => {
    setStepIndex(p => Math.max(0, p - 1))
  }, [])

  const skip = useCallback(() => {
    setActive(false)
    setStepIndex(0)
  }, [])

  return { active, stepIndex, rect, start, next, prev, skip }
}
```

- [ ] **Step 2: Verifica che il progetto compili**

```bash
cd client && npx vitest run
```
Atteso: tutti i test esistenti passano (nessun nuovo test per questo task — il hook è DOM-dipendente, no RTL installato)

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useTour.js
git commit -m "feat: add useTour hook with start/next/prev/skip and ResizeObserver"
```

---

## Task 3: Attributi data-tour sugli elementi target

**Files:**
- Modify: `client/src/components/layout/LeftSidebar.jsx`
- Modify: `client/src/components/canvas/CanvasDropZone.jsx`
- Modify: `client/src/components/layout/WorkspaceShell.jsx`

**Interfaces:**
- Produces: elementi DOM con `data-tour="block-library"`, `data-tour="canvas"`, `data-tour="properties-panel"` — usati da `useTour` tramite `querySelector`

- [ ] **Step 1: LeftSidebar.jsx — aggiungi `data-tour="block-library"`**

Il div root di `LeftSidebar` è alla riga 22. Cambia:
```jsx
// DA:
<div className="flex flex-col h-full">
// A:
<div className="flex flex-col h-full" data-tour="block-library">
```

- [ ] **Step 2: CanvasDropZone.jsx — aggiungi `data-tour="canvas"`**

Il div root del return principale è alla riga 27. Cambia:
```jsx
// DA:
<div className="min-h-full p-6" style={{ backgroundColor: pageColor }}>
// A:
<div className="min-h-full p-6" style={{ backgroundColor: pageColor }} data-tour="canvas">
```

- [ ] **Step 3: WorkspaceShell.jsx — aggiungi `data-tour="properties-panel"` all'aside destro**

```jsx
// DA:
<aside className="overflow-y-auto bg-ink-800 border-l border-ink-700">
  {right}
</aside>
// A:
<aside className="overflow-y-auto bg-ink-800 border-l border-ink-700" data-tour="properties-panel">
  {right}
</aside>
```

- [ ] **Step 4: Verifica che i test passino**

```bash
cd client && npx vitest run
```
Atteso: tutti i test passano

- [ ] **Step 5: Commit**

```bash
git add client/src/components/layout/LeftSidebar.jsx client/src/components/canvas/CanvasDropZone.jsx client/src/components/layout/WorkspaceShell.jsx
git commit -m "feat: add data-tour attributes to block-library, canvas, properties-panel"
```

---

## Task 4: TourOverlay component

**Files:**
- Create: `client/src/components/layout/TourOverlay.jsx`

**Interfaces:**
- Consumes: `TOUR_STEPS` da `../../data/tourSteps.js`
- Consumes props: `{ stepIndex: number, rect: DOMRect|null, onNext: () => void, onPrev: () => void, onSkip: () => void }`
- Produces: componente React che monta l'overlay completo

- [ ] **Step 1: Crea il componente**

`client/src/components/layout/TourOverlay.jsx`:
```jsx
import { TOUR_STEPS } from '../../data/tourSteps.js'

const POPOVER_WIDTH = 320
const POPOVER_OFFSET = 12

function computePopoverStyle(rect, position) {
  if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  switch (position) {
    case 'right':
      return { top: rect.top + rect.height / 2, left: rect.right + POPOVER_OFFSET, transform: 'translateY(-50%)' }
    case 'left':
      return { top: rect.top + rect.height / 2, left: rect.left - POPOVER_WIDTH - POPOVER_OFFSET, transform: 'translateY(-50%)' }
    case 'top':
      return { top: rect.top - POPOVER_OFFSET, left: rect.left + rect.width / 2, transform: 'translate(-50%, -100%)' }
    case 'bottom':
    default:
      return { top: rect.bottom + POPOVER_OFFSET, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' }
  }
}

export default function TourOverlay({ stepIndex, rect, onNext, onPrev, onSkip }) {
  const step = TOUR_STEPS[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === TOUR_STEPS.length - 1
  const popoverStyle = computePopoverStyle(rect, step?.popoverPosition)

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {rect && (
        <div
          style={{
            position: 'fixed',
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: '0 0 0 9999px rgba(13, 13, 31, 0.85)',
            borderRadius: 8,
            pointerEvents: 'none',
          }}
        />
      )}
      <div
        className="pointer-events-auto fixed bg-ink-800 border border-ink-700 rounded-2xl shadow-2xl p-5"
        style={{ width: POPOVER_WIDTH, ...popoverStyle }}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">{step?.title}</h3>
          <span className="text-ink-400 text-xs ml-3 flex-shrink-0">
            {stepIndex + 1} / {TOUR_STEPS.length}
          </span>
        </div>
        <p className="text-ink-300 text-sm leading-relaxed mb-4">{step?.description}</p>
        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-ink-400 hover:text-white text-sm transition-colors"
          >
            Salta
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={isFirst}
              className="text-ink-400 hover:text-white text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Indietro
            </button>
            <button
              onClick={onNext}
              className="bg-flow-400 hover:bg-flow-600 text-ink-950 font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              {isLast ? 'Inizia a costruire' : 'Avanti →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verifica che i test passino**

```bash
cd client && npx vitest run
```
Atteso: tutti i test passano

- [ ] **Step 3: Commit**

```bash
git add client/src/components/layout/TourOverlay.jsx
git commit -m "feat: add TourOverlay component with spotlight and popover"
```

---

## Task 5: Navbar Guide button + data-tour + AppCanvas wiring

**Files:**
- Modify: `client/src/components/layout/Navbar.jsx`
- Modify: `client/src/App.jsx`

**Interfaces:**
- Consumes: `useTour()` da `./hooks/useTour.js`
- Consumes: `<TourOverlay>` da `./components/layout/TourOverlay.jsx`
- Consumes: prop `onGuideClick` da Navbar

- [ ] **Step 1: Modifica Navbar.jsx**

1a. Aggiungi `HelpCircle` all'import da lucide-react (riga 1):
```jsx
import { Eye, LineChart, Save, LayoutDashboard, HelpCircle } from 'lucide-react'
```

1b. Aggiungi `onGuideClick` ai props della funzione Navbar:
```jsx
export default function Navbar({ projectName, saving, onSave, onGoToDashboard, onEditProject, onDeployClick, onAnalyticsClick, onGuideClick }) {
```

1c. Aggiungi `data-tour="preview-btn"` al pulsante Preview (era senza data-tour):
```jsx
<button
  onClick={openPreview}
  data-tour="preview-btn"
  className="flex items-center gap-2 text-ink-400 hover:text-white border border-ink-700 hover:border-ink-800 text-sm px-3 py-1.5 rounded-lg transition-colors"
>
  <Eye size={14} />
  {t('navbar.preview')}
</button>
```

1d. Aggiungi `data-tour="deploy-btn"` al pulsante Pubblica:
```jsx
<button
  onClick={onDeployClick}
  data-tour="deploy-btn"
  className="flex items-center gap-2 bg-flow-400 hover:bg-flow-600 text-ink-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
>
  {t('navbar.deploy')}
</button>
```

1e. Aggiungi il pulsante Guida **prima** del pulsante Analytics (inseriscilo nella `div` dei pulsanti):
```jsx
{onGuideClick && (
  <button
    onClick={onGuideClick}
    className="flex items-center gap-2 text-ink-400 hover:text-white border border-ink-700 hover:border-ink-600 text-sm px-3 py-1.5 rounded-lg transition-colors"
  >
    <HelpCircle size={14} />
    Guida
  </button>
)}
```

- [ ] **Step 2: Modifica App.jsx — instanzia useTour in AppCanvas**

2a. Aggiungi gli import nella sezione import di `App.jsx` (dopo gli import esistenti):
```jsx
import { useTour } from './hooks/useTour.js'
import TourOverlay from './components/layout/TourOverlay.jsx'
```

2b. In `AppCanvas`, aggiungi `useTour` subito dopo gli `useState` esistenti (dopo riga `const [saving, setSaving] = useState(false)`):
```jsx
const { active: tourActive, stepIndex, rect, start: startTour, next: tourNext, prev: tourPrev, skip: tourSkip } = useTour()
```

2c. Passa `onGuideClick={startTour}` a `<Navbar>`:
```jsx
<Navbar
  projectName={projectName}
  saving={saving}
  onSave={handleSave}
  onGoToDashboard={onGoToDashboard}
  onEditProject={() => setEditOpen(true)}
  onDeployClick={() => setDeployOpen(true)}
  onAnalyticsClick={() => setAnalyticsOpen(true)}
  onGuideClick={startTour}
/>
```

2d. Monta `TourOverlay` in fondo al JSX di `AppCanvas`, prima della chiusura di `<DndContext>`:
```jsx
{tourActive && (
  <TourOverlay
    stepIndex={stepIndex}
    rect={rect}
    onNext={tourNext}
    onPrev={tourPrev}
    onSkip={tourSkip}
  />
)}
```

- [ ] **Step 3: Esegui i test**

```bash
cd client && npx vitest run
```
Atteso: tutti i test passano

- [ ] **Step 4: Verifica manuale**

Avvia il dev server: `cd client && npm run dev`

Apri `http://localhost:5173`, apri un progetto, poi verifica:
1. Pulsante "Guida" visibile nella navbar (icona HelpCircle)
2. Click "Guida" → overlay scuro appare con spotlight sulla libreria blocchi (step 1/5)
3. Titolo "La libreria dei blocchi" e descrizione visibili nel popover
4. Click "Avanti →" → spotlight si sposta sul canvas (step 2/5)
5. Click "Avanti →" → spotlight sul pannello proprietà destra (step 3/5)
6. Click "Avanti →" → spotlight sul pulsante Preview in navbar (step 4/5)
7. Click "Avanti →" → spotlight sul pulsante Pubblica (step 5/5)
8. Click "Inizia a costruire" → overlay si chiude
9. Click "Guida" di nuovo → tour riparte da step 1
10. Click "Salta" in qualsiasi step → overlay si chiude immediatamente
11. Click "← Indietro" al step 1 → pulsante disabilitato (opaco, non cliccabile)

- [ ] **Step 5: Commit**

```bash
git add client/src/components/layout/Navbar.jsx client/src/App.jsx
git commit -m "feat: wire TourOverlay into AppCanvas with Guida button in Navbar"
```
