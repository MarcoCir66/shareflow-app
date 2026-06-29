# Project Management per ShareFlow — Design Spec
**Data:** 2026-06-29  
**Stato:** Approvato

---

## Obiettivo

Permettere agli utenti di salvare il lavoro di progettazione intranet come **progetti persistenti**, riprendibili in più sessioni. Ogni progetto ha metadati propri (nome, cliente, stato, tag) e conserva l'intero stato del canvas. Dopo il deploy su SharePoint, il link al sito viene salvato automaticamente sul progetto.

---

## Architettura generale

- **Storage:** SQLite server-side (stesso DB dei job di provisioning, `jobs.db`)
- **Auth:** MSAL obbligatorio — `userId` estratto dal token via `authMiddleware.js` esistente
- **Approccio:** REST API + React con navigazione dashboard ↔ canvas tramite `useState` (nessun router aggiunto)

---

## 1. Data Model

### Tabella `projects` (SQLite)

```sql
CREATE TABLE IF NOT EXISTS projects (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  client       TEXT,
  status       TEXT NOT NULL DEFAULT 'draft',
  tags         TEXT,                 -- JSON: string[]
  canvas_state TEXT NOT NULL,        -- JSON: { pages, activePageId, tenantConfiguration }
  sp_url       TEXT,                 -- popolato dopo deploy
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
)
```

**Valori validi per `status`:** `draft` | `published` | `archived`

Il `canvas_state` è la serializzazione completa dello state del configuratore (esclusi `selectedWidgetInstanceId` e `selectedSectionId`, che sono UI transient).

---

## 2. Server API

Nuovo file: `server/src/projectRoutes.js`  
Montato su: `/api/projects`  
Auth: ogni route richiede token MSAL valido (via `authMiddleware.js`)

| Metodo | Path | Descrizione |
|--------|------|-------------|
| `GET` | `/api/projects` | Lista progetti dell'utente autenticato (ordinati per `updated_at` DESC) |
| `POST` | `/api/projects` | Crea nuovo progetto |
| `GET` | `/api/projects/:id` | Carica singolo progetto (verifica ownership) |
| `PUT` | `/api/projects/:id` | Aggiorna canvas e/o metadati (verifica ownership) |
| `DELETE` | `/api/projects/:id` | Cancella progetto (verifica ownership) |

### Schema request body (POST)

```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "client": "string (optional)",
  "tags": ["string"] 
}
```

Il `canvas_state` viene inizializzato con `initialState` del configuratore lato server (o passato dal client).

### Schema request body (PUT)

Tutti i campi opzionali — patch parziale:
```json
{
  "name": "string",
  "description": "string",
  "client": "string",
  "status": "draft | published | archived",
  "tags": ["string"],
  "canvas_state": { ... },
  "sp_url": "string"
}
```

### Response GET lista

```json
[
  {
    "id": "proj-abc",
    "name": "Intranet Acme",
    "client": "Acme Srl",
    "status": "draft",
    "tags": ["hr", "comunicazione"],
    "sp_url": null,
    "created_at": "2026-06-29T10:00:00Z",
    "updated_at": "2026-06-29T10:00:00Z"
  }
]
```

La lista **non include `canvas_state`** (troppo pesante). Il canvas viene caricato solo via `GET /api/projects/:id`.

### Nuovo file: `server/src/projectStore.js`

Gestisce accesso SQLite per i progetti (pattern identico a `jobStore.js`).

---

## 3. Client — Nuovi componenti

### `ProjectDashboard.jsx`

Schermata iniziale mostrata quando nessun progetto è aperto (`activeProjectId === null`).

- Header con titolo "I tuoi progetti" + bottone "Nuovo progetto"
- Griglia responsive di `ProjectCard`
- Stati: loading, lista vuota (empty state con CTA), errore
- Usa hook `useProjects.js`

### `ProjectCard.jsx`

