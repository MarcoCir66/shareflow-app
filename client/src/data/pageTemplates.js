export const PAGE_TEMPLATE_CATEGORIES = {
  COMMUNICATION: 'COMMUNICATION',
  HR: 'HR',
  ONBOARDING: 'ONBOARDING',
  EMPLOYEE_HUB: 'EMPLOYEE_HUB',
  LEARNING: 'LEARNING',
}

export const PAGE_TEMPLATES = [
  {
    id: 'communication-home',
    label: 'Homepage Comunicazione',
    category: PAGE_TEMPLATE_CATEGORIES.COMMUNICATION,
    icon: 'Newspaper',
    description: 'Una homepage di comunicazione con news, avvisi, eventi e galleria multimedia.',
    defaultPageTitle: { it: 'Comunicazione', en: 'Communication', fr: 'Communication', de: 'Kommunikation' },
    sections: [
      { layout: 'twoColumn', blocks: [['news-corporate'], ['avvisi-homepage']] },
      { layout: 'oneColumn', blocks: [['eventi-corporate']] },
      { layout: 'oneColumn', blocks: [['multimedia-gallery']] },
    ],
  },
  {
    id: 'hr-portal',
    label: 'Portale HR',
    category: PAGE_TEMPLATE_CATEGORIES.HR,
    icon: 'HeartHandshake',
    description: 'Una pagina HR con welfare, nuovi assunti, organigramma e FAQ.',
    defaultPageTitle: { it: 'Risorse Umane', en: 'Human Resources', fr: 'Ressources Humaines', de: 'Personalwesen' },
    sections: [
      { layout: 'twoColumn', blocks: [['sezione-welfare'], ['new-entry']] },
      { layout: 'oneColumn', blocks: [['organigramma']] },
      { layout: 'twoColumn', blocks: [['faq'], ['rubrica-colleghi']] },
      { layout: 'oneColumn', blocks: [['documenti']] },
    ],
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    category: PAGE_TEMPLATE_CATEGORIES.ONBOARDING,
    icon: 'UserPlus',
    description: 'Un percorso di onboarding con procedure, FAQ e organigramma.',
    defaultPageTitle: { it: 'Onboarding', en: 'Onboarding', fr: 'Intégration', de: 'Onboarding' },
    sections: [
      { layout: 'oneColumn', blocks: [['new-entry']] },
      { layout: 'twoColumn', blocks: [['procedure'], ['come-fare-per']] },
      { layout: 'oneColumn', blocks: [['faq']] },
      { layout: 'oneColumn', blocks: [['organigramma']] },
      { layout: 'oneColumn', blocks: [['documenti']] },
    ],
  },
  {
    id: 'employee-hub',
    label: 'Employee Hub',
    category: PAGE_TEMPLATE_CATEGORIES.EMPLOYEE_HUB,
    icon: 'Users',
    description: 'Un hub per i dipendenti con ricerca, rubrica, sondaggi e bacheca.',
    defaultPageTitle: { it: 'Employee Hub', en: 'Employee Hub', fr: 'Espace collaborateurs', de: 'Mitarbeiter-Hub' },
    sections: [
      { layout: 'twoColumn', blocks: [['motore-ricerca'], ['rubrica-colleghi']] },
      { layout: 'oneColumn', blocks: [['polls-survey']] },
      { layout: 'oneColumn', blocks: [['bacheca-scambio']] },
    ],
  },
  {
    id: 'training',
    label: 'Formazione',
    category: PAGE_TEMPLATE_CATEGORIES.LEARNING,
    icon: 'GraduationCap',
    description: 'Una pagina di formazione con presentazioni, procedure e FAQ.',
    defaultPageTitle: { it: 'Formazione', en: 'Training', fr: 'Formation', de: 'Schulung' },
    sections: [
      { layout: 'oneColumn', blocks: [['oggi-presentiamo']] },
      { layout: 'twoColumn', blocks: [['procedure'], ['come-fare-per']] },
      { layout: 'oneColumn', blocks: [['faq']] },
    ],
  },
]

export const pageTemplateById = Object.fromEntries(PAGE_TEMPLATES.map(t => [t.id, t]))
