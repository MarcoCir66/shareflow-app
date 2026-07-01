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