Card per ogni progetto in dashboard:
- Nome (bold), cliente (subtitle)
- Badge status: `draft` (grigio), `published` (verde), `archived` (arancione)
- Tags come pill
- Data ultima modifica
- Link SP (se presente): icona + URL cliccabile
- Azioni: "Apri" (primario), "Modifica" (icona matita), "Elimina" (icona cestino, con confirm)

### `ProjectFormModal.jsx`

Modal riutilizzato per creazione E modifica metadati. Campi:
- Nome (required)
- Cliente
- Descrizione (textarea)
- Tags (input con aggiunta/rimozione pill)
- Status (select, solo in modalità modifica)

---

## 4. Modifiche a file esistenti

### `App.jsx`

```jsx
const [activeProjectId, setActiveProjectId] = useState(null)

// render
if (!activeProjectId) return <ProjectDashboard onOpen={setActiveProjectId} />
return <canvas layout with DnDContext ...>
```

Dopo deploy completato con successo, chiama `PUT /api/projects/:activeProjectId` con `{ sp_url, status: 'published' }`.

### `Navbar.jsx`

Aggiunge (quando progetto aperto):
- Nome progetto corrente (testo, cliccabile apre `ProjectFormModal` per modifica)
- Bottone "Salva" — chiama `PUT /api/projects/:id` con canvas state corrente
- Bottone "Progetti" — `setActiveProjectId(null)` torna a dashboard

### `ConfiguratorContext.jsx`

Espone `currentProjectId` (passato come prop dal `App.jsx` via context o prop drilling diretto). Necessario a `DeployModal` per aggiornare il progetto dopo deploy.

### `configuratorReducer.js`

Nuova action:
```js
LOAD_PROJECT: 'LOAD_PROJECT'
```

Reducer case:
```js
case ACTIONS.LOAD_PROJECT:
  return {
    ...action.payload.canvasState,
    selectedWidgetInstanceId: null,
    selectedSectionId: null,
  }
```

---

## 5. Nuovo hook: `useProjects.js`

```js
// Espone:
const { projects, loading, error, createProject, updateProject, deleteProject } = useProjects()
```

Gestisce fetch lista, ottimistic updates non necessari (dataset piccolo).

---

## 6. Flusso deploy → aggiornamento progetto

Il flusso esistente in `DeployModal` già fa polling del job fino a completion. Al termine (status `completed`):
1. Estrae `job.result.siteUrl`
2. Chiama `PUT /api/projects/:activeProjectId` con `{ sp_url: siteUrl, status: 'published' }`
3. Aggiorna UI (badge progetto diventa "published")

---

## 7. Sicurezza

- Ogni API route verifica che `project.user_id === req.user.id` prima di restituire o modificare dati
- `DELETE` non è reversibile — lato client richiede conferma esplicita
- `canvas_state` non viene mai incluso nella lista progetti (GET /api/projects) per evitare payload grandi

---

## 8. File da creare / modificare

**Nuovi:**
- `server/src/projectStore.js`
- `server/src/projectRoutes.js`
- `client/src/components/projects/ProjectDashboard.jsx`
- `client/src/components/projects/ProjectCard.jsx`
- `client/src/components/projects/ProjectFormModal.jsx`
- `client/src/hooks/useProjects.js`

**Modificati:**
- `server/index.js` — monta `projectRoutes`
- `server/src/jobStore.js` (o nuovo `projectStore.js`) — aggiunge tabella `projects` al DB
- `client/src/App.jsx` — aggiunge logica `activeProjectId`, integrazione post-deploy
- `client/src/components/layout/Navbar.jsx` — aggiunge controlli progetto
- `client/src/context/configuratorReducer.js` — aggiunge `LOAD_PROJECT`
- `client/src/context/ConfiguratorContext.jsx` — espone `currentProjectId`

---

## Criteri di successo

1. Un utente autenticato può creare un progetto con nome e metadati
2. Il canvas viene salvato e ricaricato fedelmente tra sessioni diverse
3. Un secondo utente autenticato NON vede i progetti del primo
4. Dopo un deploy riuscito, il progetto mostra il link SharePoint e status "published"
5. Dalla dashboard è possibile eliminare un progetto con conferma
