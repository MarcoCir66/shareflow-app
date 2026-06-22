import { PAGE_TEMPLATE_CATEGORIES } from './pageTemplates.js'

export const SITE_TEMPLATES = [
  {
    id: 'communication-site',
    label: 'Comunicazione Corporate',
    category: PAGE_TEMPLATE_CATEGORIES.COMMUNICATION,
    icon: 'Newspaper',
    description: 'Un sito di comunicazione corporate con homepage news e una sezione formazione collegata.',
    themeId: 'corporate-classic',
    pages: [
      { pageTemplateId: 'communication-home', parentIndex: null },
      { pageTemplateId: 'training', parentIndex: 0 },
    ],
  },
  {
    id: 'hr-site',
    label: 'Portale HR',
    category: PAGE_TEMPLATE_CATEGORIES.HR,
    icon: 'HeartHandshake',
    description: 'Un sito HR con portale risorse umane e percorso di onboarding collegato.',
    themeId: 'modern-light',
    pages: [
      { pageTemplateId: 'hr-portal', parentIndex: null },
      { pageTemplateId: 'onboarding', parentIndex: 0 },
    ],
  },
  {
    id: 'onboarding-site',
    label: 'Percorso Onboarding',
    category: PAGE_TEMPLATE_CATEGORIES.ONBOARDING,
    icon: 'UserPlus',
    description: 'Un sito di onboarding con percorso guidato e portale HR collegato.',
    themeId: 'vibrant-color',
    pages: [
      { pageTemplateId: 'onboarding', parentIndex: null },
      { pageTemplateId: 'hr-portal', parentIndex: 0 },
    ],
  },
  {
    id: 'employee-hub-site',
    label: 'Employee Hub',
    category: PAGE_TEMPLATE_CATEGORIES.EMPLOYEE_HUB,
    icon: 'Users',
    description: 'Un sito hub dipendenti con ricerca, rubrica e una sezione comunicazione collegata.',
    themeId: 'dark-glass',
    pages: [
      { pageTemplateId: 'employee-hub', parentIndex: null },
      { pageTemplateId: 'communication-home', parentIndex: 0 },
    ],
  },
  {
    id: 'training-site',
    label: 'Centro Formazione',
    category: PAGE_TEMPLATE_CATEGORIES.LEARNING,
    icon: 'GraduationCap',
    description: 'Un sito di formazione con un percorso di onboarding collegato.',
    themeId: 'vibrant-color',
    pages: [
      { pageTemplateId: 'training', parentIndex: null },
      { pageTemplateId: 'onboarding', parentIndex: 0 },
    ],
  },
]

export const siteTemplateById = Object.fromEntries(SITE_TEMPLATES.map(t => [t.id, t]))
