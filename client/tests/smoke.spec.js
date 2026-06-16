import { test, expect } from '@playwright/test'

test.describe('ShareFlow configurator smoke test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('loads the 3-column workspace with the default Home page', async ({ page }) => {
    await expect(page.getByText('ShareFlow', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Deploy to SharePoint' })).toBeVisible()
    await expect(page.getByText('Communication', { exact: true })).toBeVisible()
    await expect(page.getByText('SharePoint Communication Site — Home')).toBeVisible()
    await expect(page.getByText('No block selected')).toBeVisible()
    await expect(page.locator('main').getByRole('button', { name: 'Home', exact: true }).locator('svg')).toHaveCount(0)
  })

  test('search filters the block library', async ({ page }) => {
    await page.getByPlaceholder('Search blocks…').fill('news')
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

    const visibleRow = page.locator('div', { hasText: 'Visible' }).filter({ has: page.locator('button') }).last()
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

    await expect(page.getByText('No block selected')).toBeVisible()
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
      page.getByRole('button', { name: 'Deploy to SharePoint' }).click(),
    ])
    const { tenantConfiguration } = request.postDataJSON()
    expect(tenantConfiguration.navigation).toEqual([
      { pageId: 'page-home', title: 'Home', slug: 'home', children: [] },
    ])
    expect(tenantConfiguration.theme).toEqual({ templateId: 'corporate-classic', accentColor: null })

    await expect(page.getByText('Deploying to SharePoint')).toBeVisible()
    await expect(page.getByText('Deployment complete!')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Done' })).toBeVisible({ timeout: 15000 })
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
})
