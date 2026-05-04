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

test('Ctrl+A で全セルを選択できる', async ({ page }) => {
  // 最初のセルをクリックしてフォーカス
  const firstCell = page.locator('tbody tr:first-child td:nth-child(2)')
  await firstCell.click()

  // Ctrl+A を押す
  await page.keyboard.press('Control+a')

  // 全行が選択されていることを確認（selectedRowIds の行数 = 全行数）
  const totalRows = await page.locator('tbody tr').count()
  const selectedRows = await page.locator('tbody tr.bg-blue-50').count()
  expect(selectedRows).toBe(totalRows)

  // 選択範囲が設定されていることを確認（コピーしてクリップボードの内容をチェック）
  await page.keyboard.press('Control+c')
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  const lines = clipboard.split('\n')
  expect(lines.length).toBe(totalRows)
})
