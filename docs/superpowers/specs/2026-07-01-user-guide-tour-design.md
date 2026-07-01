# User Guide Tour — Design Spec

**Date:** 2026-07-01  
**Status:** Approved

## Overview

Tour guidato interattivo per il configuratore dell'intranet. Avviabile manualmente dal pulsante "Guida" nella Navbar. 5 step che accompagnano l'utente attraverso i concetti fondamentali di Shareflow: libreria blocchi, canvas, proprietà, anteprima, pubblicazione.

---

## Architettura

### File

| File | Azione | Responsabilità |
|------|--------|----------------|
| `client/src/data/tourSteps.js` | Crea | Array statico dei 5 step (target selector, titolo, descrizione, posizione popover) |
| `client/src/hooks/useTour.js` | Crea | Hook: stato del tour (active, stepIndex, rect), metodi start/next/prev/skip, ResizeObserver |
| `client/src/components/layout/TourOverlay.jsx` | Crea | Overlay + spotlight + popover, riceve step corrente e handlers |
| `client/src/components/layout/Navbar.jsx` | Modifica | Aggiunge pulsante "Guida" (HelpCircle) e prop `onGuideClick` |
| `client/src/App.jsx` | Modifica | Instanzia `useTour` in `AppCanvas`, passa `onGuideClick` a Navbar, monta `TourOverlay` |

---

## Step del Tour

| # | `targetSelector` | Titolo | Descrizione |
|---|-----------------|--------|-------------|
| 1 | `[data-tour="block-library"]` | La libreria dei blocchi | I blocchi sono i mattoni della tua intranet. Ogni blocco rappresenta un widget — news, eventi, documenti, meteo e molto altro. Sono organizzati in 4 categorie: Comunicazione, Learning, Produttività, Knowledge Base. |
| 2 | `[data-tour="canvas"]` | Il canvas | Trascina un blocco dalla libreria e rilascialo qui per aggiungerlo alla pagina. Puoi riordinare i blocchi trascinandoli, e organizzarli in colonne affiancate. |
| 3 | `[data-tour="properties-panel"]` | Configura ogni blocco | Seleziona un blocco sul canvas per accedere alle sue proprietà: scope di visibilità, commenti, like, lettura obbligatoria. Ogni blocco ha le sue opzioni specifiche. |
| 4 | `[data-tour="preview-btn"]` | Anteprima in tempo reale | Clicca qui per vedere l'intranet così come la vedranno i tuoi colleghi su SharePoint. L'anteprima si aggiorna ad ogni modifica. |
| 5 | `[data-tour="deploy-btn"]` | Pubblica su SharePoint | Quando la tua intranet è pronta, clicca qui per pubblicarla direttamente nel tuo tenant Microsoft 365. Il processo è automatico e richiede pochi minuti. |

Gli attributi `data-tour` vengono aggiunti agli elementi target esistenti (LeftSidebar, CanvasDropZone, PropertiesPanel, pulsanti Navbar).

---

## `tourSteps.js`

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

---

## `useTour.js`

Stato:
- `active: boolean` — overlay visibile
- `stepIndex: number` — step corrente (0-based)
- `rect: DOMRect | null` — bounding rect dell'elemento target corrente

Metodi:
- `start()` → `active = true`, `stepIndex = 0`, calcola rect
- `next()` → `stepIndex + 1`; se ultimo step → `skip()`
- `prev()` → `stepIndex - 1`
- `skip()` → `active = false`

Il rect viene ricalcolato ad ogni cambio di `stepIndex` via `useEffect` + `querySelector`. Un `ResizeObserver` sull'elemento target aggiorna il rect se la finestra viene ridimensionata. Cleanup del ResizeObserver all'unmount.

---

## `TourOverlay.jsx`

**Struttura DOM:**
```
<div.tour-backdrop fixed inset-0 z-60 pointer-events-none>
  <div.tour-spotlight />        // posizionato su rect, box-shadow per oscurare
  <div.tour-popover />          // posizionato rispetto a rect + popoverPosition
</div>
```

**Spotlight:**
- `position: fixed`, `top/left/width/height` = rect
- `box-shadow: 0 0 0 9999px rgba(13, 13, 31, 0.85)`
- `border-radius: 8px`
- `pointer-events: none`

Il backdrop ha `pointer-events: none` tranne il popover (che ha `pointer-events: auto`).

**Popover layout:**
```
┌─────────────────────────────────────┐
│  [Titolo step]               [1/5]  │
│─────────────────────────────────────│
│  Testo descrizione dello step...    │
│                                     │
│  [Salta]         [← Indietro] [Avanti →] │
└─────────────────────────────────────┘
```

- Larghezza: 320px
- Stile: `bg-ink-800 border border-ink-700 rounded-2xl shadow-2xl p-5`
- Titolo: `text-white font-semibold`
- Counter: `text-ink-400 text-xs`
- Descrizione: `text-ink-300 text-sm`
- "Salta": `text-ink-400 hover:text-white text-sm`
- "Indietro": disabilitato al primo step
- "Avanti": label "Inizia a costruire" all'ultimo step → chiama `skip()`

**Posizionamento popover:**
- `right`: popover a destra del spotlight, allineato verticalmente al centro
- `left`: popover a sinistra del spotlight
- `top`: popover sopra il spotlight
- `bottom`: popover sotto il spotlight
- Offset: 12px di gap tra spotlight e popover
- Nessun fallback automatico (i 5 target sono posizioni note e stabili)

---

## Integrazione

**Navbar:**
- Nuova prop `onGuideClick`
- Pulsante `HelpCircle` con label "Guida", stile identico agli altri pulsanti secondari (`text-ink-400 hover:text-white border border-ink-700`)
- Posizionato prima del pulsante Analytics

**AppCanvas:**
- `const { active, stepIndex, rect, start, next, prev, skip } = useTour()`
- `onGuideClick={start}` passato a Navbar
- `{active && <TourOverlay ... />}` montato in fondo al JSX di AppCanvas

**Attributi `data-tour` da aggiungere:**
- `[data-tour="block-library"]` → div wrapper in `LeftSidebar.jsx` (il contenitore `flex flex-col h-full`)
- `[data-tour="canvas"]` → div principale in `CanvasDropZone.jsx`
- `[data-tour="properties-panel"]` → div principale in `PropertiesPanel.jsx` (o `WorkspaceShell` right slot)
- `[data-tour="preview-btn"]` → pulsante Preview in `Navbar.jsx`
- `[data-tour="deploy-btn"]` → pulsante Pubblica in `Navbar.jsx`

---

## Fuori scope

- Persistenza "tour già visto" (localStorage) — rimandato
- Avvio automatico al primo accesso — rimandato
- Arricchimento con step aggiuntivi (pagine, template, analytics) — fase successiva
- Animazioni di transizione tra step
