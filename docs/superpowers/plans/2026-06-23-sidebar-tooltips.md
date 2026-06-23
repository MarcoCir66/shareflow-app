# Sidebar Explanatory Tooltips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every functional entry in ShareFlow's left sidebar — tabs, the groups they contain, and the individual items inside those groups — gets a short, hover/focus-triggered tooltip explaining its purpose, with zero change to existing click/drag behavior or layout.

**Architecture:** A new reusable `Tooltip` component (`client/src/components/common/Tooltip.jsx`) wraps existing elements non-intrusively via a `display: contents` span, renders its bubble through a `createPortal` into `document.body` (so it's never clipped by scrollable containers), and reads its text from a new `tooltips` i18n namespace. It is wired into 3 existing files (`LeftSidebar.jsx`, `CategoryGroup.jsx`, `AppearancePanel.jsx`) at 5 distinct attachment points covering 62 sidebar items, with zero changes to any file's existing behavior.

**Tech Stack:** React 19, Vite, Tailwind CSS, react-i18next, Vitest (unit), Playwright (e2e). No new dependencies.

## Global Constraints

- No new npm dependencies — `createPortal` comes from the already-installed `react-dom`.
- Tooltips apply ONLY to: the 4 sidebar tabs, the 4 block categories, the 46 individual blocks, the 4 Aspetto sub-sections, and the 4 theme-template gallery cards. Do NOT add tooltips to `TemplateGallery.jsx` (page/site templates already show an inline description), `PageTreeItem.jsx`, or `MegaMenuPanel.jsx` — explicitly out of scope.
- `Tooltip` must never intercept clicks or interfere with drag-and-drop — it only adds `onMouseEnter`/`onMouseLeave`/`onFocus`/`onBlur` listeners on its own wrapper, never clones or wraps the child's own props/ref/listeners.
- Tooltips always anchor to the right of their trigger, vertically centered — no edge-flip logic (accepted simplification, the sidebar is permanently left-docked).
- No Vitest test for `Tooltip.jsx` itself (no jsdom in this repo — same established convention as `useBackgroundImageAnalysis.js`, see the project's `imagePalette.js` precedent). Only its pure position-math helper gets a Vitest test. Behavioral coverage for the component is via Playwright e2e tests.
- `blockCatalog.js` and `themeTemplates.js` are read-only for this feature — only their existing ids are used as i18n lookup keys, no structural changes.
- New i18n keys go in all 4 locale files (`it.json`, `en.json`, `fr.json`, `de.json`) under a new top-level `tooltips` namespace.

---

### Task 1: `Tooltip` component

**Files:**
- Create: `client/src/components/common/tooltipPosition.js`
- Test: `client/src/components/common/tooltipPosition.test.js`
- Create: `client/src/components/common/Tooltip.jsx`

**Interfaces:**
- Produces (consumed by Tasks 3, 4, 5): `Tooltip({ text, children })` — a default export. Wraps `children` in a non-intrusive `<span className="contents">`, shows a `role="tooltip"` bubble with the given `text` after a 400ms hover/focus delay, hides on mouse-leave/blur.
- Produces (consumed only within this task, by `Tooltip.jsx`): `computeTooltipPosition(rect, offset = 8)` → `{ top: number, left: number }`.

- [ ] **Step 1: Write the failing test for the pure position helper**

Create `client/src/components/common/tooltipPosition.test.js`:

```js
import { describe, test, expect } from 'vitest'
import { computeTooltipPosition } from './tooltipPosition.js'

describe('computeTooltipPosition', () => {
  test('anchors to the right of the rect, vertically centered, with the default 8px offset', () => {
    const rect = { top: 100, height: 40, right: 250 }
    expect(computeTooltipPosition(rect)).toEqual({ top: 120, left: 258 })
  })

  test('respects a custom offset', () => {
    const rect = { top: 0, height: 20, right: 50 }
    expect(computeTooltipPosition(rect, 16)).toEqual({ top: 10, left: 66 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tooltipPosition` (from `client/`)
Expected: FAIL with a module-resolution error — `tooltipPosition.js` doesn't exist yet.

- [ ] **Step 3: Write the position helper**

Create `client/src/components/common/tooltipPosition.js`:

```js
/** Computes a fixed-position anchor to the right of an element, vertically centered. */
export function computeTooltipPosition(rect, offset = 8) {
  return {
    top: rect.top + rect.height / 2,
    left: rect.right + offset,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tooltipPosition` (from `client/`)
Expected: PASS (2/2 tests)

- [ ] **Step 5: Write the `Tooltip` component**

Create `client/src/components/common/Tooltip.jsx`:

```jsx
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { computeTooltipPosition } from './tooltipPosition.js'

const SHOW_DELAY_MS = 400

/** Wraps any element with a hover/focus-triggered explanatory tooltip, rendered via a portal so it's never clipped by a scrollable ancestor. */
export default function Tooltip({ text, children }) {
  const [coords, setCoords] = useState(null)
  const wrapperRef = useRef(null)
  const timeoutRef = useRef(null)

  function show() {
    timeoutRef.current = setTimeout(() => {
      const rect = wrapperRef.current.getBoundingClientRect()
      setCoords(computeTooltipPosition(rect))
    }, SHOW_DELAY_MS)
  }

  function hide() {
    clearTimeout(timeoutRef.current)
    setCoords(null)
  }

  return (
    <span ref={wrapperRef} className="contents" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {coords && createPortal(
        <div
          role="tooltip"
          style={{ position: 'fixed', top: coords.top, left: coords.left, transform: 'translateY(-50%)' }}
          className="z-50 max-w-[220px] rounded-md bg-navy text-white text-xs px-2.5 py-1.5 shadow-lg pointer-events-none"
        >
          {text}
        </div>,
        document.body
      )}
    </span>
  )
}
```

`className="contents"` (CSS `display: contents`) removes the wrapper from the layout box tree entirely, so wrapping a grid item (a `BlockCard`) or a flex item (a tab button) never changes how its parent's grid/flex lays out — only `Tooltip`'s children remain real layout participants. The bubble is `pointer-events-none` so it can never block clicks or drags on whatever it floats over, and it is rendered through `createPortal(..., document.body)` so it always escapes the `overflow-y-auto` scrollable containers used throughout the sidebar.

- [ ] **Step 6: Run lint to verify correctness**

Run: `npm run lint` (from `client/`)
Expected: no errors for either new file.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/common/tooltipPosition.js client/src/components/common/tooltipPosition.test.js client/src/components/common/Tooltip.jsx
git commit -m "feat: add reusable Tooltip component with portal-based positioning"
```

---

### Task 2: i18n content — `tooltips` namespace in all 4 locales

**Files:**
- Modify: `client/src/locales/it.json`
- Modify: `client/src/locales/en.json`
- Modify: `client/src/locales/fr.json`
- Modify: `client/src/locales/de.json`

**Interfaces:**
- Produces (consumed by Tasks 3, 4, 5): the i18n keys `tooltips.tabs.{blocks,pages,appearance,templates}`, `tooltips.blockCategories.{COMMUNICATION,LEARNING,PRODUCTIVITY,KNOWLEDGE_BASE}`, `tooltips.blocks.<blockId>` (46 ids, exactly matching every `id` in `client/src/data/blockCatalog.js`), `tooltips.appearanceSections.{siteName,template,backgroundImage,brandColor}`, `tooltips.themeTemplates.{corporate-classic,modern-light,dark-glass,vibrant-color}`.

This task is content-only — no component code. Insert the `"tooltips"` block as a new top-level key in each locale file, immediately after the existing `"preview"` block (the last key in every file today) — i.e. add a comma after the `"preview": { ... }` block's closing `}` and then this new block, before the file's final closing `}`.

- [ ] **Step 1: Add the `tooltips` namespace to `client/src/locales/it.json`**

Insert as the new last top-level key:

```json
  "tooltips": {
    "tabs": {
      "blocks": "Catalogo dei blocchi di contenuto da trascinare nelle pagine del sito.",
      "pages": "Gestisci la struttura e l'albero delle pagine del sito.",
      "appearance": "Personalizza nome sito, tema visivo, sfondo e colore brand.",
      "templates": "Applica modelli predefiniti a una singola pagina o all'intero sito."
    },
    "blockCategories": {
      "COMMUNICATION": "Blocchi per news, eventi e comunicazioni interne all'azienda.",
      "LEARNING": "Blocchi per formazione, presentazioni e coinvolgimento dei dipendenti.",
      "PRODUCTIVITY": "Blocchi di utilità quotidiana: procedure, link rapidi, meteo e altro.",
      "KNOWLEDGE_BASE": "Blocchi per ricerca, FAQ, organigramma e informazioni aziendali."
    },
    "blocks": {
      "news-corporate": "Mostra le ultime news aziendali a livello corporate.",
      "news-country": "Mostra le news specifiche del paese selezionato.",
      "news-sede": "Mostra le news specifiche della sede selezionata.",
      "news-funzione": "Mostra le news specifiche della funzione aziendale selezionata.",
      "commenti-contenuto": "Abilita i commenti degli utenti sotto un contenuto.",
      "like-contenuto": "Abilita i like degli utenti su un contenuto.",
      "avvisi-homepage": "Mostra avvisi importanti in evidenza nella home page.",
      "eventi-corporate": "Mostra gli eventi aziendali a livello corporate.",
      "eventi-country": "Mostra gli eventi specifici del paese selezionato.",
      "eventi-sede": "Mostra gli eventi specifici della sede selezionata.",
      "eventi-funzione": "Mostra gli eventi specifici della funzione aziendale selezionata.",
      "sezione-fiere": "Elenca le fiere ed eventi espositivi a cui l'azienda partecipa.",
      "sezione-mostre": "Elenca le mostre e gli eventi culturali aziendali.",
      "multimedia-gallery": "Galleria di foto e video aziendali.",
      "countdown-lancio": "Conto alla rovescia per il lancio di un'iniziativa o prodotto.",
      "rassegna-stampa": "Raccolta degli articoli di stampa che parlano dell'azienda.",
      "bacheca-sindacale": "Bacheca per le comunicazioni sindacali.",
      "bacheca-scambio": "Bacheca per annunci di scambio/cerco tra colleghi.",
      "linkedin-feed": "Mostra gli ultimi post dalla pagina LinkedIn aziendale.",
      "new-entry": "Presenta i nuovi assunti entrati di recente in azienda.",
      "oggi-presentiamo": "Presenta una persona, progetto o iniziativa in evidenza.",
      "polls-survey": "Crea sondaggi e survey per raccogliere il feedback dei dipendenti.",
      "sezione-welfare": "Elenca le iniziative di welfare aziendale a disposizione dei dipendenti.",
      "kudos": "Mostra i riconoscimenti pubblici tra colleghi.",
      "anniversari": "Celebra gli anniversari lavorativi dei dipendenti.",
      "feedback-utenti": "Raccogli il feedback degli utenti sull'intranet o sui contenuti.",
      "procedure": "Elenca le procedure operative aziendali.",
      "sezione-progetti": "Presenta i progetti aziendali in corso.",
      "meteo": "Mostra le previsioni meteo per il paese selezionato.",
      "fusi-orari": "Mostra l'orario corrente nei principali fusi orari aziendali.",
      "multilingua": "Permette di cambiare la lingua di visualizzazione del sito.",
      "collegamenti-rapidi": "Elenco di link rapidi a risorse o strumenti aziendali.",
      "pulsante-cta": "Bottone di invito all'azione (call-to-action) personalizzabile.",
      "titolo-libero": "Titolo di testo libero per introdurre una sezione.",
      "embed-custom": "Incorpora contenuto esterno tramite codice embed personalizzato.",
      "motore-ricerca": "Barra di ricerca per trovare contenuti all'interno dell'intranet.",
      "faq": "Elenco di domande frequenti e relative risposte.",
      "come-fare-per": "Guide passo-passo su come svolgere attività comuni.",
      "organigramma": "Mostra la struttura organizzativa dell'azienda.",
      "rubrica-colleghi": "Permette di cercare e contattare i colleghi aziendali.",
      "contatti-chiave": "Elenca i contatti chiave più utili per i dipendenti.",
      "documenti": "Elenca documenti e file aziendali importanti.",
      "chi-siamo": "Presenta la storia e i valori dell'azienda.",
      "desc-country": "Descrive il paese selezionato (informazioni generali).",
      "desc-sede": "Descrive la sede selezionata (informazioni generali).",
      "desc-funzione": "Descrive la funzione aziendale selezionata (informazioni generali)."
    },
    "appearanceSections": {
      "siteName": "Il nome del sito mostrato nell'header e nell'hero banner.",
      "template": "Scegli uno dei temi visivi predefiniti per il sito.",
      "backgroundImage": "Imposta un'immagine di sfondo per hero banner e barra di navigazione, con colori suggeriti automaticamente.",
      "brandColor": "Il colore principale del brand, usato per accenti e elementi attivi."
    },
    "themeTemplates": {
      "corporate-classic": "Tema scuro e professionale con accento blu, adatto a contesti corporate tradizionali.",
      "modern-light": "Tema chiaro e minimale con accento turchese, per un look moderno e arioso.",
      "dark-glass": "Tema scuro con effetto vetro semi-trasparente e accento azzurro, per un'estetica tech.",
      "vibrant-color": "Tema viola e arancio acceso, per un brand audace e colorato."
    }
  }
