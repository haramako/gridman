import { test, expect } from '@playwright/test'
import path from 'node:path'

const SAMPLE_PATH = path.resolve('fixtures/sample')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  const input = page.getByPlaceholder(/パス/)
  await input.fill(SAMPLE_PATH)
  await input.press('Enter')
  await page.waitForURL('**/editor**')
  await page.waitForSelector('tbody tr')
})

// 編集中のセルで Enter を押したとき、次のセルが自動的に編集モードに入らないことを確認する
test('Enter確定後に次のセルが編集モードにならない', async ({ page }) => {
  // 1行目のname列（2番目のtd）をクリックして選択
  const firstCell = page.locator('tbody tr:first-child td:nth-child(2)')
  await firstCell.click()

  // Enter で編集モードに入る
  await page.keyboard.press('Enter')
  await expect(firstCell.locator('input')).toBeVisible()

  // Enter で編集を確定 → 次の行へカーソル移動
  await page.keyboard.press('Enter')

  // 元のセルは編集モードを抜けている
  await expect(firstCell.locator('input')).not.toBeVisible()

  // 次の行の同じ列も編集モードになっていない（修正前のバグ: ここが自動的に編集モードになった）
  const secondCell = page.locator('tbody tr:nth-child(2) td:nth-child(2)')
  await expect(secondCell.locator('input')).not.toBeVisible()
})
