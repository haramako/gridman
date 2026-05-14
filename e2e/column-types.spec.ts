import { test, expect } from '@playwright/test'
import path from 'node:path'

const SAMPLE_PATH = path.resolve('var/e2e-test')

// enemy table column layout (td indices):
//   1: row number, 2: name, 3: hp, 4: attack, 5: element(enum), 6: dropItemId(ref)
// Row 1 data: スライム, hp=10, attack=3, element=water, dropItemId → 回復ポーション

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  const input = page.getByPlaceholder(/パス/)
  await input.fill(SAMPLE_PATH)
  await input.press('Enter')
  await page.waitForURL('**/editor**')
  await page.waitForSelector('tbody tr')
})

test('enum型: ダブルクリックでセレクトが開き、選択した値が反映される', async ({ page }) => {
  const elementCell = page.locator('tbody tr:first-child td:nth-child(5)')

  await expect(elementCell).toContainText('water')

  await elementCell.dblclick()

  const select = elementCell.locator('select')
  await expect(select).toBeVisible()

  // elementType enum values: fire, water, earth, wind, light, dark, none
  await select.selectOption('fire')
  await page.keyboard.press('Enter')

  await expect(elementCell).toContainText('fire')
})

test('ref型: isDisplayName列の値が表示され、セレクトで別の参照先を選択できる', async ({ page }) => {
  const refCell = page.locator('tbody tr:first-child td:nth-child(6)')

  // スライムのdropItemId(x1y2z3)はitemテーブルのisDisplayName列(name)で "回復ポーション"
  await expect(refCell).toContainText('回復ポーション')

  await refCell.dblclick()

  const select = refCell.locator('select')
  await expect(select).toBeVisible()

  // ドロップダウンにアイテムのname列が表示される
  const options = select.locator('option')
  await expect(options.filter({ hasText: '回復ポーション' })).toHaveCount(1)
  await expect(options.filter({ hasText: '竜の牙' })).toHaveCount(1)
  await expect(options.filter({ hasText: '鉄の剣' })).toHaveCount(1)

  await select.selectOption({ label: '竜の牙' })
  await page.keyboard.press('Enter')

  await expect(refCell).toContainText('竜の牙')
})

test('バリデーション違反: 必須項目を空にすると赤枠とツールチップエラーが表示される', async ({ page }) => {
  const nameCell = page.locator('tbody tr:first-child td:nth-child(2)')

  await nameCell.dblclick()

  const input = nameCell.locator('input')
  await expect(input).toBeVisible()

  await input.fill('')
  await input.press('Enter')

  // 赤枠クラスが付与される
  await expect(nameCell).toHaveClass(/ring-red-400/)

  // title属性にエラーメッセージが入る
  const title = await nameCell.getAttribute('title')
  expect(title).toBeTruthy()

  // ⚠ アイコンが表示される
  await expect(nameCell.locator('span.text-red-500')).toBeVisible()
})