```

- [ ] **Step 2: Add the `tooltips` namespace to `client/src/locales/en.json`**

```json
  "tooltips": {
    "tabs": {
      "blocks": "The catalog of content blocks you can drag onto site pages.",
      "pages": "Manage the site's page structure and tree.",
      "appearance": "Customize the site name, visual theme, background and brand color.",
      "templates": "Apply ready-made templates to a single page or the whole site."
    },
    "blockCategories": {
      "COMMUNICATION": "Blocks for company news, events and internal communications.",
      "LEARNING": "Blocks for training, spotlights and employee engagement.",
      "PRODUCTIVITY": "Everyday utility blocks: procedures, quick links, weather and more.",
      "KNOWLEDGE_BASE": "Blocks for search, FAQ, org chart and company information."
    },
    "blocks": {
      "news-corporate": "Shows the latest corporate-wide company news.",
      "news-country": "Shows news specific to the selected country.",
      "news-sede": "Shows news specific to the selected location.",
      "news-funzione": "Shows news specific to the selected business function.",
      "commenti-contenuto": "Enables user comments under a piece of content.",
      "like-contenuto": "Enables user likes on a piece of content.",
      "avvisi-homepage": "Shows important alerts featured on the homepage.",
      "eventi-corporate": "Shows corporate-wide company events.",
      "eventi-country": "Shows events specific to the selected country.",
      "eventi-sede": "Shows events specific to the selected location.",
      "eventi-funzione": "Shows events specific to the selected business function.",
      "sezione-fiere": "Lists trade shows the company is taking part in.",
      "sezione-mostre": "Lists company exhibitions and cultural events.",
      "multimedia-gallery": "A gallery of company photos and videos.",
      "countdown-lancio": "A countdown to the launch of an initiative or product.",
      "rassegna-stampa": "A collection of press articles mentioning the company.",
      "bacheca-sindacale": "A board for union communications.",
      "bacheca-scambio": "A board for swap/wanted posts between colleagues.",
      "linkedin-feed": "Shows the latest posts from the company LinkedIn page.",
      "new-entry": "Introduces employees who recently joined the company.",
      "oggi-presentiamo": "Spotlights a person, project or initiative.",
      "polls-survey": "Create polls and surveys to collect employee feedback.",
      "sezione-welfare": "Lists the welfare initiatives available to employees.",
      "kudos": "Shows public recognition shared between colleagues.",
      "anniversari": "Celebrates employees' work anniversaries.",
      "feedback-utenti": "Collects user feedback on the intranet or its content.",
      "procedure": "Lists company operating procedures.",
      "sezione-progetti": "Showcases ongoing company projects.",
      "meteo": "Shows the weather forecast for the selected country.",
      "fusi-orari": "Shows the current time across the company's main time zones.",
      "multilingua": "Lets visitors switch the site's display language.",
      "collegamenti-rapidi": "A list of quick links to company resources or tools.",
      "pulsante-cta": "A customizable call-to-action button.",
      "titolo-libero": "A free-text heading to introduce a section.",
      "embed-custom": "Embeds external content via a custom embed code.",
      "motore-ricerca": "A search bar for finding content within the intranet.",
      "faq": "A list of frequently asked questions and answers.",
      "come-fare-per": "Step-by-step guides for common tasks.",
      "organigramma": "Shows the company's organizational structure.",
      "rubrica-colleghi": "Lets users search for and contact colleagues.",
      "contatti-chiave": "Lists the key contacts most useful to employees.",
      "documenti": "Lists important company documents and files.",
      "chi-siamo": "Introduces the company's history and values.",
      "desc-country": "Describes the selected country (general information).",
      "desc-sede": "Describes the selected location (general information).",
      "desc-funzione": "Describes the selected business function (general information)."
    },
    "appearanceSections": {
      "siteName": "The site name shown in the header and hero banner.",
      "template": "Choose one of the predefined visual themes for the site.",
      "backgroundImage": "Set a background image for the hero banner and top navigation, with automatically suggested colors.",
      "brandColor": "The brand's main color, used for accents and active elements."
    },
    "themeTemplates": {
      "corporate-classic": "A dark, professional theme with a blue accent, suited to traditional corporate contexts.",
      "modern-light": "A light, minimal theme with a teal accent, for a modern, airy look.",
      "dark-glass": "A dark theme with a semi-transparent glass effect and a cyan accent, for a tech aesthetic.",
      "vibrant-color": "A bold purple-and-orange theme for a daring, colorful brand."
    }
  }
