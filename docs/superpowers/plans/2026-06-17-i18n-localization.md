# i18n Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize the entire ShareFlow editor and preview in IT/EN/FR/DE — auto-detected from the browser, manually overridable via a Navbar pill — without breaking the existing 19 smoke tests.

**Architecture:** Single i18next instance with i18next-browser-languagedetector (localStorage → navigator). Type 1 strings use `useTranslation()` + `t('key')`. Type 2 structural fields (`siteName`, `pages[].title`) are stored as `{ it, en, fr, de }` objects and resolved by a `t2(field, lang)` utility. A `useLang()` hook returns the active 2-letter code. A `LanguageSwitcher` pill in the Navbar is the single override control.

**Tech Stack:** i18next ^26.3.1 + react-i18next ^17.0.8 + i18next-browser-languagedetector ^8.2.1 (all already installed), Playwright for e2e tests (`npm run test:e2e` from `client/`).

---

## File Structure

**New files:**
- `client/src/i18n.js` — i18next configuration, side-effect import
- `client/src/locales/it.json` — Italian (fallback locale)
- `client/src/locales/en.json` — English
- `client/src/locales/fr.json` — French
- `client/src/locales/de.json` — German
- `client/src/hooks/useLang.js` — returns current 2-letter language code
- `client/src/utils/localizedText.js` — `t2(field, lang)` utility
- `client/src/components/layout/LanguageSwitcher.jsx` — IT/EN/FR/DE pill

**Modified files:**
- `client/src/main.jsx` — import `./i18n.js` as side effect
- `client/src/context/configuratorReducer.js` — Type 2 state shape + RENAME_PAGE + ADD_PAGE
- `client/src/components/canvas/HeroBanner.jsx` — Type 2: siteName + page title
- `client/src/components/canvas/CanvasTopNav.jsx` — Type 2: page titles + pass lang to MegaMenuPanel
- `client/src/components/canvas/MegaMenuPanel.jsx` — Type 2: node titles via lang prop
- `client/src/components/canvas/CanvasDropZone.jsx` — Type 2: page title; Type 1: canvas strings
- `client/src/components/canvas/CanvasSection.jsx` — Type 1: tooltip titles
- `client/src/components/canvas/CanvasColumn.jsx` — Type 1: drop hint
- `client/src/components/canvas/CanvasBlock.jsx` — Type 1: move menu strings
- `client/src/components/canvas/CanvasBlockPreview.jsx` — Type 1: block labels + "See all" + "giorni"
- `client/src/components/sidebar-left/AppearancePanel.jsx` — Type 1: labels + new siteName input
- `client/src/components/sidebar-left/BlockCard.jsx` — Type 1: block label
- `client/src/components/sidebar-left/BlockLibrary.jsx` — Type 1: search placeholder + no-results
- `client/src/components/sidebar-left/CategoryGroup.jsx` — Type 1: category labels
- `client/src/components/sidebar-left/PageTreeItem.jsx` — Type 2: page title display/edit
- `client/src/components/sidebar-left/PagesPanel.jsx` — Type 1: section header + add button
- `client/src/components/sidebar-right/PropertiesPanel.jsx` — Type 1: tabs + block header + prop labels
- `client/src/components/sidebar-right/EmptyState.jsx` — Type 1: empty state strings
- `client/src/components/sidebar-right/SourceSelector.jsx` — Type 1: source labels + placeholders
- `client/src/components/sidebar-right/ContentPanel.jsx` — Type 1: content panel strings
- `client/src/components/layout/Navbar.jsx` — add LanguageSwitcher + Type 1: strings
- `client/src/components/deploy/DeployModal.jsx` — Type 1: all strings + Type 2: siteName
- `client/src/components/preview/PreviewToolbar.jsx` — Type 1: device labels + close
- `client/tests/smoke.spec.js` — add `addInitScript` to beforeEach + new i18n tests

---

## Task 1: i18n Foundation — Locale Files + Configuration

**Files:**
- Create: `client/src/locales/it.json`
- Create: `client/src/locales/en.json`
- Create: `client/src/locales/fr.json`
- Create: `client/src/locales/de.json`
- Create: `client/src/i18n.js`
- Modify: `client/src/main.jsx`

- [ ] **Step 1: Create the Italian locale (fallback)**

