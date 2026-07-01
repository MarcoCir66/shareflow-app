# Splash Screen + SharePoint Setup Modal

**Date:** 2026-07-01  
**Status:** Approved

## Overview

All'avvio dell'app viene mostrata una splash screen animata (3.4s) a tema logo, che si risolve sempre in una modale di configurazione SharePoint. La modale è pre-compilata con l'URL salvato in precedenza; l'utente può confermare o modificare.

---

## Componenti

### `SplashScreen.jsx`
`client/src/components/layout/SplashScreen.jsx`

Overlay fullscreen `position: fixed, z-index: 60`. Gestisce internamente le fasi dell'animazione tramite stato `phase`:

- `entering` → `pulsing` → `exiting`

Transizioni pilotate da `setTimeout` (calcolati sui timing CSS) + `onTransitionEnd` per lo smontaggio.

Struttura DOM:
```
<div.splash-overlay>          // sfondo ink-950, radial gradient teal al centro
  <div.splash-ring />         // ring pulse, posizione assoluta centrata
  <div.splash-logo>           // SVG logo inline, 80px
  <div.splash-wordmark>       // testo "Shareflow", flow-400
</div>
```

Emette `onDone()` al termine della fase `exiting`, che il parent usa per mostrare `SpSetupModal`.

### `SpSetupModal.jsx`
`client/src/components/layout/SpSetupModal.jsx`

Modale centrata, stile coerente con `DeployModal` (`bg-ink-800 rounded-2xl border-ink-700`).

Props:
- `onConfirm(url: string)` — chiamata con l'URL validato
- `onSkip()` — chiamata senza salvare

Stato interno:
- `value` — inizializzato da `localStorage.getItem('sf_sp_url') ?? ''`

Validazione al submit: `url.startsWith('https://') && url.includes('.sharepoint.com')`. Se non valido, mostra messaggio di errore inline.

Al `onConfirm`: salva `localStorage.setItem('sf_sp_url', url)`.

### Integrazione in `App.jsx`

```jsx
function AppRoot() {
  const [splashDone, setSplashDone] = useState(false)
  const [modalDone, setModalDone]   = useState(false)

  if (!splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />
  if (!modalDone)  return <SpSetupModal onConfirm={...} onSkip={...} />
  return <ProjectDashboard ... />
}
```

La splash monta **sempre** ad ogni avvio. La modale mostra **sempre** l'ultimo valore salvato.

---

## Animazione — Timing

| Fase | Start | End | Tecnica |
|------|-------|-----|---------|
| Logo enter | 0ms | 400ms | `transform: scale(0.6→1) + opacity 0→1`, `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| Ring pulse | 400ms | 2400ms | `@keyframes pulse-ring`: scale 1→2.5, opacity 0.6→0, 2 cicli da 1000ms |
| Wordmark fade | 600ms | 1000ms | `opacity 0→1 + translateY 8px→0` |
| Hold | 2400ms | 2800ms | statico |
| Clip-path exit | 2800ms | 3400ms | `clip-path: inset(100% 0 0 0 → 0% 0 0 0)`, `ease-in-out 600ms` |

**Totale: 3400ms.**

CSS keyframe `pulse-ring`:
```css
@keyframes pulse-ring {
  0%   { transform: scale(1);   opacity: 0.6; }
  100% { transform: scale(2.5); opacity: 0; }
}
```

Sfondo splash: `radial-gradient(ellipse at center, color-mix(in srgb, #34BFAE 20%, transparent), #0d0d1f)`.

---

## Modale credenziali — UI

```
┌─────────────────────────────────────────┐
│  Configura SharePoint                 X │  ← solo dopo skip
│─────────────────────────────────────────│
│  Connetti Shareflow al tuo tenant       │
│  Microsoft 365 per abilitare la         │
│  pubblicazione su SharePoint.           │
│                                         │
│  SharePoint URL                         │
│  ┌─────────────────────────────────┐    │
│  │ https://contoso.sharepoint.com  │    │
│  └─────────────────────────────────┘    │
│  ⚠ Inserisci un URL .sharepoint.com     │  ← solo se errore
│                                         │
│  [    Attiva    ]  [ Salta per ora ]    │
└─────────────────────────────────────────┘
```

- Pulsante "X" non presente durante la splash (modale non chiudibile da tastiera/click fuori)
- "Salta per ora" chiude senza salvare; l'URL rimane quello precedente in localStorage

---

## Persistenza

Chiave localStorage: `sf_sp_url`  
Tipo: stringa URL (`https://contoso.sharepoint.com`)  
Nessuna scadenza — persiste tra sessioni.

Il valore è disponibile al resto dell'app tramite `localStorage.getItem('sf_sp_url')` ovunque serva (es. future integrazioni nel provisioning flow).

---

## Fuori scope

- Validazione lato server dell'URL (rimandato a provisioning)
- Autenticazione Microsoft OAuth (già gestita da MSAL separatamente)
- Test e2e della splash (animazione non testabile con Playwright headless)