```

- [ ] **Step 3: Add the `tooltips` namespace to `client/src/locales/fr.json`**

```json
  "tooltips": {
    "tabs": {
      "blocks": "Le catalogue des blocs de contenu à glisser sur les pages du site.",
      "pages": "Gérer la structure et l'arborescence des pages du site.",
      "appearance": "Personnaliser le nom du site, le thème visuel, le fond et la couleur de marque.",
      "templates": "Appliquer des modèles prêts à l'emploi à une page ou à tout le site."
    },
    "blockCategories": {
      "COMMUNICATION": "Blocs pour les actualités, événements et communications internes.",
      "LEARNING": "Blocs pour la formation, les mises en avant et l'engagement des collaborateurs.",
      "PRODUCTIVITY": "Blocs utilitaires du quotidien : procédures, liens rapides, météo et plus.",
      "KNOWLEDGE_BASE": "Blocs pour la recherche, la FAQ, l'organigramme et les informations sur l'entreprise."
    },
    "blocks": {
      "news-corporate": "Affiche les dernières actualités de l'entreprise au niveau corporate.",
      "news-country": "Affiche les actualités spécifiques au pays sélectionné.",
      "news-sede": "Affiche les actualités spécifiques au site sélectionné.",
      "news-funzione": "Affiche les actualités spécifiques à la fonction sélectionnée.",
      "commenti-contenuto": "Active les commentaires des utilisateurs sous un contenu.",
      "like-contenuto": "Active les « j'aime » des utilisateurs sur un contenu.",
      "avvisi-homepage": "Affiche des alertes importantes mises en avant sur la page d'accueil.",
      "eventi-corporate": "Affiche les événements de l'entreprise au niveau corporate.",
      "eventi-country": "Affiche les événements spécifiques au pays sélectionné.",
      "eventi-sede": "Affiche les événements spécifiques au site sélectionné.",
      "eventi-funzione": "Affiche les événements spécifiques à la fonction sélectionnée.",
      "sezione-fiere": "Liste les foires auxquelles l'entreprise participe.",
      "sezione-mostre": "Liste les expositions et événements culturels de l'entreprise.",
      "multimedia-gallery": "Une galerie de photos et vidéos de l'entreprise.",
      "countdown-lancio": "Un compte à rebours avant le lancement d'une initiative ou d'un produit.",
      "rassegna-stampa": "Un recueil d'articles de presse mentionnant l'entreprise.",
      "bacheca-sindacale": "Un tableau pour les communications syndicales.",
      "bacheca-scambio": "Un tableau d'annonces d'échange entre collègues.",
      "linkedin-feed": "Affiche les dernières publications de la page LinkedIn de l'entreprise.",
      "new-entry": "Présente les collaborateurs récemment arrivés dans l'entreprise.",
      "oggi-presentiamo": "Met en avant une personne, un projet ou une initiative.",
      "polls-survey": "Créez des sondages pour recueillir l'avis des collaborateurs.",
      "sezione-welfare": "Liste les initiatives de bien-être proposées aux collaborateurs.",
      "kudos": "Affiche les reconnaissances publiques entre collègues.",
      "anniversari": "Célèbre les anniversaires professionnels des collaborateurs.",
      "feedback-utenti": "Recueille l'avis des utilisateurs sur l'intranet ou son contenu.",
      "procedure": "Liste les procédures opérationnelles de l'entreprise.",
      "sezione-progetti": "Met en valeur les projets en cours de l'entreprise.",
      "meteo": "Affiche les prévisions météo du pays sélectionné.",
      "fusi-orari": "Affiche l'heure actuelle dans les principaux fuseaux horaires de l'entreprise.",
      "multilingua": "Permet de changer la langue d'affichage du site.",
      "collegamenti-rapidi": "Une liste de liens rapides vers des ressources ou outils de l'entreprise.",
      "pulsante-cta": "Un bouton d'appel à l'action personnalisable.",
      "titolo-libero": "Un titre en texte libre pour introduire une section.",
      "embed-custom": "Intègre un contenu externe via un code d'intégration personnalisé.",
      "motore-ricerca": "Une barre de recherche pour trouver du contenu dans l'intranet.",
      "faq": "Une liste de questions fréquentes et leurs réponses.",
      "come-fare-per": "Des guides pas à pas pour les tâches courantes.",
      "organigramma": "Affiche l'organigramme de l'entreprise.",
      "rubrica-colleghi": "Permet de rechercher et contacter ses collègues.",
      "contatti-chiave": "Liste les contacts clés les plus utiles aux collaborateurs.",
      "documenti": "Liste les documents et fichiers importants de l'entreprise.",
      "chi-siamo": "Présente l'histoire et les valeurs de l'entreprise.",
      "desc-country": "Décrit le pays sélectionné (informations générales).",
      "desc-sede": "Décrit le site sélectionné (informations générales).",
      "desc-funzione": "Décrit la fonction sélectionnée (informations générales)."
    },
    "appearanceSections": {
      "siteName": "Le nom du site affiché dans l'en-tête et la bannière d'accueil.",
      "template": "Choisissez l'un des thèmes visuels prédéfinis pour le site.",
      "backgroundImage": "Définissez une image de fond pour la bannière d'accueil et la navigation, avec des couleurs suggérées automatiquement.",
      "brandColor": "La couleur principale de la marque, utilisée pour les accents et les éléments actifs."
    },
    "themeTemplates": {
      "corporate-classic": "Un thème sombre et professionnel avec un accent bleu, adapté aux contextes corporate traditionnels.",
      "modern-light": "Un thème clair et minimaliste avec un accent turquoise, pour un look moderne et aéré.",
      "dark-glass": "Un thème sombre à effet verre semi-transparent et accent cyan, pour une esthétique tech.",
      "vibrant-color": "Un thème violet et orange vif, pour une marque audacieuse et colorée."
    }
  }