Create `client/src/locales/it.json`:

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
    "add": "Aggiungi pagina"
  },
  "appearance": {
    "siteNameLabel": "Nome sito ({{lang}})",
    "template": "Template",
    "brandColor": "Colore brand",
    "reset": "Reset"
  },
  "blocks": {
    "search": "Search blocks…",
    "noResults": "No blocks match \"{{query}}\"",
    "seeAll": "See all",
    "days": "giorni",
    "categories": {
      "COMMUNICATION": "Communication",
      "LEARNING": "Learning",
      "PRODUCTIVITY": "Productivity",
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
  },
  "canvas": {
    "preview": "Canvas Preview",
    "addSection": "Aggiungi sezione",
    "dropHere": "Trascina qui un blocco",
    "changeLayout": "Cambia layout sezione",
    "deleteSection": "Elimina sezione",
    "moveTo": "Sposta in",
    "sectionCol": "Sezione {{section}} · Colonna {{col}}"
  },
  "props": {
    "properties": "Proprietà",
    "content": "Contenuto",
    "noSelection": "No block selected",
    "noSelectionHint": "Click a block on the canvas to configure its properties",
    "visible": "Visible",
    "commentsEnabled": "Comments enabled",
    "likesEnabled": "Likes enabled"
  },
  "content": {
    "dataSource": "Fonte dati",
    "urlLabel": "URL",
    "manualBanner": "In modalità manuale il contenuto inserito qui è quello pubblicato in produzione.",
    "sectionTitle": "Contenuto",
    "sectionTitleSample": "Dati campione",
    "production": "PRODUZIONE",
    "add": "+ Aggiungi",
    "addItem": "+ Aggiungi item",
    "urlHint": "Inserisci un URL per la fonte esterna, poi aggiungi dati campione per l’anteprima."
  },
  "source": {
    "sharepoint-list": "SharePoint",
    "rss": "RSS",
    "http-api": "HTTP API",
    "manual": "Manuale",
    "placeholder_sharepoint-list": "https://tenant.sharepoint.com/sites/.../Lists/...",
    "placeholder_rss": "https://example.com/feed.xml",
    "placeholder_http-api": "https://api.example.com/endpoint"
  },
  "deploy": {
    "title": "Deploying to SharePoint",
    "step1": "Authenticating via MSAL…",
    "step2": "Connecting to Microsoft Graph API…",
    "step3": "Creating SharePoint Communication Site…",
    "step4": "Provisioning Lists & Content Types…",
    "step5": "Configuring Pages & Webparts…",
    "step6": "Deployment complete!",
    "siteReady": "Your SharePoint site is ready",
    "openInSharePoint": "Open in SharePoint",
    "done": "Done",
    "close": "Close",
    "errorDefault": "Unable to reach the provisioning service. Make sure the backend is running and try again."
  },
  "preview": {
    "desktop": "Desktop",
    "tablet": "Tablet",
    "mobile": "Mobile",
    "close": "Chiudi preview"
  }
}
```

- [ ] **Step 2: Create the English locale**

Create `client/src/locales/en.json`:

```json
{
  "navbar": {
    "tagline": "The No-Code SharePoint Intranet Factory",
    "tenant": "Tenant: Contoso Corp",
    "preview": "Preview",
    "deploy": "Deploy to SharePoint"
  },
  "pages": {
    "title": "Pages",
    "add": "Add page"
  },
  "appearance": {
    "siteNameLabel": "Site name ({{lang}})",
    "template": "Template",
    "brandColor": "Brand color",
    "reset": "Reset"
  },
  "blocks": {
    "search": "Search blocks…",
    "noResults": "No blocks match \"{{query}}\"",
    "seeAll": "See all",
    "days": "days",
    "categories": {
      "COMMUNICATION": "Communication",
      "LEARNING": "Learning",
      "PRODUCTIVITY": "Productivity",
      "KNOWLEDGE_BASE": "Knowledge Base"
    },
    "labels": {
      "news-corporate": "Corporate News",
      "news-country": "Country News",
      "news-sede": "Location News",
      "news-funzione": "Function News",
      "commenti-contenuto": "Content Comments",
      "like-contenuto": "Content Likes",
      "avvisi-homepage": "Homepage Alerts",
      "eventi-corporate": "Corporate Events",
      "eventi-country": "Country Events",
      "eventi-sede": "Location Events",
      "eventi-funzione": "Function Events",
      "sezione-fiere": "Trade Shows",
      "sezione-mostre": "Exhibitions",
      "multimedia-gallery": "Multimedia Gallery",
      "countdown-lancio": "Launch Countdown",
      "rassegna-stampa": "Press Review",
      "bacheca-sindacale": "Union Board",
      "bacheca-scambio": "Exchange Board",
      "new-entry": "New Entry",
      "oggi-presentiamo": "Today We Present…",
      "polls-survey": "Polls & Survey",
      "sezione-welfare": "Welfare Section",
      "procedure": "Procedures",
      "sezione-progetti": "Projects Section",
      "meteo": "Weather",
      "fusi-orari": "Time Zones",
      "multilingua": "Multilingual",
      "motore-ricerca": "Search Engine",
      "faq": "FAQ",
      "come-fare-per": "How To",
      "organigramma": "Org Chart",
      "rubrica-colleghi": "Staff Directory",
      "chi-siamo": "About Us",
      "desc-country": "Country Description",
      "desc-sede": "Location Description",
      "desc-funzione": "Function Description"
    }
  },
  "canvas": {
    "preview": "Canvas Preview",
    "addSection": "Add section",
    "dropHere": "Drag a block here",
    "changeLayout": "Change section layout",
    "deleteSection": "Delete section",
    "moveTo": "Move to",
    "sectionCol": "Section {{section}} · Column {{col}}"
  },
  "props": {
    "properties": "Properties",
    "content": "Content",
    "noSelection": "No block selected",
    "noSelectionHint": "Click a block on the canvas to configure its properties",
    "visible": "Visible",
    "commentsEnabled": "Comments enabled",
    "likesEnabled": "Likes enabled"
  },
  "content": {
    "dataSource": "Data source",
    "urlLabel": "URL",
    "manualBanner": "In manual mode, the content entered here is what gets published to production.",
    "sectionTitle": "Content",
    "sectionTitleSample": "Sample data",
    "production": "PRODUCTION",
    "add": "+ Add",
    "addItem": "+ Add item",
    "urlHint": "Enter a URL for the external source, then add sample data for the preview."
  },
  "source": {
    "sharepoint-list": "SharePoint",
    "rss": "RSS",
    "http-api": "HTTP API",
    "manual": "Manual",
    "placeholder_sharepoint-list": "https://tenant.sharepoint.com/sites/.../Lists/...",
    "placeholder_rss": "https://example.com/feed.xml",
    "placeholder_http-api": "https://api.example.com/endpoint"
  },
  "deploy": {
    "title": "Deploying to SharePoint",
    "step1": "Authenticating via MSAL…",
    "step2": "Connecting to Microsoft Graph API…",
    "step3": "Creating SharePoint Communication Site…",
    "step4": "Provisioning Lists & Content Types…",
    "step5": "Configuring Pages & Webparts…",
    "step6": "Deployment complete!",
    "siteReady": "Your SharePoint site is ready",
    "openInSharePoint": "Open in SharePoint",
    "done": "Done",
    "close": "Close",
    "errorDefault": "Unable to reach the provisioning service. Make sure the backend is running and try again."
  },
  "preview": {
    "desktop": "Desktop",
    "tablet": "Tablet",
    "mobile": "Mobile",
    "close": "Close preview"
  }
}
```

- [ ] **Step 3: Create the French locale**

Create `client/src/locales/fr.json`:

```json
{
  "navbar": {
    "tagline": "The No-Code SharePoint Intranet Factory",
    "tenant": "Locataire : Contoso Corp",
    "preview": "Aperçu",
    "deploy": "Déployer sur SharePoint"
  },
  "pages": {
    "title": "Pages",
    "add": "Ajouter une page"
  },
  "appearance": {
    "siteNameLabel": "Nom du site ({{lang}})",
    "template": "Modèle",
    "brandColor": "Couleur de marque",
    "reset": "Réinitialiser"
  },
  "blocks": {
    "search": "Rechercher des blocs…",
    "noResults": "Aucun bloc ne correspond à « {{query}} »",
    "seeAll": "Voir tout",
    "days": "jours",
    "categories": {
      "COMMUNICATION": "Communication",
      "LEARNING": "Formation",
      "PRODUCTIVITY": "Productivité",
      "KNOWLEDGE_BASE": "Base de connaissances"
    },
    "labels": {
      "news-corporate": "Actualités Corporate",
      "news-country": "Actualités Pays",
      "news-sede": "Actualités Site",
      "news-funzione": "Actualités Fonction",
      "commenti-contenuto": "Commentaires",
      "like-contenuto": "J’aime",
      "avvisi-homepage": "Alertes page d’accueil",
      "eventi-corporate": "Événements Corporate",
      "eventi-country": "Événements Pays",
      "eventi-sede": "Événements Site",
      "eventi-funzione": "Événements Fonction",
      "sezione-fiere": "Foires",
      "sezione-mostre": "Expositions",
      "multimedia-gallery": "Galerie multimédia",
      "countdown-lancio": "Compte à rebours",
      "rassegna-stampa": "Revue de presse",
      "bacheca-sindacale": "Tableau syndical",
      "bacheca-scambio": "Tableau d’échanges",
      "new-entry": "Nouvelle entrée",
      "oggi-presentiamo": "Aujourd’hui nous présentons…",
      "polls-survey": "Sondages",
      "sezione-welfare": "Bien-être",
      "procedure": "Procédures",
      "sezione-progetti": "Projets",
      "meteo": "Météo",
      "fusi-orari": "Fuseaux horaires",
      "multilingua": "Multilingue",
      "motore-ricerca": "Moteur de recherche",
      "faq": "FAQ",
      "come-fare-per": "Comment faire",
      "organigramma": "Organigramme",
      "rubrica-colleghi": "Annuaire",
      "chi-siamo": "Qui sommes-nous",
      "desc-country": "Description pays",
      "desc-sede": "Description site",
      "desc-funzione": "Description fonction"
    }
  },
  "canvas": {
    "preview": "Aperçu Canvas",
    "addSection": "Ajouter une section",
    "dropHere": "Faites glisser un bloc ici",
    "changeLayout": "Changer la disposition",
    "deleteSection": "Supprimer la section",
    "moveTo": "Déplacer vers",
    "sectionCol": "Section {{section}} · Colonne {{col}}"
  },
  "props": {
    "properties": "Propriétés",
    "content": "Contenu",
    "noSelection": "Aucun bloc sélectionné",
    "noSelectionHint": "Cliquez sur un bloc dans le canvas pour configurer ses propriétés",
    "visible": "Visible",
    "commentsEnabled": "Commentaires activés",
    "likesEnabled": "J’aime activés"
  },
  "content": {
    "dataSource": "Source de données",
    "urlLabel": "URL",
    "manualBanner": "En mode manuel, le contenu saisi ici est celui publié en production.",
    "sectionTitle": "Contenu",
    "sectionTitleSample": "Données d’exemple",
    "production": "PRODUCTION",
    "add": "+ Ajouter",
    "addItem": "+ Ajouter un élément",
    "urlHint": "Saisissez une URL pour la source externe, puis ajoutez des données d’exemple pour l’aperçu."
  },
  "source": {
    "sharepoint-list": "SharePoint",
    "rss": "RSS",
    "http-api": "HTTP API",
    "manual": "Manuel",
    "placeholder_sharepoint-list": "https://tenant.sharepoint.com/sites/.../Lists/...",
    "placeholder_rss": "https://example.com/feed.xml",
    "placeholder_http-api": "https://api.example.com/endpoint"
  },
  "deploy": {
    "title": "Déploiement sur SharePoint",
    "step1": "Authentification via MSAL…",
    "step2": "Connexion à Microsoft Graph API…",
    "step3": "Création du site SharePoint…",
    "step4": "Provisionnement des listes…",
    "step5": "Configuration des pages…",
    "step6": "Déploiement terminé !",
    "siteReady": "Votre site SharePoint est prêt",
    "openInSharePoint": "Ouvrir dans SharePoint",
    "done": "Terminé",
    "close": "Fermer",
    "errorDefault": "Impossible de contacter le service de provisionnement. Vérifiez que le backend est actif et réessayez."
  },
  "preview": {
    "desktop": "Bureau",
    "tablet": "Tablette",
    "mobile": "Mobile",
    "close": "Fermer l’aperçu"
  }
}
```

- [ ] **Step 4: Create the German locale**

Create `client/src/locales/de.json`:

```json
{
  "navbar": {
    "tagline": "The No-Code SharePoint Intranet Factory",
    "tenant": "Mandant: Contoso Corp",
    "preview": "Vorschau",
    "deploy": "Auf SharePoint bereitstellen"
  },
  "pages": {
    "title": "Seiten",
    "add": "Seite hinzufügen"
  },
  "appearance": {
    "siteNameLabel": "Websitename ({{lang}})",
    "template": "Vorlage",
    "brandColor": "Markenfarbe",
    "reset": "Zurücksetzen"
  },
  "blocks": {
    "search": "Blöcke suchen…",
    "noResults": "Keine Blöcke entsprechen „{{query}}“",
    "seeAll": "Alle anzeigen",
    "days": "Tage",
    "categories": {
      "COMMUNICATION": "Kommunikation",
      "LEARNING": "Lernen",
      "PRODUCTIVITY": "Produktivität",
      "KNOWLEDGE_BASE": "Wissensdatenbank"
    },
    "labels": {
      "news-corporate": "Corporate-News",
      "news-country": "Länder-News",
      "news-sede": "Standort-News",
      "news-funzione": "Abteilungs-News",
      "commenti-contenuto": "Kommentare",
      "like-contenuto": "Likes",
      "avvisi-homepage": "Homepage-Warnungen",
      "eventi-corporate": "Corporate-Veranstaltungen",
      "eventi-country": "Länder-Veranstaltungen",
      "eventi-sede": "Standort-Veranstaltungen",
      "eventi-funzione": "Abteilungs-Veranstaltungen",
      "sezione-fiere": "Messen",
      "sezione-mostre": "Ausstellungen",
      "multimedia-gallery": "Multimedia-Galerie",
      "countdown-lancio": "Start-Countdown",
      "rassegna-stampa": "Presseschau",
      "bacheca-sindacale": "Gewerkschaftstafel",
      "bacheca-scambio": "Tauschbörse",
      "new-entry": "Neuzugänge",
      "oggi-presentiamo": "Heute stellen wir vor…",
      "polls-survey": "Umfragen",
      "sezione-welfare": "Wohlfahrt",
      "procedure": "Verfahren",
      "sezione-progetti": "Projekte",
      "meteo": "Wetter",
      "fusi-orari": "Zeitzonen",
      "multilingua": "Mehrsprachig",
      "motore-ricerca": "Suchmaschine",
      "faq": "FAQ",
      "come-fare-per": "Anleitungen",
      "organigramma": "Organigramm",
      "rubrica-colleghi": "Mitarbeiterverzeichnis",
      "chi-siamo": "Über uns",
      "desc-country": "Länderbeschreibung",
      "desc-sede": "Standortbeschreibung",
      "desc-funzione": "Abteilungsbeschreibung"
    }
  },
  "canvas": {
    "preview": "Canvas-Vorschau",
    "addSection": "Abschnitt hinzufügen",
    "dropHere": "Block hierher ziehen",
    "changeLayout": "Abschnittslayout ändern",
    "deleteSection": "Abschnitt löschen",
    "moveTo": "Verschieben nach",
    "sectionCol": "Abschnitt {{section}} · Spalte {{col}}"
  },
  "props": {
    "properties": "Eigenschaften",
    "content": "Inhalt",
    "noSelection": "Kein Block ausgewählt",
    "noSelectionHint": "Klicken Sie auf einen Block im Canvas, um seine Eigenschaften zu konfigurieren",
    "visible": "Sichtbar",
    "commentsEnabled": "Kommentare aktiviert",
    "likesEnabled": "Likes aktiviert"
  },
  "content": {
    "dataSource": "Datenquelle",
    "urlLabel": "URL",
    "manualBanner": "Im manuellen Modus wird der hier eingegebene Inhalt in der Produktion veröffentlicht.",
    "sectionTitle": "Inhalt",
    "sectionTitleSample": "Beispieldaten",
    "production": "PRODUKTION",
    "add": "+ Hinzufügen",
    "addItem": "+ Element hinzufügen",
    "urlHint": "Geben Sie eine URL für die externe Quelle ein und fügen Sie dann Beispieldaten für die Vorschau hinzu."
  },
  "source": {
    "sharepoint-list": "SharePoint",
    "rss": "RSS",
    "http-api": "HTTP API",
    "manual": "Manuell",
    "placeholder_sharepoint-list": "https://tenant.sharepoint.com/sites/.../Lists/...",
    "placeholder_rss": "https://example.com/feed.xml",
    "placeholder_http-api": "https://api.example.com/endpoint"
  },
  "deploy": {
    "title": "Auf SharePoint bereitstellen",
    "step1": "Authentifizierung über MSAL…",
    "step2": "Verbindung mit Microsoft Graph API…",
    "step3": "SharePoint-Website erstellen…",
    "step4": "Listen und Inhaltstypen bereitstellen…",
    "step5": "Seiten und Webparts konfigurieren…",
    "step6": "Bereitstellung abgeschlossen!",
    "siteReady": "Ihre SharePoint-Website ist bereit",
    "openInSharePoint": "In SharePoint öffnen",
    "done": "Fertig",
    "close": "Schließen",
    "errorDefault": "Der Bereitstellungsdienst ist nicht erreichbar. Stellen Sie sicher, dass das Backend läuft, und versuchen Sie es erneut."
  },
  "preview": {
    "desktop": "Desktop",
    "tablet": "Tablet",
    "mobile": "Mobil",
    "close": "Vorschau schließen"
  }
}
```

- [ ] **Step 5: Create i18n.js**

Create `client/src/i18n.js`:

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
    fallbackLng: 'it',
    supportedLngs: ['it', 'en', 'fr', 'de'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: { escapeValue: false },
  })

export default i18n
```

