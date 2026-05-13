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

test('ルックアップビューを作成してサイドバーに表示される', async ({ page }) => {
  // Click "+ ルックアップ" in the sidebar
  await page.locator('aside').getByText('+ ルックアップ').click()

  const dialog = page.locator('.fixed.inset-0.z-50')
  await expect(dialog).toBeVisible({ timeout: 10000 })
  await expect(dialog).toContainText('ルックアップビューを作成')

  // Fill in view name
  await dialog.locator('input[placeholder]').first().fill('敵一覧（アイテム展開）')

  // Add a lookup (auto-selects the first ref column: dropItemId → item)
  await dialog.getByText('+ 参照列を追加').click()

  // Select the "名前" field from the item table
  await dialog.locator('label:has(input[type="checkbox"])').filter({ hasText: '名前' }).click()

  // Save button should now be enabled
  const saveButton = dialog.getByRole('button', { name: '保存' })
  await expect(saveButton).not.toBeDisabled()
  await saveButton.click()
  await expect(dialog).not.toBeVisible({ timeout: 10000 })

  // View should appear in the sidebar
  await expect(page.locator('aside').getByText('敵一覧（アイテム展開）')).toBeVisible({ timeout: 10000 })
})

test('ルックアップビューをクリックすると参照先テーブルの列が展開表示される', async ({ page }) => {
  // Create lookup view
  await page.locator('aside').getByText('+ ルックアップ').click()
  const dialog = page.locator('.fixed.inset-0.z-50')
  await expect(dialog).toBeVisible({ timeout: 10000 })

  await dialog.locator('input[placeholder]').first().fill('アイテム展開テスト')
  await dialog.getByText('+ 参照列を追加').click()

  // Select "名前" field from the item table
  await dialog.locator('label:has(input[type="checkbox"])').filter({ hasText: '名前' }).click()

  await dialog.getByRole('button', { name: '保存' }).click()
  await expect(dialog).not.toBeVisible({ timeout: 10000 })

  // Click the view in the sidebar
  await page.locator('aside').getByText('アイテム展開テスト').click()

  // View badge should appear in the toolbar
  await expect(page.locator('main').getByText('アイテム展開テスト')).toBeVisible({ timeout: 10000 })

  // Expanded column header "dropItemId.名前" should be visible
  await expect(page.locator('thead')).toContainText('dropItemId.名前', { timeout: 10000 })

  // All base rows should still appear (4 enemies)
  await expect(page.locator('tbody tr')).toHaveCount(4, { timeout: 10000 })

  // The looked-up item name should appear for enemies with a dropItem
  await expect(page.locator('tbody')).toContainText('回復ポーション')
  await expect(page.locator('tbody')).toContainText('竜の牙')
})