```

- [ ] **Step 4: Add the `tooltips` namespace to `client/src/locales/de.json`**

```json
  "tooltips": {
    "tabs": {
      "blocks": "Der Katalog der Inhaltsblöcke, die auf Seiten gezogen werden können.",
      "pages": "Verwalten Sie die Struktur und den Seitenbaum der Website.",
      "appearance": "Passen Sie Websitename, visuelles Thema, Hintergrund und Markenfarbe an.",
      "templates": "Wenden Sie fertige Vorlagen auf eine einzelne Seite oder die gesamte Website an."
    },
    "blockCategories": {
      "COMMUNICATION": "Blöcke für Unternehmensnachrichten, Veranstaltungen und interne Kommunikation.",
      "LEARNING": "Blöcke für Schulung, Vorstellungen und Mitarbeiterengagement.",
      "PRODUCTIVITY": "Alltägliche Nutzblöcke: Verfahren, Schnellzugriffe, Wetter und mehr.",
      "KNOWLEDGE_BASE": "Blöcke für Suche, FAQ, Organigramm und Unternehmensinformationen."
    },
    "blocks": {
      "news-corporate": "Zeigt die neuesten unternehmensweiten Nachrichten.",
      "news-country": "Zeigt Nachrichten speziell für das ausgewählte Land.",
      "news-sede": "Zeigt Nachrichten speziell für den ausgewählten Standort.",
      "news-funzione": "Zeigt Nachrichten speziell für die ausgewählte Abteilung.",
      "commenti-contenuto": "Aktiviert Nutzerkommentare zu einem Inhalt.",
      "like-contenuto": "Aktiviert Likes der Nutzer zu einem Inhalt.",
      "avvisi-homepage": "Zeigt wichtige Warnungen auf der Startseite an.",
      "eventi-corporate": "Zeigt unternehmensweite Veranstaltungen.",
      "eventi-country": "Zeigt Veranstaltungen speziell für das ausgewählte Land.",
      "eventi-sede": "Zeigt Veranstaltungen speziell für den ausgewählten Standort.",
      "eventi-funzione": "Zeigt Veranstaltungen speziell für die ausgewählte Abteilung.",
      "sezione-fiere": "Listet Messen auf, an denen das Unternehmen teilnimmt.",
      "sezione-mostre": "Listet Ausstellungen und kulturelle Veranstaltungen des Unternehmens auf.",
      "multimedia-gallery": "Eine Galerie mit Fotos und Videos des Unternehmens.",
      "countdown-lancio": "Ein Countdown bis zum Start einer Initiative oder eines Produkts.",
      "rassegna-stampa": "Eine Sammlung von Presseartikeln über das Unternehmen.",
      "bacheca-sindacale": "Eine Tafel für gewerkschaftliche Mitteilungen.",
      "bacheca-scambio": "Eine Tauschbörse für Anzeigen zwischen Kollegen.",
      "linkedin-feed": "Zeigt die neuesten Beiträge der Unternehmens-LinkedIn-Seite.",
      "new-entry": "Stellt Mitarbeiter vor, die kürzlich ins Unternehmen eingetreten sind.",
      "oggi-presentiamo": "Stellt eine Person, ein Projekt oder eine Initiative vor.",
      "polls-survey": "Erstellen Sie Umfragen, um Feedback der Mitarbeiter zu sammeln.",
      "sezione-welfare": "Listet die für Mitarbeiter verfügbaren Wohlfahrtsinitiativen auf.",
      "kudos": "Zeigt öffentliche Anerkennung zwischen Kollegen.",
      "anniversari": "Feiert die Jubiläen der Mitarbeiter im Unternehmen.",
      "feedback-utenti": "Sammelt Nutzerfeedback zum Intranet oder dessen Inhalten.",
      "procedure": "Listet die betrieblichen Verfahren des Unternehmens auf.",
      "sezione-progetti": "Stellt laufende Unternehmensprojekte vor.",
      "meteo": "Zeigt die Wettervorhersage für das ausgewählte Land.",
      "fusi-orari": "Zeigt die aktuelle Uhrzeit in den wichtigsten Zeitzonen des Unternehmens.",
      "multilingua": "Ermöglicht das Wechseln der Anzeigesprache der Website.",
      "collegamenti-rapidi": "Eine Liste von Schnellzugriffen auf Unternehmensressourcen oder Tools.",
      "pulsante-cta": "Eine anpassbare Call-to-Action-Schaltfläche.",
      "titolo-libero": "Eine frei wählbare Überschrift zur Einleitung eines Abschnitts.",
      "embed-custom": "Bindet externe Inhalte über einen benutzerdefinierten Embed-Code ein.",
      "motore-ricerca": "Eine Suchleiste zum Finden von Inhalten im Intranet.",
      "faq": "Eine Liste häufig gestellter Fragen mit Antworten.",
      "come-fare-per": "Schritt-für-Schritt-Anleitungen für gängige Aufgaben.",
      "organigramma": "Zeigt die Organisationsstruktur des Unternehmens.",
      "rubrica-colleghi": "Ermöglicht das Suchen und Kontaktieren von Kollegen.",
      "contatti-chiave": "Listet die für Mitarbeiter wichtigsten Schlüsselkontakte auf.",
      "documenti": "Listet wichtige Unternehmensdokumente und -dateien auf.",
      "chi-siamo": "Stellt die Geschichte und Werte des Unternehmens vor.",
      "desc-country": "Beschreibt das ausgewählte Land (allgemeine Informationen).",
      "desc-sede": "Beschreibt den ausgewählten Standort (allgemeine Informationen).",
      "desc-funzione": "Beschreibt die ausgewählte Abteilung (allgemeine Informationen)."
    },
    "appearanceSections": {
      "siteName": "Der Websitename, der im Header und im Hero-Banner angezeigt wird.",
      "template": "Wählen Sie eines der vordefinierten visuellen Themen für die Website.",
      "backgroundImage": "Legen Sie ein Hintergrundbild für Hero-Banner und Navigationsleiste fest, mit automatisch vorgeschlagenen Farben.",
      "brandColor": "Die Hauptfarbe der Marke, verwendet für Akzente und aktive Elemente."
    },
    "themeTemplates": {
      "corporate-classic": "Ein dunkles, professionelles Thema mit blauem Akzent, geeignet für traditionelle Unternehmenskontexte.",
      "modern-light": "Ein helles, minimalistisches Thema mit türkisem Akzent für einen modernen, luftigen Look.",
      "dark-glass": "Ein dunkles Thema mit halbtransparentem Glaseffekt und cyanfarbenem Akzent für eine technische Ästhetik.",
      "vibrant-color": "Ein kräftiges violett-orangefarbenes Thema für eine mutige, farbenfrohe Marke."
    }
  }
