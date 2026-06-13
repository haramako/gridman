import { test, expect } from '@playwright/test'
import { execSync } from 'node:child_process'
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

test.afterEach(async () => {
  execSync('npm run e2e:reset', { stdio: 'inherit' })
})

test('Ctrl+S で保存し、リロード後も変更が反映されている', async ({ page }) => {
  // HP列（3番目のtd）を編集する
  const hpCell = page.locator('tbody tr:first-child td:nth-child(3)')
  await hpCell.click()
  await page.keyboard.press('Enter')
  const cellInput = hpCell.locator('input')
  await cellInput.focus()
  await cellInput.fill('777')
  await cellInput.press('Enter')

  // 値が確定されたことを確認
  await expect(hpCell).toHaveText('777')

  // Ctrl+S で保存
  await page.keyboard.press('Control+s')

  // 保存完了を待つ（ボタンが「保存済み」になる）
  await expect(page.getByRole('button', { name: '保存済み' })).toBeVisible({ timeout: 5000 })

  // ページをリロード
  await page.reload()
  await page.waitForSelector('tbody tr')

  // リロード後も変更が反映されていることを確認
  const hpCellAfterReload = page.locator('tbody tr:first-child td:nth-child(3)')
  await expect(hpCellAfterReload).toHaveText('777')
})
