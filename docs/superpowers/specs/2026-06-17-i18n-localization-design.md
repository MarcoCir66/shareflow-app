# i18n Localization — Design Spec

## Goal

Localize all ShareFlow interfaces (editor + preview tab) into IT/EN/FR/DE based on the user's browser language, with a manual language override pill in the Navbar. Two categories of content are localized: static UI strings (Type 1) and structural user-configurable text fields (Type 2: site name, page titles).

## Architecture

**Approach: single i18next instance + state shape extension.**

`i18next.language` is the single source of truth for the active language. Changing it via `i18n.changeLanguage(lang)` triggers both Type 1 re-renders (via `useTranslation()`) and Type 2 re-renders (via `useLang()`). The preview tab, being a separate window on the same origin, shares the same `localStorage`, so `i18next-browser-languagedetector` reads the same `i18nextLng` key without extra synchronization code.

**Tech stack:** i18next ^26, react-i18next ^17, i18next-browser-languagedetector ^8 (already installed).

**Languages:** `it` (default/fallback), `en`, `fr`, `de`.

**Detection order:** `localStorage` → `navigator.language`. Manual selection persists to `localStorage['i18nextLng']`.

---

## Section 1 — i18n Configuration

### `client/src/i18n.js` (new file)

```js
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import it from './locales/it.json'
import en from './locales/en.json'
import fr from './locales/fr.json'
import de from './locales/de.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      it: { translation: it },
      en: { translation: en },
      fr: { translation: fr },
      de: { translation: de },
    },
    supportedLngs: ['it', 'en', 'fr', 'de'],
    fallbackLng: 'it',
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
    interpolation: { escapeValue: false },
  })

export default i18n
```

Imported as a side-effect at the top of `client/src/main.jsx`, before `<App />` renders.

---

## Section 2 — Language Switcher (Type 1 entry point)

### `client/src/components/layout/LanguageSwitcher.jsx` (new file)

Pill with four buttons (IT / EN / FR / DE). Placed in `Navbar.jsx` between the Preview button and the Deploy button.

```jsx
import { useTranslation } from 'react-i18next'
const LANGS = ['it', 'en', 'fr', 'de']

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language?.slice(0, 2) ?? 'it'
  return (
    <div className="flex gap-0.5 bg-navy-light rounded-md p-0.5">
      {LANGS.map(lang => (
        <button
          key={lang}
          onClick={() => i18n.changeLanguage(lang)}
          className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
            current === lang ? 'bg-blue text-white' : 'text-slate-light hover:text-white'
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  )
}
```

---

## Section 3 — Type 1: UI Chrome Strings

All components import `useTranslation` and replace hardcoded strings with `t('key')`.

### Translation key structure — `client/src/locales/it.json` (source locale)