```

- [ ] **Step 5: Verify all 4 files are valid JSON and contain exactly 46 block keys each**

Run (from `client/`):
```bash
node -e "const j=require('./src/locales/it.json'); console.log(Object.keys(j.tooltips.blocks).length)"
node -e "const j=require('./src/locales/en.json'); console.log(Object.keys(j.tooltips.blocks).length)"
node -e "const j=require('./src/locales/fr.json'); console.log(Object.keys(j.tooltips.blocks).length)"
node -e "const j=require('./src/locales/de.json'); console.log(Object.keys(j.tooltips.blocks).length)"
```
Expected: `46` printed 4 times (confirms valid JSON parse and the full block count in each locale).

- [ ] **Step 6: Commit**

```bash
git add client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json
git commit -m "feat: add tooltips i18n namespace for sidebar explanatory text"
```

---

### Task 3: Wire `Tooltip` into `LeftSidebar.jsx` (4 tabs)

**Files:**
- Modify: `client/src/components/sidebar-left/LeftSidebar.jsx` (full rewrite, currently 49 lines)
- Test: `client/tests/smoke.spec.js`

**Interfaces:**
- Consumes: `Tooltip` (default export, Task 1) from `../common/Tooltip.jsx`; `tooltips.tabs.*` keys (Task 2).

- [ ] **Step 1: Rewrite `LeftSidebar.jsx`**

Replace the full contents of `client/src/components/sidebar-left/LeftSidebar.jsx`:

```jsx
import * as icons from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import BlockLibrary from './BlockLibrary.jsx'
import PagesPanel from './PagesPanel.jsx'
import AppearancePanel from './AppearancePanel.jsx'
import TemplateGallery from './TemplateGallery.jsx'
import Tooltip from '../common/Tooltip.jsx'