- [ ] **Step 6: Import i18n in main.jsx**

In `client/src/main.jsx`, add the import as the first import after built-ins (before App):

Replace:
```js
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
```

With:
```js
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n.js'
import './index.css'
import App from './App.jsx'
```

- [ ] **Step 7: Start the dev server and verify no console errors**

Run from `client/`:
```
npm run dev
```

Open http://localhost:5173 and check browser console — no i18next errors expected. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add client/src/locales/ client/src/i18n.js client/src/main.jsx
git commit -m "feat(i18n): add locale files and i18next configuration"
```

---

## Task 2: Utilities + LanguageSwitcher + Navbar + Test Fixture

**Files:**
- Create: `client/src/hooks/useLang.js`
- Create: `client/src/utils/localizedText.js`
- Create: `client/src/components/layout/LanguageSwitcher.jsx`
- Modify: `client/src/components/layout/Navbar.jsx`
- Modify: `client/tests/smoke.spec.js`

- [ ] **Step 1: Create useLang hook**

Create `client/src/hooks/useLang.js`:

```js
import { useTranslation } from 'react-i18next'

export function useLang() {
  const { i18n } = useTranslation()
  return i18n.language?.slice(0, 2) ?? 'it'
}
```

- [ ] **Step 2: Create t2 utility**

Create `client/src/utils/localizedText.js`:

```js
export function t2(field, lang) {
  if (!field || typeof field === 'string') return field ?? ''
  return field[lang] ?? field.it ?? ''
}
```

- [ ] **Step 3: Create LanguageSwitcher component**

Create `client/src/components/layout/LanguageSwitcher.jsx`:

```jsx
import { useTranslation } from 'react-i18next'

