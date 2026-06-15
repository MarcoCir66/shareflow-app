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

    await expect(page.getByText('Deploying to SharePoint')).toBeVisible()
    await expect(page.getByText('Deployment complete!')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Done' })).toBeVisible({ timeout: 15000 })
  })
})
