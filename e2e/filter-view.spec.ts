import { test, expect } from '@playwright/test'
import path from 'node:path'

const SAMPLE_PATH = path.resolve('var/e2e-test')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  const input = page.getByPlaceholder(/パス/)
  await input.fill(SAMPLE_PATH)
  await input.press('Enter')
  await page.waitForURL('**/editor**')
  await page.waitForSelector('tbody tr')
})

test('フィルタービューを作成してサイドバーに表示される', async ({ page }) => {
  // Click "+ フィルター" in the sidebar
  await page.locator('aside').getByText('+ フィルター').click()

  // Dialog should open
  const dialog = page.locator('.fixed.inset-0.z-50')
  await expect(dialog).toBeVisible({ timeout: 10000 })

  // Fill in view name
  await dialog.locator('input[placeholder]').first().fill('水属性の敵')

  // Add a filter condition
  await dialog.getByText('+ 条件を追加').click()

  // Select the "属性" column
  const condRow = dialog.locator('.flex.items-center.gap-1\\.5').first()
  await condRow.locator('select').first().selectOption({ label: '属性' })

  // Set op to "=" (eq)
  await condRow.locator('select').nth(1).selectOption('eq')

  // Set value to "water"
  await condRow.locator('select').last().selectOption('water')

  // Save the view
  await dialog.getByRole('button', { name: '保存' }).click()
  await expect(dialog).not.toBeVisible({ timeout: 10000 })

  // View should appear in the sidebar
  await expect(page.locator('aside').getByText('水属性の敵')).toBeVisible({ timeout: 10000 })
})

test('フィルタービューをクリックすると条件に合う行のみ表示される', async ({ page }) => {
  // Create filter view for water element
  await page.locator('aside').getByText('+ フィルター').click()
  const dialog = page.locator('.fixed.inset-0.z-50')
  await expect(dialog).toBeVisible({ timeout: 10000 })

  await dialog.locator('input[placeholder]').first().fill('水属性フィルター')
  await dialog.getByText('+ 条件を追加').click()

  const condRow = dialog.locator('.flex.items-center.gap-1\\.5').first()
  await condRow.locator('select').first().selectOption({ label: '属性' })
  await condRow.locator('select').nth(1).selectOption('eq')
  await condRow.locator('select').last().selectOption('water')

  await dialog.getByRole('button', { name: '保存' }).click()
  await expect(dialog).not.toBeVisible({ timeout: 10000 })

  // Click the view in the sidebar
  await page.locator('aside').getByText('水属性フィルター').click()

  // View badge should appear in the toolbar
  await expect(page.locator('main').getByText('水属性フィルター')).toBeVisible({ timeout: 10000 })

  // Only water enemies (スライム, ゴブリン) should be shown
  const rows = page.locator('tbody tr')
  await expect(rows).toHaveCount(2, { timeout: 10000 })
  await expect(page.locator('tbody')).toContainText('スライム')
  await expect(page.locator('tbody')).toContainText('ゴブリン')

  // Non-water enemies should not be shown
  await expect(page.locator('tbody')).not.toContainText('ドラゴン')
  await expect(page.locator('tbody')).not.toContainText('オーク')
})