const LANGS = ['it', 'en', 'fr', 'de']

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language?.slice(0, 2) ?? 'it'

  return (
    <div className="flex gap-0.5 bg-[#1A2F4A] rounded-md p-0.5">
      {LANGS.map(lang => (
        <button
          key={lang}
          onClick={() => i18n.changeLanguage(lang)}
          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
            current === lang
              ? 'bg-blue-electric text-navy'
              : 'text-slate-light hover:text-white'
          }`}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Update Navbar to include LanguageSwitcher and Type 1 strings**

Replace the full content of `client/src/components/layout/Navbar.jsx` with:

```jsx
import { Layers, Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isMsalConfigured } from '../../auth/msalInstance.js'
import AuthSection from './AuthSection.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'

function openPreview() {
  window.open('/?mode=preview', 'shareflow-preview')
}

export default function Navbar({ onDeployClick }) {
  const { t } = useTranslation()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-navy flex items-center justify-between px-6 border-b border-slate">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-electric">
          <Layers size={18} className="text-navy" />
        </div>
        <div>
          <span className="text-white font-semibold text-sm tracking-wide">ShareFlow</span>
          <span className="text-slate-light text-xs ml-2 hidden md:inline">
            {t('navbar.tagline')}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isMsalConfigured ? <AuthSection /> : (
          <span className="text-xs text-slate-light bg-slate px-3 py-1 rounded-full border border-slate-mid">
            {t('navbar.tenant')}
          </span>
        )}
        <LanguageSwitcher />
        <button
          onClick={openPreview}
          className="flex items-center gap-2 text-slate-light hover:text-white border border-slate-mid hover:border-slate text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          <Eye size={14} />
          {t('navbar.preview')}
        </button>
        <button
          onClick={onDeployClick}
          className="flex items-center gap-2 bg-blue-electric hover:bg-blue text-navy font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {t('navbar.deploy')}
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 5: Add addInitScript to smoke test beforeEach**

In `client/tests/smoke.spec.js`, find and replace the `beforeEach` block:

Replace:
```js
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })
```

With:
```js
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'it'))
    await page.goto('/')
  })
```

`addInitScript` runs before any page scripts — i18next reads `i18nextLng` = 'it' from localStorage on init, keeping all existing Italian-or-mixed string selectors stable.

- [ ] **Step 6: Run existing smoke tests — must still pass**

Run from `client/`:
```
npm run test:e2e
```

Expected: 19 passed, 0 failed.

- [ ] **Step 7: Commit**

```bash
git add client/src/hooks/useLang.js client/src/utils/localizedText.js client/src/components/layout/LanguageSwitcher.jsx client/src/components/layout/Navbar.jsx client/tests/smoke.spec.js
git commit -m "feat(i18n): add useLang, t2, LanguageSwitcher; update Navbar; fix test fixture"
```

---

## Task 3: Reducer Migration + Type 2 Components

**Files:**
- Modify: `client/src/context/configuratorReducer.js`
- Modify: `client/src/components/canvas/HeroBanner.jsx`
- Modify: `client/src/components/canvas/CanvasTopNav.jsx`
- Modify: `client/src/components/canvas/MegaMenuPanel.jsx`
- Modify: `client/src/components/sidebar-left/PageTreeItem.jsx`
- Modify: `client/src/components/sidebar-left/AppearancePanel.jsx`

- [ ] **Step 1: Update configuratorReducer.js**

In `client/src/context/configuratorReducer.js`, make three changes:

**Change 1 — initialState:** Replace `siteName` and the first page's `title`:

Replace:
```js
export const initialState = {
  pages: [
    {
      pageId: 'page-home',
      title: 'Home',
```

With:
```js
export const initialState = {
  pages: [
    {
      pageId: 'page-home',
      title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' },
```

Replace:
```js
  tenantConfiguration: {
    tenantId: null,
    siteName: 'My Corporate Intranet',
```

With:
```js
  tenantConfiguration: {
    tenantId: null,
    siteName: { it: 'My Corporate Intranet', en: 'My Corporate Intranet', fr: 'My Corporate Intranet', de: 'My Corporate Intranet' },
```

**Change 2 — ADD_PAGE:** Replace the hardcoded title string with an object:

Replace:
```js
      const title = 'Nuova pagina'
      const newPage = {
        pageId: crypto.randomUUID(),
        title,
        slug: uniqueSlug(state.pages, slugify(title)),
```

With:
```js
      const titleObj = { it: 'Nuova pagina', en: 'New page', fr: 'Nouvelle page', de: 'Neue Seite' }
      const newPage = {
        pageId: crypto.randomUUID(),
        title: titleObj,
        slug: uniqueSlug(state.pages, slugify(titleObj.it)),
```

**Change 3 — RENAME_PAGE:** Replace the entire case:

Replace:
```js
    case ACTIONS.RENAME_PAGE: {
      const { pageId, title } = action.payload
      const trimmed = title.trim()
      if (!trimmed) return state
      const slug = uniqueSlug(state.pages, slugify(trimmed), pageId)
      return {
        ...state,
        pages: state.pages.map(p => p.pageId === pageId ? { ...p, title: trimmed, slug } : p),
      }
    }
```

With:
```js
    case ACTIONS.RENAME_PAGE: {
      const { pageId, lang, title } = action.payload
      const trimmed = title.trim()
      if (!trimmed) return state
      return {
        ...state,
        pages: state.pages.map(p => {
          if (p.pageId !== pageId) return p
          const current = typeof p.title === 'string'
            ? { it: p.title, en: p.title, fr: p.title, de: p.title }
            : p.title
          const newTitle = { ...current, [lang]: trimmed }
          const slug = uniqueSlug(state.pages, slugify(newTitle.it ?? trimmed), pageId)
          return { ...p, title: newTitle, slug }
        }),
      }
    }
```

- [ ] **Step 2: Update HeroBanner.jsx**

Replace the full content of `client/src/components/canvas/HeroBanner.jsx` with:

```jsx
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { findPage } from '../../context/pageHelpers.js'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'

export default function HeroBanner() {
  const { state } = useConfigurator()
  const { template } = useTheme()
  const lang = useLang()
  const activePage = findPage(state.pages, state.activePageId)

  return (
    <div className={`mb-4 rounded-2xl px-5 py-6 ${template.hero.wrapper}`}>
      <div className={`text-[10px] font-semibold uppercase tracking-widest ${template.hero.eyebrow}`}>
        {t2(state.tenantConfiguration.siteName, lang)}
      </div>
      <div className={`text-xl font-bold mt-1 ${template.hero.title}`}>
        {t2(activePage.title, lang)}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update CanvasTopNav.jsx**

Replace the full content of `client/src/components/canvas/CanvasTopNav.jsx` with:

```jsx
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { buildPageTree } from '../../context/pageHelpers.js'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'
import MegaMenuPanel from './MegaMenuPanel.jsx'

function isInSubtree(node, pageId) {
  return node.pageId === pageId || node.children.some(child => isInSubtree(child, pageId))
}

export default function CanvasTopNav() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { template } = useTheme()
  const lang = useLang()
  const [closedRootId, setClosedRootId] = useState(null)
  const tree = buildPageTree(state.pages)
  const activeRoot = tree.find(root => isInSubtree(root, state.activePageId))
  if (!activeRoot) return null
  const openRoot = activeRoot && activeRoot.children.length > 0 && activeRoot.pageId !== closedRootId
    ? activeRoot
    : null

  function select(pageId) {
    dispatch({ type: ACTIONS.SELECT_PAGE, payload: { pageId } })
  }

  function handleRootClick(root) {
    if (root.pageId !== activeRoot.pageId) {
      select(root.pageId)
      if (closedRootId === root.pageId) setClosedRootId(null)
    } else if (state.activePageId !== root.pageId) {
      select(root.pageId)
    } else {
      setClosedRootId(prev => (prev === root.pageId ? null : root.pageId))
    }
  }

  return (
    <div className={`mb-4 ${template.nav.wrapper}`}>
      <nav className="flex gap-1 overflow-x-auto">
        {tree.map(page => (
          <button
            key={page.pageId}
            onClick={() => handleRootClick(page)}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors
              ${activeRoot.pageId === page.pageId ? template.nav.tabActive : template.nav.tabInactive}`}
          >
            {t2(page.title, lang)}
            {page.children.length > 0 && (
              openRoot?.pageId === page.pageId ? <ChevronUp size={12} /> : <ChevronDown size={12} />
            )}
          </button>
        ))}
      </nav>
      {openRoot && (
        <MegaMenuPanel node={openRoot} activePageId={state.activePageId} onSelect={select} template={template} lang={lang} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Update MegaMenuPanel.jsx**

Replace the full content of `client/src/components/canvas/MegaMenuPanel.jsx` with:

```jsx
import { t2 } from '../../utils/localizedText.js'

export default function MegaMenuPanel({ node, activePageId, onSelect, template, lang }) {
  return (
    <div className={`px-3 py-3 ${template.nav.megaMenu}`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {node.children.map(child => (
          <MegaMenuColumn key={child.pageId} node={child} activePageId={activePageId} onSelect={onSelect} template={template} lang={lang} />
        ))}
      </div>
    </div>
  )
}

function MegaMenuColumn({ node, activePageId, onSelect, template, lang }) {
  const isActive = node.pageId === activePageId
  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => onSelect(node.pageId)}
        title={t2(node.title, lang)}
        className={`block w-full truncate text-left text-xs font-semibold transition-colors
          ${isActive ? template.nav.megaMenuActive : template.nav.megaMenuInactive}`}
      >
        {t2(node.title, lang)}
      </button>
      {node.children.length > 0 && (
        <ul className={`mt-1.5 space-y-1 border-l pl-2 ${template.nav.megaMenuBorder}`}>
          {node.children.map(grandchild => (
            <MegaMenuItem key={grandchild.pageId} node={grandchild} activePageId={activePageId} onSelect={onSelect} template={template} lang={lang} />
          ))}
        </ul>
      )}
    </div>
  )
}

function MegaMenuItem({ node, activePageId, onSelect, template, lang }) {
  const isActive = node.pageId === activePageId
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={() => onSelect(node.pageId)}
        title={t2(node.title, lang)}
        className={`block w-full truncate text-left text-xs transition-colors
          ${isActive ? `${template.nav.megaMenuActive} font-semibold` : template.nav.megaMenuInactive}`}
      >
        {t2(node.title, lang)}
      </button>
      {node.children.length > 0 && (
        <ul className={`mt-1.5 space-y-1 border-l pl-2 ${template.nav.megaMenuBorder}`}>
          {node.children.map(greatGrandchild => (
            <MegaMenuItem key={greatGrandchild.pageId} node={greatGrandchild} activePageId={activePageId} onSelect={onSelect} template={template} lang={lang} />
          ))}
        </ul>
      )}
    </li>
  )
}
```

- [ ] **Step 5: Update PageTreeItem.jsx**

Replace the full content of `client/src/components/sidebar-left/PageTreeItem.jsx` with:

```jsx
import { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'

export const INDENT_WIDTH = 20

export default function PageTreeItem({ page, depth, isActive, hasChildren, expanded, onToggleExpand }) {
  const { dispatch, ACTIONS } = useConfigurator()
  const lang = useLang()
  const [editing, setEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(t2(page.title, lang))

  useEffect(() => {
    if (!editing) setTitleDraft(t2(page.title, lang))
  }, [page.title, lang, editing])

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.pageId,
    data: { type: 'page-tree-item' },
  })

  const style = {
    paddingLeft: depth * INDENT_WIDTH + 8,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  function commitRename() {
    setEditing(false)
    const trimmed = titleDraft.trim()
    const currentLangTitle = t2(page.title, lang)
    if (trimmed && trimmed !== currentLangTitle) {
      dispatch({ type: ACTIONS.RENAME_PAGE, payload: { pageId: page.pageId, lang, title: trimmed } })
    } else {
      setTitleDraft(currentLangTitle)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1 pr-2 py-1.5 rounded-lg cursor-pointer transition-colors
        ${isActive ? 'bg-blue/10 border border-blue/30' : 'border border-transparent hover:bg-slate-mid'}`}
      onClick={() => dispatch({ type: ACTIONS.SELECT_PAGE, payload: { pageId: page.pageId } })}
    >
      <button
        {...listeners}
        {...attributes}
        onClick={e => e.stopPropagation()}
        className="text-slate-light opacity-0 group-hover:opacity-100 hover:text-white cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical size={14} />
      </button>

      {hasChildren ? (
        <button
          onClick={e => { e.stopPropagation(); onToggleExpand() }}
          className="text-slate-light hover:text-white"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      ) : (
        <span className="w-3.5" />
      )}

      {editing ? (
        <input
          autoFocus
          value={titleDraft}
          onChange={e => setTitleDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') { setTitleDraft(t2(page.title, lang)); setEditing(false) }
          }}
          onClick={e => e.stopPropagation()}
          className="flex-1 bg-slate-mid text-white text-xs px-1.5 py-0.5 rounded border border-blue-electric focus:outline-none min-w-0"
        />
      ) : (
        <span
          onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
          className={`flex-1 text-xs truncate ${isActive ? 'text-white font-medium' : 'text-slate-light'}`}
        >
          {t2(page.title, lang)}
        </span>
      )}

      <button
        onClick={e => { e.stopPropagation(); dispatch({ type: ACTIONS.ADD_PAGE, payload: { parentId: page.pageId } }) }}
        className="text-slate-light opacity-0 group-hover:opacity-100 hover:text-blue-electric transition-opacity"
        title="Aggiungi sottopagina"
      >
        <Plus size={12} />
      </button>

      <button
        disabled={hasChildren}
        onClick={e => { e.stopPropagation(); dispatch({ type: ACTIONS.REMOVE_PAGE, payload: { pageId: page.pageId } }) }}
        className={`opacity-0 group-hover:opacity-100 transition-opacity ${hasChildren ? 'text-slate-mid cursor-not-allowed' : 'text-slate-light hover:text-red-400'}`}
        title={hasChildren ? 'Elimina prima le sottopagine' : 'Elimina pagina'}
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Update AppearancePanel.jsx — add siteName editor and translate labels**

Replace the full content of `client/src/components/sidebar-left/AppearancePanel.jsx` with:

```jsx
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { THEME_TEMPLATES } from '../../data/themeTemplates.js'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'

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
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-light mb-2">
          {t('appearance.siteNameLabel', { lang: lang.toUpperCase() })}
        </h3>
        <input
          type="text"
          value={t2(state.tenantConfiguration.siteName, lang)}
          onChange={e => handleSiteNameChange(e.target.value)}
          className="w-full bg-slate-mid text-white text-xs px-2.5 py-1.5 rounded border border-slate-mid focus:border-blue-electric focus:outline-none"
        />
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-light mb-2">
          {t('appearance.template')}
        </h3>
        <div className="space-y-2">
          {THEME_TEMPLATES.map(tmpl => (
            <button
              key={tmpl.id}
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
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-light mb-2">
          {t('appearance.brandColor')}
        </h3>
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

- [ ] **Step 7: Run smoke tests — must still pass**

Run from `client/`:
```
npm run test:e2e
```

Expected: 19 passed, 0 failed. The `beforeEach` addInitScript forces IT locale; all existing selectors still match.

- [ ] **Step 8: Commit**

```bash
git add client/src/context/configuratorReducer.js client/src/components/canvas/HeroBanner.jsx client/src/components/canvas/CanvasTopNav.jsx client/src/components/canvas/MegaMenuPanel.jsx client/src/components/sidebar-left/PageTreeItem.jsx client/src/components/sidebar-left/AppearancePanel.jsx
git commit -m "feat(i18n): migrate Type 2 state to multilang objects; update all display/edit components"
```

---

## Task 4: Type 1 — Block Library Panel

**Files:**
- Modify: `client/src/components/sidebar-left/BlockCard.jsx`
- Modify: `client/src/components/sidebar-left/CategoryGroup.jsx`
- Modify: `client/src/components/sidebar-left/BlockLibrary.jsx`

- [ ] **Step 1: Update BlockCard.jsx**

Replace the full content of `client/src/components/sidebar-left/BlockCard.jsx` with:

```jsx
import * as icons from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'

export default function BlockCard({ block }) {
  const { dispatch, ACTIONS } = useConfigurator()
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog-${block.id}`,
    data: { type: 'catalog-block', blockId: block.id },
  })

  const Icon = icons[block.icon] ?? icons.Box

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => dispatch({ type: ACTIONS.ADD_WIDGET, payload: { blockId: block.id } })}
      className={`
        flex flex-col items-center gap-1.5 p-3 rounded-lg border cursor-grab active:cursor-grabbing
        bg-slate-mid border-slate-mid hover:border-blue-electric hover:bg-navy-light
        transition-all select-none text-center
        ${isDragging ? 'opacity-40 scale-95' : ''}
      `}
    >
      <Icon size={20} className="text-blue-electric flex-shrink-0" />
      <span className="text-xs text-slate-light leading-tight">
        {t(`blocks.labels.${block.id}`, { defaultValue: block.label })}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Update CategoryGroup.jsx**

Replace the full content of `client/src/components/sidebar-left/CategoryGroup.jsx` with:

```jsx
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import BlockCard from './BlockCard.jsx'

export default function CategoryGroup({ category, blocks }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-1">
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
      {open && (
        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
          {blocks.map(block => <BlockCard key={block.id} block={block} />)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update BlockLibrary.jsx**

Replace the full content of `client/src/components/sidebar-left/BlockLibrary.jsx` with:

```jsx
import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { blockCatalog, CATEGORIES } from '../../data/blockCatalog.js'
import CategoryGroup from './CategoryGroup.jsx'

export default function BlockLibrary() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return q ? blockCatalog.filter(b => b.label.toLowerCase().includes(q)) : blockCatalog
  }, [query])

  const grouped = useMemo(() => {
    return Object.values(CATEGORIES).map(cat => ({
      category: cat,
      blocks: filtered.filter(b => b.category === cat),
    })).filter(g => g.blocks.length > 0)
  }, [filtered])

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-mid">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-light" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('blocks.search')}
            className="w-full bg-slate-mid text-white text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-mid focus:border-blue-electric focus:outline-none placeholder-slate-light"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {grouped.map(({ category, blocks }) => (
          <CategoryGroup key={category} category={category} blocks={blocks} />
        ))}
        {grouped.length === 0 && (
          <p className="text-slate-light text-xs text-center py-8">
            {t('blocks.noResults', { query })}
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run smoke tests — must still pass**

Run from `client/`:
```
npm run test:e2e
```

Expected: 19 passed. The IT locale preserves `"Search blocks…"`, `"Communication"`, `"News - Corporate"`, `"Procedure"` — all tested selectors are unchanged.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/sidebar-left/BlockCard.jsx client/src/components/sidebar-left/CategoryGroup.jsx client/src/components/sidebar-left/BlockLibrary.jsx
git commit -m "feat(i18n): localize block library panel (BlockCard, CategoryGroup, BlockLibrary)"
```

---

## Task 5: Type 1 — Canvas Area

**Files:**
- Modify: `client/src/components/canvas/CanvasDropZone.jsx`
- Modify: `client/src/components/canvas/CanvasSection.jsx`
- Modify: `client/src/components/canvas/CanvasColumn.jsx`
- Modify: `client/src/components/canvas/CanvasBlock.jsx`
- Modify: `client/src/components/canvas/CanvasBlockPreview.jsx`

- [ ] **Step 1: Update CanvasDropZone.jsx**

Replace the full content of `client/src/components/canvas/CanvasDropZone.jsx` with:

```jsx
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { findPage } from '../../context/pageHelpers.js'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'
import CanvasSection from './CanvasSection.jsx'
import SectionLayoutPicker from './SectionLayoutPicker.jsx'
import CanvasTopNav from './CanvasTopNav.jsx'
import { useTheme } from '../../hooks/useTheme.js'
import HeroBanner from './HeroBanner.jsx'

export default function CanvasDropZone() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { accentColor } = useTheme()
  const { t } = useTranslation()
  const lang = useLang()
  const [addPickerOpen, setAddPickerOpen] = useState(false)
  const activePage = findPage(state.pages, state.activePageId)

  return (
    <div className="min-h-full p-6">
      <div className="max-w-2xl mx-auto" style={{ '--theme-accent': accentColor }}>
        <CanvasTopNav />
        <HeroBanner />

        <div className="mb-4">
          <h2 className="text-navy font-semibold text-sm uppercase tracking-widest">{t('canvas.preview')}</h2>
          <p className="text-slate text-xs mt-0.5">SharePoint Communication Site — {t2(activePage.title, lang)}</p>
        </div>

        <div className="min-h-96 rounded-2xl border-2 border-dashed border-slate-mid bg-white p-4">
          {activePage.sections.map(section => (
            <CanvasSection key={section.sectionId} section={section} />
          ))}

          <div className="relative flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setAddPickerOpen(o => !o)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-light hover:text-blue border border-dashed border-slate-mid hover:border-blue rounded-lg px-3 py-1.5 transition-colors"
            >
              <Plus size={14} /> {t('canvas.addSection')}
            </button>
            {addPickerOpen && (
              <div className="absolute top-full mt-2 z-20">
                <SectionLayoutPicker
                  onSelect={key => {
                    dispatch({ type: ACTIONS.ADD_SECTION, payload: { layout: key } })
                    setAddPickerOpen(false)
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update CanvasSection.jsx**

In `client/src/components/canvas/CanvasSection.jsx`, add `useTranslation` import and replace the two `title` attributes:

Replace:
```jsx
import { useState } from 'react'
import { LayoutGrid, Trash2 } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { SECTION_LAYOUTS } from '../../data/sectionLayouts.js'
import CanvasColumn from './CanvasColumn.jsx'
import SectionLayoutPicker from './SectionLayoutPicker.jsx'
```

With:
```jsx
import { useState } from 'react'
import { LayoutGrid, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { SECTION_LAYOUTS } from '../../data/sectionLayouts.js'
import CanvasColumn from './CanvasColumn.jsx'
import SectionLayoutPicker from './SectionLayoutPicker.jsx'
```

Inside the component, add `const { t } = useTranslation()` right after `const [pickerOpen, setPickerOpen] = useState(false)`:

Replace:
```jsx
  const [pickerOpen, setPickerOpen] = useState(false)

  const layout = SECTION_LAYOUTS[section.layout]
```

With:
```jsx
  const [pickerOpen, setPickerOpen] = useState(false)
  const { t } = useTranslation()

  const layout = SECTION_LAYOUTS[section.layout]
```

Replace:
```jsx
          title="Cambia layout sezione"
```

With:
```jsx
          title={t('canvas.changeLayout')}
```

Replace:
```jsx
            title="Elimina sezione"
```

With:
```jsx
            title={t('canvas.deleteSection')}
```

- [ ] **Step 3: Update CanvasColumn.jsx**

In `client/src/components/canvas/CanvasColumn.jsx`, add `useTranslation` and replace the drop hint:

Replace:
```jsx
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { blockById } from '../../data/blockCatalog.js'
import CanvasBlock from './CanvasBlock.jsx'
import CanvasBlockPreview from './CanvasBlockPreview.jsx'
```

With:
```jsx
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useTranslation } from 'react-i18next'
import { blockById } from '../../data/blockCatalog.js'
import CanvasBlock from './CanvasBlock.jsx'
import CanvasBlockPreview from './CanvasBlockPreview.jsx'
```

Add `const { t } = useTranslation()` inside the non-readOnly path, right after the droppable hook:

Replace:
```jsx
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.columnId}`,
    data: { type: 'column' },
  })

  return (
```

With:
```jsx
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.columnId}`,
    data: { type: 'column' },
  })
  const { t } = useTranslation()

  return (
```

Replace:
```jsx
            Trascina qui un blocco
```

With:
```jsx
            {t('canvas.dropHere')}
```

- [ ] **Step 4: Update CanvasBlock.jsx**

In `client/src/components/canvas/CanvasBlock.jsx`, add `useTranslation` import and replace the two Italian strings:

Replace:
```jsx
import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X, GripVertical, ArrowRightLeft } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { blockById } from '../../data/blockCatalog.js'
import { findPage } from '../../context/pageHelpers.js'
import CanvasBlockPreview from './CanvasBlockPreview.jsx'
```

With:
```jsx
import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X, GripVertical, ArrowRightLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { blockById } from '../../data/blockCatalog.js'
import { findPage } from '../../context/pageHelpers.js'
import CanvasBlockPreview from './CanvasBlockPreview.jsx'
```

Add `const { t } = useTranslation()` right after `const block = blockById[widget.blockId]`:

Replace:
```jsx
  const block = blockById[widget.blockId]
  const isSelected = state.selectedWidgetInstanceId === widget.instanceId
```

With:
```jsx
  const block = blockById[widget.blockId]
  const { t } = useTranslation()
  const isSelected = state.selectedWidgetInstanceId === widget.instanceId
```

Replace:
```jsx
      label: `Sezione ${si + 1} · Colonna ${ci + 1}`,
```

With:
```jsx
      label: t('canvas.sectionCol', { section: si + 1, col: ci + 1 }),
```

Replace:
```jsx
          <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Sposta in</p>
```

With:
```jsx
          <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{t('canvas.moveTo')}</p>
```

- [ ] **Step 5: Update CanvasBlockPreview.jsx — Header component**

In `client/src/components/canvas/CanvasBlockPreview.jsx`, add the `useTranslation` import and update the `Header` internal component:

Replace:
```jsx
import * as icons from 'lucide-react'
import { useTheme } from '../../hooks/useTheme.js'
```

With:
```jsx
import * as icons from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../hooks/useTheme.js'
```

Replace the entire `Header` function:

```jsx
function Header({ template, block, Icon, showSeeAll = true }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={16} className={`${template.card.accentText} flex-shrink-0`} />
        <span className={`text-sm font-semibold truncate ${template.card.text}`}>{block.label}</span>
      </div>
      {showSeeAll && (
        <span className={`text-xs font-medium flex-shrink-0 ${template.card.accentText}`}>See all</span>
      )}
    </div>
  )
}
```

With:

```jsx
function Header({ template, block, Icon, showSeeAll = true }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={16} className={`${template.card.accentText} flex-shrink-0`} />
        <span className={`text-sm font-semibold truncate ${template.card.text}`}>
          {t(`blocks.labels.${block.id}`, { defaultValue: block.label })}
        </span>
      </div>
      {showSeeAll && (
        <span className={`text-xs font-medium flex-shrink-0 ${template.card.accentText}`}>
          {t('blocks.seeAll')}
        </span>
      )}
    </div>
  )
}
```

Also update the countdown "giorni" string. Find:

```jsx
              <span className="text-xs text-white/70">giorni</span>
```

Replace with:

```jsx
              <span className="text-xs text-white/70">{t('blocks.days')}</span>
```

(This requires adding `const { t } = useTranslation()` inside the `CanvasBlockPreview` default export function. It is already called `t` inside `Header`, but the default export is a separate function. Add it there too.)

In the `export default function CanvasBlockPreview` body, right after `const Icon = icons[block.icon] ?? icons.Box`:

Replace:
```jsx
export default function CanvasBlockPreview({ block, width = 'full', contentItems = [] }) {
  const { template } = useTheme()
  const Icon = icons[block.icon] ?? icons.Box
```

With:
```jsx
export default function CanvasBlockPreview({ block, width = 'full', contentItems = [] }) {
  const { template } = useTheme()
  const { t } = useTranslation()
  const Icon = icons[block.icon] ?? icons.Box
```

- [ ] **Step 6: Run smoke tests — must still pass**

Run from `client/`:
```
npm run test:e2e
```

Expected: 19 passed.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/canvas/CanvasDropZone.jsx client/src/components/canvas/CanvasSection.jsx client/src/components/canvas/CanvasColumn.jsx client/src/components/canvas/CanvasBlock.jsx client/src/components/canvas/CanvasBlockPreview.jsx
git commit -m "feat(i18n): localize canvas area components"
```

---

## Task 6: Type 1 — Properties Sidebar

**Files:**
- Modify: `client/src/components/sidebar-right/PropertiesPanel.jsx`
- Modify: `client/src/components/sidebar-right/EmptyState.jsx`
- Modify: `client/src/components/sidebar-right/SourceSelector.jsx`
- Modify: `client/src/components/sidebar-right/ContentPanel.jsx`

- [ ] **Step 1: Update PropertiesPanel.jsx**

Replace the full content of `client/src/components/sidebar-right/PropertiesPanel.jsx` with:

```jsx
import { useState, useEffect } from 'react'
import * as icons from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { blockById } from '../../data/blockCatalog.js'
import { findWidget } from '../../context/sectionHelpers.js'
import { findPage } from '../../context/pageHelpers.js'
import EmptyState from './EmptyState.jsx'
import ScopeSelector from './ScopeSelector.jsx'
import ToggleField from './ToggleField.jsx'
import SectionPropertiesPanel from './SectionPropertiesPanel.jsx'
import ContentPanel from './ContentPanel.jsx'

function InstanceIdSection({ instanceId }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-6 pt-4 border-t border-slate-mid">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-slate-light font-medium uppercase tracking-wider hover:text-white transition-colors w-full"
      >
        <icons.ChevronRight size={12} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
        Instance ID
      </button>
      {open && (
        <code className="mt-2 block text-xs text-slate-light font-mono break-all">{instanceId}</code>
      )}
    </div>
  )
}

export default function PropertiesPanel() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { t } = useTranslation()
  const { selectedWidgetInstanceId, selectedSectionId } = state
  const activePage = findPage(state.pages, state.activePageId)
  const [activeTab, setActiveTab] = useState('props')

  useEffect(() => { setActiveTab('props') }, [selectedWidgetInstanceId])

  if (selectedSectionId) {
    return <SectionPropertiesPanel sectionId={selectedSectionId} />
  }

  const widget = findWidget(activePage.sections, selectedWidgetInstanceId)
  const block  = widget ? blockById[widget.blockId] : null

  if (!widget || !block) return <EmptyState />

  const Icon = icons[block.icon] ?? icons.Box
  const hasContentTab = block.contentSourceTypes != null

  function updateProp(key, value) {
    dispatch({ type: ACTIONS.UPDATE_WIDGET_PROP, payload: { instanceId: widget.instanceId, key, value } })
  }

  return (
    <div key={widget.instanceId} className="p-4">
      <div className="flex items-center gap-3 mb-1 pb-4 border-b border-slate-mid">
        <div className="w-9 h-9 rounded-lg bg-blue/20 flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-blue-electric" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white leading-tight">
            {t(`blocks.labels.${block.id}`, { defaultValue: block.label })}
          </h3>
          <span className="text-xs text-slate-light">
            {t(`blocks.categories.${block.category}`)}
          </span>
        </div>
      </div>

      {hasContentTab && (
        <div className="flex border-b border-slate-mid mb-4 mt-3">
          <button
            onClick={() => setActiveTab('props')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'props'
                ? 'text-white border-b-2 border-blue-electric -mb-px'
                : 'text-slate-light hover:text-white'
            }`}
          >
            {t('props.properties')}
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'content'
                ? 'text-white border-b-2 border-blue-electric -mb-px'
                : 'text-slate-light hover:text-white'
            }`}
          >
            {t('props.content')}
          </button>
        </div>
      )}

      {activeTab === 'props' && (
        <div className="mt-4 space-y-5">
          {block.configurableProps.map(key => {
            if (key === 'scope') {
              return (
                <ScopeSelector
                  key={key}
                  value={widget.props.scope}
                  onChange={v => updateProp('scope', v)}
                />
              )
            }
            return (
              <ToggleField
                key={key}
                label={t(`props.${key}`, { defaultValue: key })}
                value={widget.props[key]}
                onChange={v => updateProp(key, v)}
              />
            )
          })}
        </div>
      )}

      {activeTab === 'content' && hasContentTab && (
        <ContentPanel widget={widget} block={block} />
      )}

      {activeTab === 'props' && (
        <InstanceIdSection instanceId={widget.instanceId} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update EmptyState.jsx**

Replace the full content of `client/src/components/sidebar-right/EmptyState.jsx` with:

```jsx
import { MousePointerClick } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-6 py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-slate-mid flex items-center justify-center">
        <MousePointerClick size={22} className="text-slate-light" />
      </div>
      <p className="text-sm font-medium text-white">{t('props.noSelection')}</p>
      <p className="text-xs text-slate-light">{t('props.noSelectionHint')}</p>
    </div>
  )
}
```

- [ ] **Step 3: Update SourceSelector.jsx**

Replace the full content of `client/src/components/sidebar-right/SourceSelector.jsx` with:

```jsx
import { useTranslation } from 'react-i18next'
import { SOURCE_TYPE_LABELS } from '../../data/blockContentSchemas.js'

export default function SourceSelector({ sourceTypes, value, onChange }) {
  const { t } = useTranslation()
  const isManual = value.type === 'manual'

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-light">
        {t('content.dataSource')}
      </p>

      {sourceTypes.length > 1 && (
        <div className="flex gap-1">
          {sourceTypes.map(type => (
            <button
              key={type}
              onClick={() => onChange({ ...value, type })}
              className={`flex-1 text-center py-1 px-1 rounded text-[10px] font-medium transition-colors ${
                value.type === type
                  ? 'bg-blue text-white'
                  : 'bg-slate text-slate-light hover:text-white'
              }`}
            >
              {t(`source.${type}`, { defaultValue: SOURCE_TYPE_LABELS[type] })}
            </button>
          ))}
        </div>
      )}

      {sourceTypes.length === 1 && (
        <p className="text-xs text-slate-light">
          {t(`source.${sourceTypes[0]}`, { defaultValue: SOURCE_TYPE_LABELS[sourceTypes[0]] })}
        </p>
      )}

      {isManual ? (
        <div className="bg-blue/10 border border-blue/20 rounded p-2 text-xs text-blue-electric">
          {t('content.manualBanner')}
        </div>
      ) : (
        <div>
          <label className="text-[10px] text-slate-light block mb-1">{t('content.urlLabel')}</label>
          <input
            type="url"
            value={value.url}
            onChange={e => onChange({ ...value, url: e.target.value })}
            placeholder={t(`source.placeholder_${value.type}`, {
              defaultValue:
                value.type === 'sharepoint-list'
                  ? 'https://tenant.sharepoint.com/sites/.../Lists/...'
                  : value.type === 'rss'
                  ? 'https://example.com/feed.xml'
                  : 'https://api.example.com/endpoint',
            })}
            className="w-full text-xs bg-slate border border-slate-mid rounded px-2 py-1.5 text-white placeholder-slate-mid focus:outline-none focus:border-blue"
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Update ContentPanel.jsx**

Replace the full content of `client/src/components/sidebar-right/ContentPanel.jsx` with:

```jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { BLOCK_CONTENT_DEFS } from '../../data/blockContentSchemas.js'
import SourceSelector from './SourceSelector.jsx'
import ContentItemForm from './ContentItemForm.jsx'

export default function ContentPanel({ widget, block }) {
  const { dispatch, ACTIONS } = useConfigurator()
  const { t } = useTranslation()
  const [editingIndex, setEditingIndex] = useState(null)

  const def = BLOCK_CONTENT_DEFS[block.id]
  const schema = def?.schema ?? []

  const contentSource = widget.props.contentSource ?? { type: def.sourceTypes[0], url: '', params: {} }
  const contentItems  = widget.props.contentItems  ?? []

  function updateSource(newSource) {
    dispatch({ type: ACTIONS.UPDATE_WIDGET_PROP, payload: { instanceId: widget.instanceId, key: 'contentSource', value: newSource } })
  }

  function updateItems(newItems) {
    dispatch({ type: ACTIONS.UPDATE_WIDGET_PROP, payload: { instanceId: widget.instanceId, key: 'contentItems', value: newItems } })
  }

  function saveItem(item) {
    if (editingIndex === -1) {
      updateItems([...contentItems, item])
    } else {
      updateItems(contentItems.map((it, i) => i === editingIndex ? item : it))
    }
    setEditingIndex(null)
  }

  function removeItem(index) {
    updateItems(contentItems.filter((_, i) => i !== index))
    if (editingIndex === index) setEditingIndex(null)
  }

  const isManual = contentSource.type === 'manual'
  const sectionLabel = isManual ? t('content.sectionTitle') : t('content.sectionTitleSample')

  function itemLabel(item) {
    return item.title || item.name || item.question || Object.values(item).find(v => typeof v === 'string' && v.trim()) || '—'
  }

  return (
    <div className="space-y-4">
      <SourceSelector
        sourceTypes={block.contentSourceTypes}
        value={contentSource}
        onChange={updateSource}
      />

      <div className="border-t border-slate-mid pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-light flex items-center gap-2">
            {sectionLabel}
            {isManual && (
              <span className="bg-green-600 text-white text-[9px] rounded px-1.5 py-0.5 font-bold normal-case tracking-normal">
                {t('content.production')}
              </span>
            )}
          </span>
          {editingIndex === null && (
            <button
              onClick={() => setEditingIndex(-1)}
              className="text-[10px] bg-blue text-white rounded px-2 py-0.5 hover:bg-blue/80 transition-colors"
            >
              {t('content.add')}
            </button>
          )}
        </div>

        {!isManual && contentSource.url === '' && contentItems.length === 0 && editingIndex === null && (
          <p className="text-[10px] text-slate-light italic mb-3">
            {t('content.urlHint')}
          </p>
        )}

        {contentItems.map((item, i) =>
          editingIndex === i ? (
            <ContentItemForm
              key={i}
              schema={schema}
              item={item}
              onSave={saveItem}
              onCancel={() => setEditingIndex(null)}
            />
          ) : (
            <div
              key={i}
              className="border border-slate-mid rounded px-3 py-2 mb-1.5 flex items-center gap-2"
            >
              <span className="text-xs text-white truncate flex-1">{itemLabel(item)}</span>
              <button
                onClick={() => setEditingIndex(i)}
                className="text-slate-light hover:text-white text-xs flex-shrink-0 transition-colors"
                title="Modifica"
              >✎</button>
              <button
                onClick={() => removeItem(i)}
                className="text-slate-light hover:text-red-400 text-xs flex-shrink-0 transition-colors"
                title="Rimuovi"
              >✕</button>
            </div>
          )
        )}

        {editingIndex === -1 && (
          <ContentItemForm
            schema={schema}
            item={{}}
            onSave={saveItem}
            onCancel={() => setEditingIndex(null)}
          />
        )}

        {contentItems.length === 0 && editingIndex === null && (
          <button
            onClick={() => setEditingIndex(-1)}
            className="w-full border border-dashed border-slate-mid rounded p-2 text-xs text-slate-light hover:text-white hover:border-slate-light transition-colors"
          >
            {t('content.addItem')}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run smoke tests — must still pass**

Run from `client/`:
```
npm run test:e2e
```

Expected: 19 passed. IT locale strings `"No block selected"`, `"Visible"`, `"Comments enabled"` are preserved identically.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/sidebar-right/PropertiesPanel.jsx client/src/components/sidebar-right/EmptyState.jsx client/src/components/sidebar-right/SourceSelector.jsx client/src/components/sidebar-right/ContentPanel.jsx
git commit -m "feat(i18n): localize properties sidebar (PropertiesPanel, EmptyState, SourceSelector, ContentPanel)"
```

---

## Task 7: Type 1 — Pages Panel, Deploy Modal, Preview Toolbar

**Files:**
- Modify: `client/src/components/sidebar-left/PagesPanel.jsx`
- Modify: `client/src/components/deploy/DeployModal.jsx`
- Modify: `client/src/components/preview/PreviewToolbar.jsx`

- [ ] **Step 1: Update PagesPanel.jsx**

In `client/src/components/sidebar-left/PagesPanel.jsx`, add `useTranslation` import and replace the two hardcoded strings:

Replace:
```jsx
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
```

With:
```jsx
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
```

Inside `PagesPanel`, add `const { t } = useTranslation()` right after the sensors line:

Replace:
```jsx
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
```

With:
```jsx
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const { t } = useTranslation()
```

Replace:
```jsx
        <span className="text-xs font-semibold text-slate-light uppercase tracking-wider">Pagine</span>
        <button
          onClick={() => dispatch({ type: ACTIONS.ADD_PAGE, payload: { parentId: null } })}
          className="flex items-center gap-1 text-xs font-medium text-blue-electric hover:text-white transition-colors"
        >
          <Plus size={14} /> Aggiungi pagina
        </button>
```

With:
```jsx
        <span className="text-xs font-semibold text-slate-light uppercase tracking-wider">{t('pages.title')}</span>
        <button
          onClick={() => dispatch({ type: ACTIONS.ADD_PAGE, payload: { parentId: null } })}
          className="flex items-center gap-1 text-xs font-medium text-blue-electric hover:text-white transition-colors"
        >
          <Plus size={14} /> {t('pages.add')}
        </button>
```

- [ ] **Step 2: Update DeployModal.jsx**

Replace the full content of `client/src/components/deploy/DeployModal.jsx` with:

```jsx
import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Loader2, Circle, X, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { buildTenantExport } from '../../context/pageHelpers.js'
import { startProvisioning, getProvisioningStatus } from '../../lib/provisioningApi.js'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'

export default function DeployModal({ onClose }) {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { t } = useTranslation()
  const lang = useLang()
  const [jobId, setJobId] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [status, setStatus] = useState('running')
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const startedRef = useRef(false)

  const done = status === 'done'
  const failed = status === 'error'

  const STEPS = [
    { id: 1, label: t('deploy.step1') },
    { id: 2, label: t('deploy.step2') },
    { id: 3, label: t('deploy.step3') },
    { id: 4, label: t('deploy.step4') },
    { id: 5, label: t('deploy.step5') },
    { id: 6, label: t('deploy.step6') },
  ]

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    dispatch({ type: ACTIONS.EXPORT_CONFIGURATION })

    const tenantConfiguration = buildTenantExport(state.pages, state.tenantConfiguration)
    startProvisioning(tenantConfiguration)
      .then(({ jobId: newJobId }) => setJobId(newJobId))
      .catch(() => setStatus('error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!jobId || status !== 'running') return

    const interval = setInterval(async () => {
      try {
        const job = await getProvisioningStatus(jobId)
        setCurrentStep(job.currentStep)
        if (job.status === 'done') {
          setStatus('done')
          setResult(job.result)
        } else if (job.status === 'error') {
          setStatus('error')
          setErrorMessage(job.error)
        }
      } catch {
        setStatus('error')
      }
    }, 900)

    return () => clearInterval(interval)
  }, [jobId, status])

  const siteName = t2(state.tenantConfiguration.siteName, lang)

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate rounded-2xl border border-slate-mid w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-mid">
          <h2 className="text-white font-semibold">{t('deploy.title')}</h2>
          {(done || failed) && (
            <button onClick={onClose} className="text-slate-light hover:text-white transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {failed ? (
          <div className="p-5 space-y-3">
            <p className="text-sm text-red-400">
              {errorMessage ?? t('deploy.errorDefault')}
            </p>
            <button
              onClick={onClose}
              className="w-full py-2 rounded-lg bg-blue-electric text-navy font-semibold text-sm hover:bg-blue transition-colors"
            >
              {t('deploy.close')}
            </button>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-3">
              {STEPS.map((step, i) => {
                const stepStatus = i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending'
                return (
                  <div key={step.id} className="flex items-center gap-3">
                    {stepStatus === 'done'   && <CheckCircle2 size={18} className="text-blue-electric flex-shrink-0" />}
                    {stepStatus === 'active' && <Loader2 size={18} className="text-blue-electric animate-spin flex-shrink-0" />}
                    {stepStatus === 'pending'&& <Circle size={18} className="text-slate-mid flex-shrink-0" />}
                    <span className={`text-sm ${stepStatus === 'pending' ? 'text-slate-light' : 'text-white'}`}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>

            {done && (
              <div className="px-5 pb-5">
                <div className="bg-navy rounded-xl p-4 border border-blue/30">
                  <p className="text-xs text-slate-light mb-1">{t('deploy.siteReady')}</p>
                  <p className="text-white font-semibold text-sm mb-3">{siteName}</p>
                  <a
                    href={result?.siteUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-electric hover:underline"
                  >
                    {t('deploy.openInSharePoint')} <ExternalLink size={12} />
                  </a>
                </div>
                <button
                  onClick={onClose}
                  className="mt-3 w-full py-2 rounded-lg bg-blue-electric text-navy font-semibold text-sm hover:bg-blue transition-colors"
                >
                  {t('deploy.done')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update PreviewToolbar.jsx**

Replace the full content of `client/src/components/preview/PreviewToolbar.jsx` with:

```jsx
import { Monitor, Tablet, Smartphone, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function PreviewToolbar({ device, onDevice }) {
  const { t } = useTranslation()

  const DEVICES = [
    { key: 'desktop', label: t('preview.desktop'), Icon: Monitor },
    { key: 'tablet',  label: t('preview.tablet'),  Icon: Tablet },
    { key: 'mobile',  label: t('preview.mobile'),  Icon: Smartphone },
  ]

  return (
    <div className="flex items-center justify-between bg-navy h-10 px-4 flex-shrink-0 border-b border-slate">
      <div className="flex items-center gap-2">
        <span className="text-blue-electric font-bold text-sm">ShareFlow</span>
        <span className="bg-green-500 text-white text-[9px] font-bold rounded px-1.5 py-0.5 tracking-wide">
          LIVE
        </span>
      </div>

      <div className="flex gap-1 bg-navy-light rounded-md p-0.5">
        {DEVICES.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => onDevice(key)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-medium transition-colors ${
              device === key ? 'bg-blue text-white' : 'text-slate-light hover:text-white'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={() => window.opener ? window.close() : (window.location.href = '/')}
        className="flex items-center gap-1 text-slate-light hover:text-white text-[10px] transition-colors"
      >
        <X size={12} />
        {t('preview.close')}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run smoke tests — must still pass**

Run from `client/`:
```
npm run test:e2e
```

Expected: 19 passed. The `Deploy to SharePoint` button (tested by smoke) reads from IT locale which has `"Deploy to SharePoint"` — unchanged.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/sidebar-left/PagesPanel.jsx client/src/components/deploy/DeployModal.jsx client/src/components/preview/PreviewToolbar.jsx
git commit -m "feat(i18n): localize PagesPanel, DeployModal, PreviewToolbar"
```

---

## Task 8: i18n End-to-End Tests

**Files:**
- Modify: `client/tests/smoke.spec.js`

- [ ] **Step 1: Write the new i18n tests**

Append the following new `test.describe` block to `client/tests/smoke.spec.js` (after the closing `})` of the existing describe block):

```js
test.describe('i18n language switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'it'))
    await page.goto('/')
  })

  test('LanguageSwitcher renders all four language buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'IT', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'EN', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'FR', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'DE', exact: true })).toBeVisible()
  })

  test('switching to EN translates Pages panel header and Add page button', async ({ page }) => {
    // IT baseline
    await expect(page.getByText('Pagine', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aggiungi pagina' })).toBeVisible()

    // Switch to EN
    await page.getByRole('button', { name: 'EN', exact: true }).click()

    await expect(page.getByText('Pages', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add page' })).toBeVisible()
  })

  test('switching back to IT restores Italian strings', async ({ page }) => {
    await page.getByRole('button', { name: 'EN', exact: true }).click()
    await expect(page.getByText('Pages', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'IT', exact: true }).click()
    await expect(page.getByText('Pagine', { exact: true })).toBeVisible()
  })

  test('switching to EN translates canvas drop hint', async ({ page }) => {
    // Add a block so we can see a second column drop zone
    await page.getByText('News - Corporate', { exact: true }).click()

    // IT drop hint exists
    await expect(page.getByText('Trascina qui un blocco').first()).toBeVisible()

    // Switch to EN
    await page.getByRole('button', { name: 'EN', exact: true }).click()
    await expect(page.getByText('Drag a block here').first()).toBeVisible()
  })

  test('page title rename in IT does not change EN variant', async ({ page }) => {
    // Double-click "Home" label in sidebar to start rename
    const homeLabel = page.locator('aside').filter({ hasText: 'Pagine' }).getByText('Home', { exact: true })
    await homeLabel.dblclick()

    // Type new IT title
    const input = page.locator('aside').getByRole('textbox')
    await input.fill('Principale')
    await input.press('Enter')

    // IT shows new title
    await expect(page.getByText('Principale').first()).toBeVisible()

    // Switch to EN — the EN variant should still be "Home"
    await page.getByRole('button', { name: 'EN', exact: true }).click()
    await expect(page.locator('aside').getByText('Home', { exact: true })).toBeVisible()
  })
})
```

- [ ] **Step 2: Run all tests — 19 + 5 = 24 must pass**

Run from `client/`:
```
npm run test:e2e
```

Expected: 24 passed, 0 failed.

If the rename test fails on double-click detection, verify the `PageTreeItem` `onDoubleClick` handler targets the correct element. The `aside` with "Pagine" text is the left sidebar; the `Home` span is inside `PageTreeItem`.

- [ ] **Step 3: Commit**

```bash
git add client/tests/smoke.spec.js
git commit -m "test(i18n): add e2e tests for language switching and per-language rename isolation"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task | Status |
|---|---|---|
| i18next config + browser detection | 1 | ✅ |
| 4 locale JSON files (IT/EN/FR/DE) | 1 | ✅ |
| useLang() hook | 2 | ✅ |
| t2(field, lang) utility | 2 | ✅ |
| LanguageSwitcher pill in Navbar | 2 | ✅ |
| siteName stored as {it,en,fr,de} | 3 | ✅ |
| pages[].title stored as {it,en,fr,de} | 3 | ✅ |
| RENAME_PAGE takes {pageId, lang, title} | 3 | ✅ |
| ADD_PAGE initializes multilang title | 3 | ✅ |
| HeroBanner uses t2 | 3 | ✅ |
| CanvasTopNav uses t2 | 3 | ✅ |
| MegaMenuPanel uses t2 via lang prop | 3 | ✅ |
| PageTreeItem display/edit uses t2 | 3 | ✅ |
| AppearancePanel siteName editor per lang | 3 | ✅ |
| Block library panel localized | 4 | ✅ |
| Canvas area localized | 5 | ✅ |
| Properties sidebar localized | 6 | ✅ |
| Pages/Deploy/Preview localized | 7 | ✅ |
| Existing 19 tests pass via addInitScript | 2–7 | ✅ |
| New i18n e2e tests | 8 | ✅ |
| Preview tab same origin → same i18nextLng | Architecture | ✅ (no extra code) |

**Type consistency:** `t2(field, lang)` signature is identical in all callers. `useLang()` returns 2-letter code everywhere. `RENAME_PAGE` payload shape `{ pageId, lang, title }` matches reducer.

**Placeholder scan:** No TBD or TODO. All code blocks are complete.
