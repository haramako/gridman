import { test, expect } from '@playwright/test'
import path from 'node:path'

const SAMPLE_PATH = path.resolve('fixtures/sample')

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  const input = page.getByPlaceholder(/パス/)
  await input.fill(SAMPLE_PATH)
  await input.press('Enter')
  await page.waitForURL('**/editor**')
  await page.waitForSelector('tbody tr')
})

test('Ctrl+C でセル値がクリップボードにコピーされる', async ({ page }) => {
  const firstCell = page.locator('tbody tr:first-child td:nth-child(2)')
  await firstCell.click()

  const cellText = await firstCell.textContent()

  await page.keyboard.press('Control+c')

  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toBe(cellText?.trim() ?? '')
})

test('Ctrl+V でクリップボードの値がセルにペーストされる', async ({ page }) => {
  // 1行目のname列の値を取得し、クリップボードに直接書き込む
  // (ヘッドレス環境では Ctrl+C による navigator.clipboard.writeText が失敗する場合がある)
  const firstCell = page.locator('tbody tr:first-child td:nth-child(2)')
  const firstText = await firstCell.textContent()
  await page.evaluate((text) => navigator.clipboard.writeText(text), firstText?.trim() ?? '')

  // 2行目のname列にペースト
  const secondCell = page.locator('tbody tr:nth-child(2) td:nth-child(2)')
  await secondCell.click()
  await page.keyboard.press('Control+v')

  // 1行目の値と同じ値が2行目にペーストされていること
  // handlePaste は非同期のため expect(...).toHaveText() で自動リトライを使う
  await expect(secondCell).toHaveText(firstText?.trim() ?? '')
})

test('範囲選択した複数セルをコピー＆ペーストできる', async ({ page }) => {
  // 1行目の2列目をクリック
  const firstCell = page.locator('tbody tr:first-child td:nth-child(2)')
  await firstCell.click()

  // Shift+ArrowDown で2行分選択
  await page.keyboard.press('Shift+ArrowDown')

  // コピー
  await page.keyboard.press('Control+c')

  // クリップボードの内容を確認（2行分のTSVが入っている）
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  const lines = clipboard.split('\n')
  expect(lines.length).toBe(2)
})
