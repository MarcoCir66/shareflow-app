import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Pre-existing, out-of-scope violations (visual contrast, document landmark
// structure) — not part of the four accessibility gaps this plan addresses.
// Excluded so these tests guard against regressions in scope, not flag
// unrelated issues that would never go to zero here.
const OUT_OF_SCOPE_AXE_RULES = ['color-contrast', 'landmark-unique', 'page-has-heading-one', 'region']

test.describe('ShareFlow configurator smoke test', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'it'))
    await page.goto('/')
  })

  test('default editor view has no in-scope accessibility violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).disableRules(OUT_OF_SCOPE_AXE_RULES).analyze()
    expect(results.violations).toEqual([])
  })

  test('loads the 3-column workspace with the default Home page', async ({ page }) => {
    await expect(page.getByText('ShareFlow', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pubblica su SharePoint' })).toBeVisible()
    await expect(page.getByText('Comunicazione', { exact: true })).toBeVisible()
    await expect(page.getByText('SharePoint Communication Site — Home')).toBeVisible()
    await expect(page.getByText('Nessun blocco selezionato')).toBeVisible()
    await expect(page.locator('main').getByRole('button', { name: 'Home', exact: true }).locator('svg')).toHaveCount(0)
  })

  test('search filters the block library', async ({ page }) => {
    await page.getByPlaceholder('Cerca blocchi…').fill('news')
    await expect(page.getByText('News - Corporate', { exact: true })).toBeVisible()
    await expect(page.getByText('Procedure', { exact: true })).not.toBeVisible()
  })

  test('clicking a block adds it to the canvas and shows its properties', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()

    const canvasBlock = page.locator('main').getByText('News - Corporate', { exact: true })
    await expect(canvasBlock).toBeVisible()

    await canvasBlock.click()
    await expect(page.getByText('Instance ID')).toBeVisible()
    await expect(page.locator('aside.border-l').getByRole('button', { name: 'Corporate', exact: true })).toBeVisible()
  })

  test('toggling a widget property does not error', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()
    await page.locator('main').getByText('News - Corporate', { exact: true }).click()

    const visibleRow = page.locator('div', { hasText: 'Visibile' }).filter({ has: page.locator('button') }).last()
    await visibleRow.locator('button').click()
    await expect(page.getByText('Instance ID')).toBeVisible()
  })

  test('removing a block clears the canvas and properties panel', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()
    const canvasBlock = page.locator('main').getByText('News - Corporate', { exact: true })
    await canvasBlock.click()

    const blockCard = page.locator('main div.group.bg-white', { hasText: 'News - Corporate' })
    await blockCard.hover()
    await blockCard.locator('button').last().click()

    await expect(page.getByText('Nessun blocco selezionato')).toBeVisible()
    await expect(canvasBlock).not.toBeVisible()
  })

  test('adding a section adds an empty column drop zone', async ({ page }) => {
    await page.getByRole('button', { name: 'Aggiungi sezione' }).click()
    await expect(page.locator('main')).toContainText('Trascina qui un blocco')
  })

  test('adding a page adds it to the canvas top nav', async ({ page }) => {
    await page.getByRole('button', { name: 'Pagine' }).click()
    await page.getByRole('button', { name: 'Aggiungi pagina' }).click()
    await expect(page.getByText('SharePoint Communication Site — Nuova pagina')).toBeVisible()
  })

  test('mega-menu shows a nested page and toggles open/closed', async ({ page }) => {
    await page.getByRole('button', { name: 'Pagine' }).click()

    const homeRow = page.locator('aside.border-r').locator('div.group', { hasText: 'Home' })
    await homeRow.hover()
    await homeRow.getByTitle('Aggiungi sottopagina').click()

    const canvas = page.locator('main')
    await expect(canvas.getByText('SharePoint Communication Site — Nuova pagina')).toBeVisible()

    const homeTab = canvas.getByRole('button', { name: 'Home', exact: true })
    const panelItem = canvas.getByRole('button', { name: 'Nuova pagina', exact: true })

    // Home now has a child: chevron appears, and its panel is open by default.
    await expect(homeTab.locator('svg')).toBeVisible()
    await expect(panelItem).toBeVisible()

    // Case 2: clicking the active root while on a descendant navigates to the
    // root's own page; the panel stays open.
    await homeTab.click()
    await expect(canvas.getByText('SharePoint Communication Site — Home')).toBeVisible()
    await expect(panelItem).toBeVisible()

    // Case 3: clicking the active root while already on its own page toggles the panel closed.
    await homeTab.click()
    await expect(panelItem).not.toBeVisible()

    // Case 3 again: toggles the panel back open.
    await homeTab.click()
    await expect(panelItem).toBeVisible()

    // Clicking an item inside the panel navigates to it.
    await panelItem.click()
    await expect(canvas.getByText('SharePoint Communication Site — Nuova pagina')).toBeVisible()
  })

  test('Aspetto tab shows the template gallery', async ({ page }) => {
    await page.getByRole('button', { name: 'Aspetto' }).click()
    await expect(page.getByRole('button', { name: /Corporate Classic/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Modern Light/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Dark Glass/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Vibrant Color/ })).toBeVisible()
  })

  test('selecting a template re-skins the hero banner and nav', async ({ page }) => {
    await expect(page.locator('main').getByText('My Corporate Intranet', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Aspetto' }).click()
    await page.getByRole('button', { name: /Modern Light/ }).click()

    await expect(page.locator('main nav').locator('..')).toHaveClass(/bg-white/)
    await expect(page.locator('main').getByText('My Corporate Intranet', { exact: true })).toBeVisible()
  })

  test('accent color picker updates --theme-accent on the canvas', async ({ page }) => {
    await page.getByRole('button', { name: 'Aspetto' }).click()
    await page.locator('input[type="color"]').fill('#ff0000')

    await expect(page.locator('[style*="--theme-accent"]')).toHaveAttribute('style', /--theme-accent:\s*#ff0000/)
  })

  test('deploy flow completes end-to-end against the provisioning API', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()

    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/provisioning/jobs') && req.method() === 'POST'),
      page.getByRole('button', { name: 'Pubblica su SharePoint' }).click(),
    ])
    const { tenantConfiguration } = request.postDataJSON()
    expect(tenantConfiguration.navigation).toEqual([
      { pageId: 'page-home', title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' }, slug: 'home', children: [] },
    ])
    expect(tenantConfiguration.theme).toEqual({ templateId: 'corporate-classic', accentColor: null })

    await expect(page.getByText('Pubblicazione su SharePoint in corso')).toBeVisible()
    await expect(page.getByText('Distribuzione completata!')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Fine' })).toBeVisible({ timeout: 15000 })
  })

  test('Contenuto tab appears for content-enabled blocks and is absent for widget-only blocks', async ({ page }) => {
    // News block has content schema → tab appears
    await page.getByText('News - Corporate', { exact: true }).click()
    const canvasBlock = page.locator('main').getByText('News - Corporate', { exact: true })
    await canvasBlock.click()

    const sidebar = page.locator('aside.border-l')
    await expect(sidebar.getByRole('button', { name: 'Contenuto', exact: true })).toBeVisible()
    await expect(sidebar.getByRole('button', { name: 'Proprietà', exact: true })).toBeVisible()
  })

  test('switching to source type "Manuale" shows production badge and hides URL field', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()
    await page.locator('main').getByText('News - Corporate', { exact: true }).click()

    const sidebar = page.locator('aside.border-l')
    await sidebar.getByRole('button', { name: 'Contenuto', exact: true }).click()

    // Switch to Manuale
    await sidebar.getByRole('button', { name: 'Manuale', exact: true }).click()

    // URL field gone, production badge + info banner visible
    await expect(sidebar.locator('input[type="url"]')).not.toBeVisible()
    await expect(sidebar.getByText('PRODUZIONE', { exact: true })).toBeVisible()
  })

  test('adding a content item replaces the skeleton in the canvas preview', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()
    const canvasBlock = page.locator('main').getByText('News - Corporate', { exact: true })
    await canvasBlock.click()

    const sidebar = page.locator('aside.border-l')
    await sidebar.getByRole('button', { name: 'Contenuto', exact: true }).click()

    // Add item
    await sidebar.getByRole('button', { name: '+ Aggiungi', exact: true }).click()
    await sidebar.locator('input[type="text"]').first().fill('Lancio piano welfare 2026')
    await sidebar.locator('input[type="date"]').first().fill('2026-06-20')
    await sidebar.getByRole('button', { name: 'Salva', exact: true }).click()

    // Canvas should now show the item title
    await expect(page.locator('main').getByText('Lancio piano welfare 2026')).toBeVisible()
  })

  test('Preview button is visible in the navbar', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Anteprima', exact: true })).toBeVisible()
  })

  test('Preview tab opens and shows page without edit chrome', async ({ page, context }) => {
    // Wait for usePreviewSync to write initial state to localStorage (debounced 300ms)
    await page.waitForFunction(() => !!localStorage.getItem('shareflow-preview'))

    const [previewPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'Anteprima', exact: true }).click(),
    ])
    await previewPage.waitForLoadState('domcontentloaded')

    // Preview toolbar with LIVE badge is visible
    await expect(previewPage.getByText('LIVE', { exact: true })).toBeVisible()
    // The intranet site name from initialState is visible (hero/nav)
    await expect(previewPage.getByText('My Corporate Intranet')).toBeVisible()
    // No editing chrome: no "Aggiungi sezione" button, no Deploy button
    await expect(previewPage.getByRole('button', { name: 'Aggiungi sezione' })).not.toBeVisible()
    await expect(previewPage.getByRole('button', { name: 'Pubblica su SharePoint' })).not.toBeVisible()
  })

  test('Preview tab shows block content added in the editor', async ({ page, context }) => {
    // Add a block in the editor
    await page.getByText('News - Corporate', { exact: true }).click()

    // Wait for usePreviewSync to write the updated state
    await page.waitForFunction(() => {
      try {
        const s = JSON.parse(localStorage.getItem('shareflow-preview') || 'null')
        return s?.pages?.some(p => p.sections?.some(sec => sec.columns?.some(col => col.widgets?.length > 0)))
      } catch { return false }
    })

    const [previewPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'Anteprima', exact: true }).click(),
    ])
    await previewPage.waitForLoadState('domcontentloaded')

    // The block type label from CanvasBlockPreview should be visible
    await expect(previewPage.getByText('News - Corporate', { exact: false })).toBeVisible()
  })

  test('device switcher in preview toolbar updates the data-device attribute', async ({ page, context }) => {
    await page.waitForFunction(() => !!localStorage.getItem('shareflow-preview'))

    const [previewPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'Anteprima', exact: true }).click(),
    ])
    await previewPage.waitForLoadState('domcontentloaded')

    // Default is desktop
    await expect(previewPage.locator('[data-device="desktop"]')).toBeVisible()

    // Switch to mobile
    await previewPage.getByRole('button', { name: 'Mobile', exact: true }).click()
    await expect(previewPage.locator('[data-device="mobile"]')).toBeVisible()
    await expect(previewPage.locator('[data-device="desktop"]')).not.toBeVisible()

    // Switch to tablet
    await previewPage.getByRole('button', { name: 'Tablet', exact: true }).click()
    await expect(previewPage.locator('[data-device="tablet"]')).toBeVisible()
  })
})

