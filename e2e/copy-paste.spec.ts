import { test, expect } from '@playwright/test'
import path from 'node:path'

const SAMPLE_PATH = path.resolve('var/e2e-test')

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

test('Ctrl+X でセルをカットできる（クリップボードにコピー＋セルがクリアされる）', async ({ page }) => {
  // value列（3番目の列、整数型、必須ではない）を使用
  const valueCell = page.locator('tbody tr:first-child td:nth-child(4)')
  await valueCell.click()

  // 元の値を取得
  const originalText = await valueCell.textContent()

  // カット（Ctrl+X）
  await page.keyboard.press('Control+x')

  // クリップボードの内容を確認（元の値が入っている）
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard.trim()).toBe(originalText?.trim() ?? '')

  // セルがクリアされていることを確認（整数型なので0になる）
  await expect(valueCell).toHaveText('0')
})

test('Ctrl+X で範囲選択した複数セルをカットできる', async ({ page }) => {
  // value列（3番目の列）を選択
  const firstCell = page.locator('tbody tr:first-child td:nth-child(4)')
  await firstCell.click()

  // Shift+ArrowDown で2行分選択
  await page.keyboard.press('Shift+ArrowDown')

  // 1行目の値を保持
  const firstText = await firstCell.textContent()

  // カット（Ctrl+X）
  await page.keyboard.press('Control+x')

  // クリップボードの内容を確認（2行分のTSVが入っている）
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  const lines = clipboard.split('\n')
  expect(lines.length).toBe(2)
  expect(lines[0].trim()).toBe(firstText?.trim() ?? '')

  // 選択範囲のセルがクリアされていることを確認（整数型なので0になる）
  await expect(firstCell).toHaveText('0')
  const secondCell = page.locator('tbody tr:nth-child(2) td:nth-child(4)')
  await expect(secondCell).toHaveText('0')
})