export default function LeftSidebar() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('blocks')

  const TABS = [
    { id: 'blocks', label: t('sidebar.tabBlocks'), icon: 'Blocks' },
    { id: 'pages', label: t('sidebar.tabPages'), icon: 'Files' },
    { id: 'appearance', label: t('sidebar.tabAppearance'), icon: 'Palette' },
    { id: 'templates', label: t('templates.tabLabel'), icon: 'LayoutTemplate' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col border-b border-slate-mid flex-shrink-0">
        {TABS.map(tabItem => {
          const Icon = icons[tabItem.icon] ?? icons.Box
          return (
            <Tooltip key={tabItem.id} text={t(`tooltips.tabs.${tabItem.id}`)}>
              <button
                onClick={() => setTab(tabItem.id)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider
                  transition-colors border-l-2
                  ${tab === tabItem.id
                    ? 'text-blue-electric border-blue-electric bg-blue-electric/10'
                    : 'text-slate-light border-transparent hover:text-white hover:bg-navy-light'}`}
              >
                <Icon size={16} aria-hidden="true" className="flex-shrink-0" />
                {tabItem.label}
              </button>
            </Tooltip>
          )
        })}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'blocks' && <BlockLibrary />}
        {tab === 'pages' && <PagesPanel />}
        {tab === 'appearance' && <AppearancePanel />}
        {tab === 'templates' && <TemplateGallery />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add the Playwright e2e test**

In `client/tests/smoke.spec.js`, insert this test immediately after the `'loads the 3-column workspace with the default Home page'` test (which ends at line 28) and before `'search filters the block library'` (line 30):

```js
  test('hovering a sidebar tab shows an explanatory tooltip', async ({ page }) => {
    await page.getByRole('button', { name: 'Blocchi' }).hover()
    await expect(page.getByRole('tooltip')).toHaveText('Catalogo dei blocchi di contenuto da trascinare nelle pagine del sito.')
  })

```

- [ ] **Step 3: Run the test**

Run: `npm run test:e2e -- -g "hovering a sidebar tab"` (from `client/`)
Expected: PASS

- [ ] **Step 4: Run lint**

Run: `npm run lint` (from `client/`)
Expected: no errors for `LeftSidebar.jsx`.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/sidebar-left/LeftSidebar.jsx client/tests/smoke.spec.js
git commit -m "feat: add explanatory tooltips to the 4 sidebar tabs"
```

---

### Task 4: Wire `Tooltip` into `CategoryGroup.jsx` (categories + individual blocks)

**Files:**
- Modify: `client/src/components/sidebar-left/CategoryGroup.jsx` (full rewrite, currently 35 lines)
- Test: `client/tests/smoke.spec.js`

**Interfaces:**
- Consumes: `Tooltip` (Task 1); `tooltips.blockCategories.*` and `tooltips.blocks.*` keys (Task 2).

- [ ] **Step 1: Rewrite `CategoryGroup.jsx`**

Replace the full contents of `client/src/components/sidebar-left/CategoryGroup.jsx`:

```jsx
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import BlockCard from './BlockCard.jsx'
import Tooltip from '../common/Tooltip.jsx'

export default function CategoryGroup({ category, blocks }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-1">
      <Tooltip text={t(`tooltips.blockCategories.${category}`)}>
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-mid transition-colors"
        >
          <span className="text-xs font-semibold text-slate-light uppercase tracking-wider">
            {t(`blocks.categories.${category}`)}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-mid text-slate-light px-1.5 py-0.5 rounded-full">
              {blocks.length}
            </span>
            {open
              ? <ChevronDown size={14} className="text-slate-light" />
              : <ChevronRight size={14} className="text-slate-light" />
            }
          </div>
        </button>
      </Tooltip>
      {open && (
        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
          {blocks.map(block => (
            <Tooltip key={block.id} text={t(`tooltips.blocks.${block.id}`)}>
              <BlockCard block={block} />
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  )
}
```

`display: contents` on `Tooltip`'s wrapper means the 2-column CSS grid (`grid grid-cols-2`) still sees each `BlockCard`'s own rendered `<div>` as the grid item — the wrapping `<Tooltip>` span is invisible to grid layout, so the grid keeps placing cards exactly as it did before this change.

- [ ] **Step 2: Add the Playwright e2e tests**

In `client/tests/smoke.spec.js`, insert these two tests immediately after the `'search filters the block library'` test (which ends at line 34) and before `'all 9 Phase 6 sub-project 1 blocks are visible in the block library'` (line 36):

```js
  test('hovering a block category header shows an explanatory tooltip', async ({ page }) => {
    await page.getByText('Comunicazione', { exact: true }).hover()
    await expect(page.getByRole('tooltip')).toHaveText("Blocchi per news, eventi e comunicazioni interne all'azienda.")
  })

  test('hovering a block card shows an explanatory tooltip', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).hover()
    await expect(page.getByRole('tooltip')).toHaveText('Mostra le ultime news aziendali a livello corporate.')
  })

```

- [ ] **Step 3: Run the tests**

Run: `npm run test:e2e -- -g "category header shows|block card shows"` (from `client/`)
Expected: PASS (2/2)

- [ ] **Step 4: Run lint**

Run: `npm run lint` (from `client/`)
Expected: no errors for `CategoryGroup.jsx`.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/sidebar-left/CategoryGroup.jsx client/tests/smoke.spec.js
git commit -m "feat: add explanatory tooltips to block categories and individual blocks"
```

---

### Task 5: Wire `Tooltip` into `AppearancePanel.jsx` (4 sections + 4 theme cards)

**Files:**
- Modify: `client/src/components/sidebar-left/AppearancePanel.jsx` (full rewrite, currently 126 lines)
- Test: `client/tests/smoke.spec.js`

**Interfaces:**
- Consumes: `Tooltip` (Task 1); `tooltips.appearanceSections.*` and `tooltips.themeTemplates.*` keys (Task 2).

- [ ] **Step 1: Rewrite `AppearancePanel.jsx`**

Replace the full contents of `client/src/components/sidebar-left/AppearancePanel.jsx`:

```jsx
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { THEME_TEMPLATES } from '../../data/themeTemplates.js'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'
import Tooltip from '../common/Tooltip.jsx'

export default function AppearancePanel() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { template, accentColor } = useTheme()
  const { t } = useTranslation()
  const lang = useLang()
  const theme = state.tenantConfiguration.theme

  function selectTemplate(templateId) {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, templateId } } })
  }

  function setAccentColor(value) {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, accentColor: value } } })
  }

  function resetAccentColor() {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, accentColor: null } } })
  }

  function handleBackgroundImageUrlChange(value) {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, backgroundImageUrl: value } } })
  }

  function removeBackgroundImage() {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, backgroundImageUrl: '' } } })
  }

  function handleSiteNameChange(value) {
    const current = state.tenantConfiguration.siteName
    const updated = typeof current === 'string'
      ? { it: current, en: current, fr: current, de: current, [lang]: value }
      : { ...current, [lang]: value }
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { siteName: updated } })
  }

  return (
    <div className="p-3 space-y-4 overflow-y-auto h-full">
      <div>
        <Tooltip text={t('tooltips.appearanceSections.siteName')}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-light mb-2">
            {t('appearance.siteNameLabel', { lang: lang.toUpperCase() })}
          </h3>
        </Tooltip>
        <input
          type="text"
          value={t2(state.tenantConfiguration.siteName, lang)}
          onChange={e => handleSiteNameChange(e.target.value)}
          className="w-full bg-slate-mid text-white text-xs px-2.5 py-1.5 rounded border border-slate-mid focus:border-blue-electric focus:outline-none"
        />
      </div>

      <div>
        <Tooltip text={t('tooltips.appearanceSections.template')}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-light mb-2">
            {t('appearance.template')}
          </h3>
        </Tooltip>
        <div className="space-y-2">
          {THEME_TEMPLATES.map(tmpl => (
            <Tooltip key={tmpl.id} text={t(`tooltips.themeTemplates.${tmpl.id}`)}>
              <button
                type="button"
                onClick={() => selectTemplate(tmpl.id)}
                className={`w-full text-left rounded-lg border p-2 transition-colors
                  ${tmpl.id === template.id ? 'border-blue-electric ring-1 ring-blue-electric/30' : 'border-slate-mid hover:border-slate-light'}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white">{tmpl.name}</span>
                  {tmpl.id === template.id && <Check size={14} className="text-blue-electric" />}
                </div>
                <div className="flex gap-1">
                  <span className="block w-5 h-5 rounded" style={{ background: tmpl.swatch.nav }} />
                  <span className="block w-5 h-5 rounded" style={{ background: tmpl.swatch.hero }} />
                  <span className="block w-5 h-5 rounded" style={{ background: tmpl.accentColor }} />
                  <span className="block w-5 h-5 rounded border border-slate-mid" style={{ background: tmpl.swatch.card }} />
                </div>
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      <div>
        <Tooltip text={t('tooltips.appearanceSections.backgroundImage')}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-light mb-2">
            {t('appearance.backgroundImageLabel')}
          </h3>
        </Tooltip>
        <input
          type="text"
          value={theme?.backgroundImageUrl || ''}
          onChange={e => handleBackgroundImageUrlChange(e.target.value)}
          placeholder={t('appearance.backgroundImageHint')}
          className="w-full bg-slate-mid text-white text-xs px-2.5 py-1.5 rounded border border-slate-mid focus:border-blue-electric focus:outline-none"
        />
        {theme?.backgroundImageUrl && (
          <button type="button" onClick={removeBackgroundImage} className="mt-1 text-xs text-blue-electric hover:underline">
            {t('appearance.backgroundImageRemove')}
          </button>
        )}
      </div>

      <div>
        <Tooltip text={t('tooltips.appearanceSections.brandColor')}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-light mb-2">
            {t('appearance.brandColor')}
          </h3>
        </Tooltip>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={accentColor}
            onChange={e => setAccentColor(e.target.value)}
            className="w-8 h-8 rounded border border-slate-mid bg-transparent cursor-pointer"
          />
          <span className="text-xs text-slate-light flex-1">{accentColor}</span>
          {theme?.accentColor && (
            <button type="button" onClick={resetAccentColor} className="text-xs text-blue-electric hover:underline">
              {t('appearance.reset')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add the Playwright e2e tests**

In `client/tests/smoke.spec.js`, insert these two tests immediately after the `'accent color picker updates --theme-accent on the canvas'` test (which ends at line 166) and before `'setting a background image URL applies it to the Hero Banner and Top Nav'` (line 168):

```js
  test('hovering an Aspetto section header shows an explanatory tooltip', async ({ page }) => {
    await page.getByRole('button', { name: 'Aspetto' }).click()
    await page.getByText('Colore brand', { exact: true }).hover()
    await expect(page.getByRole('tooltip')).toHaveText('Il colore principale del brand, usato per accenti e elementi attivi.')
  })

  test('hovering a theme template card shows an explanatory tooltip', async ({ page }) => {
    await page.getByRole('button', { name: 'Aspetto' }).click()
    await page.getByText('Corporate Classic', { exact: true }).hover()
    await expect(page.getByRole('tooltip')).toHaveText('Tema scuro e professionale con accento blu, adatto a contesti corporate tradizionali.')
  })

```

`'Corporate Classic'` is `THEME_TEMPLATES[0].name` — a plain, untranslated string rendered directly via `{tmpl.name}` (confirmed in `client/src/data/themeTemplates.js`), so this selector is locale-independent and stable regardless of the app's active language.

- [ ] **Step 3: Run the tests**

Run: `npm run test:e2e -- -g "Aspetto section header shows|theme template card shows"` (from `client/`)
Expected: PASS (2/2)

- [ ] **Step 4: Run lint**

Run: `npm run lint` (from `client/`)
Expected: no errors for `AppearancePanel.jsx`.

- [ ] **Step 5: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e` (from `client/`)
Expected: all tests pass, aside from any pre-existing, unrelated failures already present before this work (check `git log`/prior CI history if any failure looks unrelated to tooltips).

- [ ] **Step 6: Commit**

```bash
git add client/src/components/sidebar-left/AppearancePanel.jsx client/tests/smoke.spec.js
git commit -m "feat: add explanatory tooltips to Aspetto sections and theme templates"
```