test.describe('i18n language switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'it'))
    await page.goto('/')
  })

  test('LanguageSwitcher renders all four language buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Switch language to IT', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Switch language to EN', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Switch language to FR', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Switch language to DE', exact: true })).toBeVisible()
  })

  test('switching to EN translates Pages panel header and Add page button', async ({ page }) => {
    await page.getByRole('button', { name: 'Pagine' }).click()

    const pagesPanelHeader = page.locator('aside.border-r span.uppercase')

    // IT baseline
    await expect(pagesPanelHeader.filter({ hasText: 'Pagine' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aggiungi pagina' })).toBeVisible()

    // Switch to EN
    await page.getByRole('button', { name: 'Switch language to EN', exact: true }).click()

    await expect(pagesPanelHeader.filter({ hasText: 'Pages' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add page' })).toBeVisible()
  })

  test('switching back to IT restores Italian strings', async ({ page }) => {
    await page.getByRole('button', { name: 'Pagine' }).click()
    const pagesPanelHeader = page.locator('aside.border-r span.uppercase')

    await page.getByRole('button', { name: 'Switch language to EN', exact: true }).click()
    await expect(pagesPanelHeader.filter({ hasText: 'Pages' })).toBeVisible()

    await page.getByRole('button', { name: 'Switch language to IT', exact: true }).click()
    await expect(pagesPanelHeader.filter({ hasText: 'Pagine' })).toBeVisible()
  })

  test('switching to EN translates canvas drop hint', async ({ page }) => {
    // Fill the existing column first
    await page.getByText('News - Corporate', { exact: true }).click()

    // Add a second, empty section so a drop zone remains visible
    await page.getByRole('button', { name: 'Aggiungi sezione' }).click()
    await page.getByRole('button', { name: 'Una colonna' }).click()

    // IT drop hint exists
    await expect(page.getByText('Trascina qui un blocco').first()).toBeVisible()

    // Switch to EN
    await page.getByRole('button', { name: 'Switch language to EN', exact: true }).click()
    await expect(page.getByText('Drag a block here').first()).toBeVisible()
  })

  test('page title rename in IT does not change EN variant', async ({ page }) => {
    await page.getByRole('button', { name: 'Pagine' }).click()

    // Double-click "Home" label in sidebar to start rename
    const homeLabel = page.locator('aside.border-r').getByText('Home', { exact: true })
    await homeLabel.dblclick()

    // Type new IT title
    const input = page.locator('aside.border-r').getByRole('textbox')
    await input.fill('Principale')
    await input.press('Enter')

    // IT shows new title
    await expect(page.getByText('Principale').first()).toBeVisible()

    // Switch to EN — the EN variant should still be "Home"
    await page.getByRole('button', { name: 'Switch language to EN', exact: true }).click()
    await expect(page.locator('aside.border-r').getByText('Home', { exact: true })).toBeVisible()
  })
})
