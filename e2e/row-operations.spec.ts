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

test('「+ 行追加」ボタンで末尾に行が追加される', async ({ page }) => {
  const initialRowCount = await page.locator('tbody tr').count()
  await page.getByRole('button', { name: /行追加/ }).click()
  await expect(page.locator('tbody tr')).toHaveCount(initialRowCount + 1)
})

test('「− 行削除」ボタンで選択行が削除される', async ({ page }) => {
  const initialRowCount = await page.locator('tbody tr').count()
  // 行番号セルをクリックして行を選択する
  await page.locator('tbody tr:first-child td:first-child').click()
  await page.getByRole('button', { name: /行削除/ }).click()
  await expect(page.locator('tbody tr')).toHaveCount(initialRowCount - 1)
})