```json
{
  "navbar": {
    "tagline": "The No-Code SharePoint Intranet Factory",
    "tenant": "Tenant: Contoso Corp",
    "preview": "Preview",
    "deploy": "Deploy to SharePoint"
  },
  "pages": {
    "title": "Pagine",
    "add": "Aggiungi pagina",
    "addSub": "Aggiungi sottopagina",
    "deleteDisabled": "Elimina prima le sottopagine",
    "delete": "Elimina pagina",
    "newPageTitle": "Nuova pagina"
  },
  "canvas": {
    "addSection": "Aggiungi sezione",
    "dropHere": "Trascina qui un blocco",
    "deleteSection": "Elimina sezione",
    "layout": "Layout"
  },
  "props": {
    "noSelection": "Nessun blocco selezionato",
    "properties": "Proprietà",
    "content": "Contenuto",
    "instanceId": "Instance ID"
  },
  "deploy": {
    "title": "Deploy to SharePoint",
    "deploying": "Deploy in corso...",
    "complete": "Deploy completato!",
    "done": "Chiudi"
  },
  "preview": {
    "close": "Chiudi preview",
    "desktop": "Desktop",
    "tablet": "Tablet",
    "mobile": "Mobile",
    "noEditor": "Apri ShareFlow nell'editor per vedere la preview.",
    "pageNotFound": "Pagina non trovata nella preview."
  },
  "appearance": {
    "title": "Aspetto",
    "templates": "Template",
    "brandColor": "Colore brand",
    "reset": "Reset",
    "siteName": "Nome sito"
  },
  "content": {
    "add": "+ Aggiungi",
    "save": "Salva",
    "cancel": "Annulla",
    "production": "PRODUZIONE"
  },
  "source": {
    "sharepoint": "SharePoint List",
    "rss": "Feed RSS",
    "api": "HTTP API",
    "manual": "Manuale",
    "urlPlaceholder": "https://..."
  },
  "blocks": {
    "search": "Cerca blocchi…",
    "categories": {
      "COMMUNICATION": "Comunicazione",
      "LEARNING": "Formazione",
      "PRODUCTIVITY": "Produttività",
      "KNOWLEDGE_BASE": "Knowledge Base"
    },
    "labels": {
      "news-corporate": "News - Corporate",
      "news-country": "News - Country",
      "news-sede": "News - Sede",
      "news-funzione": "News - Funzione",
      "commenti-contenuto": "Commenti sul contenuto",
      "like-contenuto": "Like sul contenuto",
      "avvisi-homepage": "Avvisi in home page",
      "eventi-corporate": "Eventi - Corporate",
      "eventi-country": "Eventi - Country",
      "eventi-sede": "Eventi - Sede",
      "eventi-funzione": "Eventi - Funzione",
      "sezione-fiere": "Sezione Fiere",
      "sezione-mostre": "Sezione Mostre",
      "multimedia-gallery": "Multimedia Gallery",
      "countdown-lancio": "Count down di lancio",
      "rassegna-stampa": "Rassegna stampa",
      "bacheca-sindacale": "Bacheca Sindacale",
      "bacheca-scambio": "Bacheca Cerco/scambio",
      "new-entry": "New entry",
      "oggi-presentiamo": "Oggi presentiamo…",
      "polls-survey": "Polls & Survey",
      "sezione-welfare": "Sezione Welfare",
      "procedure": "Procedure",
      "sezione-progetti": "Sezione Progetti",
      "meteo": "Meteo",
      "fusi-orari": "Fusi orari",
      "multilingua": "Multilingua",
      "motore-ricerca": "Motore di ricerca",
      "faq": "FAQ",
      "come-fare-per": "Come fare per",
      "organigramma": "Organigramma",
      "rubrica-colleghi": "Rubrica (Cerca colleghi)",
      "chi-siamo": "Sezione Chi siamo",
      "desc-country": "Sezione descrittiva Country",
      "desc-sede": "Sezione descrittiva Sede",
      "desc-funzione": "Sezione descrittiva Funzione"
    }
  }
}
```

The English (`en.json`), French (`fr.json`), and German (`de.json`) files mirror the same key structure with translated values.

### Block catalog label lookup

`blockCatalog.js` block `label` fields are replaced by a translation key lookup. The three components that display block labels — `BlockCard.jsx` (library sidebar), `CanvasBlock.jsx` (editor canvas header), and `CanvasBlockPreview.jsx` (read-only preview) — all call `t(`blocks.labels.${block.id}`, { defaultValue: block.label })` instead of reading `block.label` directly. The `label` field is kept in the catalog as the `defaultValue` fallback so that any block without a translation key still shows a human-readable string.

### Components updated for Type 1

| Component | Keys used |
|---|---|
| `Navbar.jsx` | `navbar.*` |
| `PagesPanel.jsx` | `pages.title`, `pages.add` |
| `PageTreeItem.jsx` | `pages.addSub`, `pages.delete`, `pages.deleteDisabled` |
| `BlockLibrary.jsx` | `blocks.search` |
| `BlockCard.jsx` | `blocks.labels.*` (block label in the library sidebar) |
| `CategoryGroup.jsx` | `blocks.categories.*` |
| `CanvasBlock.jsx` | `blocks.labels.*` (block label in editor canvas header) |
| `CanvasBlockPreview.jsx` | `blocks.labels.*` (block label in read-only preview) |
| `CanvasSection.jsx` | `canvas.addSection`, `canvas.deleteSection`, `canvas.layout` |
| `CanvasDropZone.jsx` | `canvas.dropHere` |
| `PropertiesPanel.jsx` | `props.*` |
| `SourceSelector.jsx` | `source.*` |
| `ContentPanel.jsx` | `content.*` |
| `DeployModal.jsx` | `deploy.*` |
| `PreviewToolbar.jsx` | `preview.*` |
| `AppearancePanel.jsx` | `appearance.*` |
| `PreviewApp.jsx` | `preview.noEditor`, `preview.pageNotFound` |

---

## Section 4 — Type 2: Structural Multi-Language Fields

### State shape changes

Only two fields change shape:

| Field | Before | After |
|---|---|---|
| `tenantConfiguration.siteName` | `"My Corporate Intranet"` | `{ it: "My Corporate Intranet", en: "My Corporate Intranet", fr: "My Corporate Intranet", de: "My Corporate Intranet" }` |
| `pages[].title` | `"Home"` | `{ it: "Home", en: "Home", fr: "Home", de: "Home" }` |

All other state fields (widget props, theme, content items, section layouts) remain unchanged.

### `client/src/hooks/useLang.js` (new file)

```js
import { useTranslation } from 'react-i18next'

export function useLang() {
  const { i18n } = useTranslation()
  return i18n.language?.slice(0, 2) ?? 'it'
}
```

### `client/src/utils/localizedText.js` (new file)

```js
export function t2(field, lang) {
  if (typeof field === 'string') return field  // backward compat
  if (!field) return ''
  return field[lang] ?? field['it'] ?? Object.values(field)[0] ?? ''
}
```

The string fallback handles any state that was persisted (e.g. in localStorage) before the migration.

### Reducer changes (`configuratorReducer.js`)

**`initialState`** — siteName and Home title become multi-lang objects:
```js
tenantConfiguration: {
  siteName: { it: 'My Corporate Intranet', en: 'My Corporate Intranet', fr: 'My Corporate Intranet', de: 'My Corporate Intranet' },
  ...
}
pages: [{ title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' }, ... }]
```

**`ADD_PAGE` case** — new page title initialized with all four variants:
```js
title: { it: 'Nuova pagina', en: 'New page', fr: 'Nouvelle page', de: 'Neue Seite' }
```

**`RENAME_PAGE` case** — payload adds `lang` field; only the active language variant is updated:
```js
case ACTIONS.RENAME_PAGE: {
  const { pageId, lang, title } = action.payload
  return {
    ...state,
    pages: state.pages.map(p =>
      p.pageId !== pageId ? p : {
        ...p,
        title: typeof p.title === 'string'
          ? { it: p.title, en: p.title, fr: p.title, de: p.title, [lang]: title }
          : { ...p.title, [lang]: title },
      }
    ),
  }
}
```

**`SET_TENANT_META` case** — no change needed; AppearancePanel dispatches the full updated siteName object.

### Display components

`HeroBanner`, `CanvasTopNav`, `MegaMenuPanel` call `useLang()` and `t2(field, lang)` to read the active variant:

```jsx
// HeroBanner.jsx
const lang = useLang()
<div>{t2(state.tenantConfiguration.siteName, lang)}</div>
<div>{t2(activePage.title, lang)}</div>

// CanvasTopNav.jsx
const lang = useLang()
{tree.map(page => <button>{t2(page.title, lang)}</button>)}
```

### Editing — page titles (`PageTreeItem.jsx`)

The inline rename (double-click) is updated to:
1. Initialize `titleDraft` from `t2(page.title, lang)` (current language variant)
2. Display `t2(page.title, lang)` in read mode
3. Dispatch `RENAME_PAGE` with `{ pageId, lang, title: trimmed }`

```jsx
const lang = useLang()
const [titleDraft, setTitleDraft] = useState(t2(page.title, lang))

// Reset draft when page or lang changes
useEffect(() => setTitleDraft(t2(page.title, lang)), [page.title, lang])

function commitRename() {
  setEditing(false)
  const trimmed = titleDraft.trim()
  const current = t2(page.title, lang)
  if (trimmed && trimmed !== current) {
    dispatch({ type: ACTIONS.RENAME_PAGE, payload: { pageId: page.pageId, lang, title: trimmed } })
  } else {
    setTitleDraft(current)
  }
}
```

### Editing — site name (`AppearancePanel.jsx`)

A new "Nome sito" section is added above the Template gallery. The input field shows and edits the active language's variant:

```jsx
const lang = useLang()
const siteName = t2(state.tenantConfiguration.siteName, lang)

function handleSiteNameChange(value) {
  const current = state.tenantConfiguration.siteName
  const updated = typeof current === 'string'
    ? { it: current, en: current, fr: current, de: current, [lang]: value }
    : { ...current, [lang]: value }
  dispatch({ type: ACTIONS.SET_TENANT_META, payload: { siteName: updated } })
}
```

The label shows the active language in parentheses: `Nome sito (IT)`, `Nome sito (EN)`, etc., so the admin knows which variant they are editing.

---

## Section 5 — Files Created / Modified

### New files

