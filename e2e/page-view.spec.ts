import { test, expect } from '@playwright/test';

test.describe('ページビュー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?project=var/sample&table=enemy');
    // Wait for the spreadsheet to load
    await page.waitForSelector('aside');
    await page.waitForLoadState('networkidle');
  });

  test('ページビューを作成して表示できる', async ({ page }) => {
    // 左パネルの「+ ページ」ボタンをクリック
    const pageButton = page.locator('aside').getByText('+ ページ');
    await expect(pageButton).toBeVisible({ timeout: 10000 });
    await pageButton.click();

    // ページテンプレートダイアログが開くのを待つ
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // テンプレート名を入力
    await dialog.getByLabel('テンプレート名').fill('テストページ');

    // フィールドを追加
    await dialog.getByText('+ フィールドを追加').click();

    // 保存ボタンをクリック
    await dialog.getByRole('button', { name: '保存' }).click();

    // ダイアログが閉じるのを待つ
    await expect(dialog).not.toBeVisible();

    // 左メニューのビューセクションに作成したページが表示される
    const createdPageButton = page.locator('aside').getByText('テストページ');
    await expect(createdPageButton).toBeVisible();

    // ページをクリックして表示
    await createdPageButton.click();

    // ページビューが表示されることを確認（カード形式のレイアウト）
    await expect(page.locator('text=テストページ')).toBeVisible();
  });
});
