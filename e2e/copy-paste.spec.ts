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

test('同一行の複数カラムへ2Dペーストしても全カラムが反映され、UNDO/REDOが1操作で効く', async ({
  page,
}) => {
  // hp列(nth-child(3))・attack列(nth-child(4)) — どちらも整数型の隣接カラム
  const hpCell = page.locator('tbody tr:first-child td:nth-child(3)')
  const attackCell = page.locator('tbody tr:first-child td:nth-child(4)')

  const originalHp = (await hpCell.textContent())?.trim() ?? ''
  const originalAttack = (await attackCell.textContent())?.trim() ?? ''

  // タブ区切りで同一行の2カラムをペースト
  await page.evaluate(() => navigator.clipboard.writeText('777\t888'))
  await hpCell.click()
  await page.keyboard.press('Control+v')

  // 最後のカラムだけでなく両カラムが反映されていること（リグレッション検出）
  await expect(hpCell).toHaveText('777')
  await expect(attackCell).toHaveText('888')

  // UNDO 1回で両カラムが元に戻ること
  await page.keyboard.press('Control+z')
  await expect(hpCell).toHaveText(originalHp)
  await expect(attackCell).toHaveText(originalAttack)

  // REDO 1回で両カラムが再度反映されること
  await page.keyboard.press('Control+y')
  await expect(hpCell).toHaveText('777')
  await expect(attackCell).toHaveText('888')
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

  // セルがクリアされていることを確認（整数型はnull→空文字として表示）
  await expect(valueCell).toHaveText('')
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

  // 選択範囲のセルがクリアされていることを確認（整数型はnull→空文字として表示）
  await expect(firstCell).toHaveText('')
  const secondCell = page.locator('tbody tr:nth-child(2) td:nth-child(4)')
  await expect(secondCell).toHaveText('')
})