| File | Responsibility |
|---|---|
| `client/src/i18n.js` | i18next init: detector, resources, supportedLngs, fallback |
| `client/src/locales/it.json` | Italian translations (source — all keys defined here) |
| `client/src/locales/en.json` | English translations |
| `client/src/locales/fr.json` | French translations |
| `client/src/locales/de.json` | German translations |
| `client/src/hooks/useLang.js` | Thin hook: `i18n.language.slice(0,2)` |
| `client/src/utils/localizedText.js` | `t2(field, lang)` with string fallback |
| `client/src/components/layout/LanguageSwitcher.jsx` | IT/EN/FR/DE pill, calls `i18n.changeLanguage` |

### Modified files

| File | Change |
|---|---|
| `client/src/main.jsx` | `import './i18n.js'` (side-effect, before App) |
| `client/src/components/layout/Navbar.jsx` | Add LanguageSwitcher; `t()` for tagline, preview, deploy labels |
| `client/src/context/configuratorReducer.js` | Multi-lang initialState; RENAME_PAGE + ADD_PAGE updated |
| `client/src/components/canvas/HeroBanner.jsx` | `useLang()` + `t2()` for siteName and page title |
| `client/src/components/canvas/CanvasTopNav.jsx` | `useLang()` + `t2()` for page titles |
| `client/src/components/canvas/MegaMenuPanel.jsx` | `t2()` for page titles |
| `client/src/components/sidebar-left/PageTreeItem.jsx` | `useLang()` + `t2()` display; RENAME_PAGE passes lang |
| `client/src/components/sidebar-left/PagesPanel.jsx` | `t()` for header labels and button text |
| `client/src/components/sidebar-left/AppearancePanel.jsx` | Add site name field with `useLang()` |
| `client/src/components/sidebar-left/BlockLibrary.jsx` | `t()` for search placeholder |
| `client/src/components/sidebar-left/BlockCard.jsx` | `t()` for block label via `blocks.labels.*` |
| `client/src/components/sidebar-left/CategoryGroup.jsx` | `t()` for category label via `blocks.categories.*` |
| `client/src/components/canvas/CanvasBlock.jsx` | `t()` for block label in canvas header |
| `client/src/components/canvas/CanvasBlockPreview.jsx` | `t()` for block label in preview mode |
| `client/src/components/sidebar-right/PropertiesPanel.jsx` | `t()` for tab labels and empty state |
| `client/src/components/sidebar-right/SourceSelector.jsx` | `t()` for source type labels and URL placeholder |
| `client/src/components/sidebar-right/ContentPanel.jsx` | `t()` for add/save/cancel/production badge |
| `client/src/components/canvas/CanvasSection.jsx` | `t()` for add/delete section labels |
| `client/src/components/canvas/CanvasDropZone.jsx` | `t()` for drop zone text |
| `client/src/components/deploy/DeployModal.jsx` | `t()` for all modal strings |
| `client/src/components/preview/PreviewToolbar.jsx` | `t()` for device labels and close button |
| `client/src/components/preview/PreviewApp.jsx` | `t()` for null state messages |
| `client/tests/smoke.spec.js` | Add `localStorage.setItem('i18nextLng', 'it')` in `beforeEach` so tests run in Italian and existing string selectors stay valid |

---

## Section 6 — Testing

### E2e test strategy

Existing Playwright tests use Italian string selectors (e.g. `getByRole('button', { name: 'Aggiungi sezione' })`). To keep them valid after i18n is added, `beforeEach` sets the language to Italian via localStorage before page load:

```js
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'it'))
  await page.goto('/')
})
```

`addInitScript` runs before the page's own scripts, so `i18next-browser-languagedetector` reads `'it'` from localStorage on init. No existing test selectors need to change.

### New e2e tests (added to `smoke.spec.js`)

1. **Language switcher is visible in navbar** — `getByRole('button', { name: 'EN' })` is visible.
2. **Switching to EN changes UI strings** — click EN, assert `getByRole('button', { name: 'Add section' })` is visible (or equivalent key).
3. **Switching language updates hero site name** — set site name for IT, switch to EN, type a different name, switch back to IT, assert original name is restored.
4. **Page rename updates only the active language** — rename "Home" to "Home EN" while in EN, switch to IT, assert title still shows "Home".

---

## Out of Scope

- Translation of user-entered content items (news article titles, event names)
- Machine translation or auto-translation of Type 2 fields (admin enters each variant manually)
- Right-to-left (RTL) language support
- Pluralization rules (no count-sensitive strings in this UI)
- Language-specific date/number formatting
