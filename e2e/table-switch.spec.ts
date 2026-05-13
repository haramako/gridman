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

test('サイドバーで別テーブルをクリックするとグリッドが切り替わる', async ({ page }) => {
  // 初期状態: 敵キャラクターテーブルが表示されている
  await expect(page.locator('header')).toContainText('敵キャラクター')

  // サイドバーの「アイテム」をクリック
  await page.locator('aside').getByRole('button', { name: 'アイテム' }).click()

  // グリッドがアイテムテーブルに切り替わったことを確認
  await expect(page.locator('header')).toContainText('アイテム')

  // アイテムテーブルの列ヘッダーが表示されていることを確認
  await expect(page.locator('thead')).toContainText('種別')
})
