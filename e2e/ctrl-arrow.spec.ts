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

// ヘルパー: リングクラス（選択状態）を持つセルを取得
const expectCellHasRing = async (cell: any) => {
  await expect(cell).toHaveClass(/ring-2.*ring-blue-400/)
}

test('Ctrl+↓でデータ端（最後のデータ行）へジャンプする', async ({ page }) => {
  // 最初の行の名前列をクリック
  const firstCell = page.locator('tbody tr:first-child td:nth-child(2)')
  await firstCell.click()

  // Ctrl+Down を押す
  await page.keyboard.press('Control+ArrowDown')

  // 最後のデータ行にジャンプしたことを確認（スライム、オーク等のデータがある行）
  // 選択セルがリングクラスを持つことを確認
  const allRows = page.locator('tbody tr')
  const rowCount = await allRows.count()
  const lastRowCell = page.locator(`tbody tr:nth-child(${rowCount}) td:nth-child(2)`)
  await expectCellHasRing(lastRowCell)
})

test('Ctrl+↑でデータ端（最初のデータ行）へジャンプする', async ({ page }) => {
  // 最後の行の名前列をクリック
  const allRows = page.locator('tbody tr')
  const rowCount = await allRows.count()
  const lastRowCell = page.locator(`tbody tr:nth-child(${rowCount}) td:nth-child(2)`)
  await lastRowCell.click()

  // Ctrl+Up を押す
  await page.keyboard.press('Control+ArrowUp')

  // 最初のデータ行にジャンプしたことを確認
  const firstCell = page.locator('tbody tr:first-child td:nth-child(2)')
  await expectCellHasRing(firstCell)
})

test('Ctrl+→でデータ端（最後のデータ列）へジャンプする', async ({ page }) => {
  // 最初の行の最初の列（名前）をクリック
  const firstCell = page.locator('tbody tr:first-child td:nth-child(2)')
  await firstCell.click()

  // Ctrl+Right を押す
  await page.keyboard.press('Control+ArrowRight')

  // 最後のデータ列にジャンプしたことを確認
  // ヘッダーから列数を取得
  const headerCells = page.locator('thead th')
  const colCount = await headerCells.count()
  // 最初の行の最後の列（名前列は2番目、最後はcolCount-1番目のtd）
  const lastColCell = page.locator(`tbody tr:first-child td:nth-child(${colCount})`)
  await expectCellHasRing(lastColCell)
})

test('Ctrl+←でデータ端（最初のデータ列）へジャンプする', async ({ page }) => {
  // 最初の行の最後の列をクリック
  const headerCells = page.locator('thead th')
  const colCount = await headerCells.count()
  const firstRowLastCell = page.locator(`tbody tr:first-child td:nth-child(${colCount})`)
  await firstRowLastCell.click()

  // Ctrl+Left を押す
  await page.keyboard.press('Control+ArrowLeft')

  // 最初のデータ列（名前列=2番目）にジャンプしたことを確認
  const firstCell = page.locator('tbody tr:first-child td:nth-child(2)')
  await expectCellHasRing(firstCell)
})
