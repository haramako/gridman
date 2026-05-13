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

test('クリックでセルが選択状態になる', async ({ page }) => {
  const firstCell = page.locator('tbody tr:first-child td:nth-child(2)')
  await firstCell.click()
  await expect(firstCell).toHaveClass(/ring-2/)
})

test('Enter キーで編集モードに入れる', async ({ page }) => {
  const firstCell = page.locator('tbody tr:first-child td:nth-child(2)')
  await firstCell.click()
  await page.keyboard.press('Enter')
  await expect(firstCell.locator('input')).toBeVisible()
})

test('F2 キーで編集モードに入れる', async ({ page }) => {
  const firstCell = page.locator('tbody tr:first-child td:nth-child(2)')
  await firstCell.click()
  await page.keyboard.press('F2')
  await expect(firstCell.locator('input')).toBeVisible()
})

test('編集モードで値を入力して Enter で確定できる', async ({ page }) => {
  const firstCell = page.locator('tbody tr:first-child td:nth-child(2)')
  await firstCell.click()
  await page.keyboard.press('Enter')
  const cellInput = firstCell.locator('input')
  await cellInput.focus()
  await cellInput.fill('テスト確定値')
  await cellInput.press('Enter')
  await expect(firstCell.locator('input')).not.toBeVisible()
  await expect(firstCell).toHaveText('テスト確定値')
})

test('編集モードで Esc を押すとキャンセルされる', async ({ page }) => {
  const firstCell = page.locator('tbody tr:first-child td:nth-child(2)')
  const originalText = await firstCell.textContent()
  await firstCell.click()
  await page.keyboard.press('Enter')
  const cellInput = firstCell.locator('input')
  await cellInput.focus()
  await cellInput.fill('キャンセルされるはずの値')
  await cellInput.press('Escape')
  await expect(firstCell.locator('input')).not.toBeVisible()
  await expect(firstCell).toHaveText(originalText?.trim() ?? '')
})
