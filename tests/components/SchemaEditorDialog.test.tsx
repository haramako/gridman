// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SchemaEditorDialog from '@/components/schema/SchemaEditorDialog'
import type { TableSchema } from '@/types/schema'

const schema: TableSchema = {
  name: 'enemy',
  displayName: '敵キャラクター',
  columns: [
    { key: 'name', displayName: '名前', type: 'string', isDisplayName: true },
    { key: 'hp', displayName: 'HP', type: 'integer', validation: { required: true, min: 1 } },
    { key: 'element', displayName: '属性', type: 'enum', enumValues: ['fire', 'ice'] },
  ],
}

function makeProps(overrides = {}) {
  return {
    tableName: 'enemy',
    schema,
    tables: ['enemy', 'item'],
    onSave: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
}

describe('SchemaEditorDialog', () => {
  describe('表示', () => {
    it('タイトルにテーブル名を表示する', () => {
      render(<SchemaEditorDialog {...makeProps()} />)
      expect(screen.getByText(/スキーマ編集.*enemy/)).toBeInTheDocument()
    })

    it('テーブル表示名を入力欄に初期表示する', () => {
      render(<SchemaEditorDialog {...makeProps()} />)
      expect(screen.getByDisplayValue('敵キャラクター')).toBeInTheDocument()
    })

    it('既存カラムのキーを表示する', () => {
      render(<SchemaEditorDialog {...makeProps()} />)
      expect(screen.getByDisplayValue('name')).toBeInTheDocument()
      expect(screen.getByDisplayValue('hp')).toBeInTheDocument()
    })
  })

  describe('保存ボタンの活性制御', () => {
    it('初期状態では保存ボタンが有効', () => {
      render(<SchemaEditorDialog {...makeProps()} />)
      expect(screen.getByRole('button', { name: '保存' })).not.toBeDisabled()
    })

    it('テーブル表示名を空にすると保存ボタンが無効になる', async () => {
      const user = userEvent.setup()
      render(<SchemaEditorDialog {...makeProps()} />)
      const input = screen.getByDisplayValue('敵キャラクター')
      await user.clear(input)
      expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
    })
  })

  describe('カラム追加', () => {
    it('+ カラムを追加 をクリックすると新しい行が追加される', async () => {
      const user = userEvent.setup()
      render(<SchemaEditorDialog {...makeProps()} />)
      const before = screen.getAllByPlaceholderText('key').length
      await user.click(screen.getByText('+ カラムを追加'))
      expect(screen.getAllByPlaceholderText('key').length).toBe(before + 1)
    })
  })

  describe('カラム削除', () => {
    it('✕ ボタンでカラムを削除できる', async () => {
      const user = userEvent.setup()
      render(<SchemaEditorDialog {...makeProps()} />)
      const before = screen.getAllByPlaceholderText('key').length
      const deleteButtons = screen.getAllByTitle('削除')
      await user.click(deleteButtons[0])
      expect(screen.getAllByPlaceholderText('key').length).toBe(before - 1)
    })
  })

  describe('保存', () => {
    it('保存ボタンで onSave が TableSchema で呼ばれる', async () => {
      const onSave = vi.fn()
      const user = userEvent.setup()
      render(<SchemaEditorDialog {...makeProps({ onSave })} />)
      await user.click(screen.getByRole('button', { name: '保存' }))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'enemy',
          displayName: '敵キャラクター',
          columns: expect.arrayContaining([
            expect.objectContaining({ key: 'name', type: 'string' }),
          ]),
        })
      )
    })

    it('テーブル表示名を変更して保存できる', async () => {
      const onSave = vi.fn()
      const user = userEvent.setup()
      render(<SchemaEditorDialog {...makeProps({ onSave })} />)
      const input = screen.getByDisplayValue('敵キャラクター')
      await user.clear(input)
      await user.type(input, '新しい名前')
      await user.click(screen.getByRole('button', { name: '保存' }))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: '新しい名前' })
      )
    })
  })

  describe('クローズ', () => {
    it('✕ ボタンで onClose を呼ぶ', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<SchemaEditorDialog {...makeProps({ onClose })} />)
      const closeButton = screen.getAllByText('✕')[0]
      await user.click(closeButton)
      expect(onClose).toHaveBeenCalled()
    })

    it('Escape キーで onClose を呼ぶ', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<SchemaEditorDialog {...makeProps({ onClose })} />)
      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalled()
    })

    it('キャンセルボタンで onClose を呼ぶ', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<SchemaEditorDialog {...makeProps({ onClose })} />)
      await user.click(screen.getByRole('button', { name: 'キャンセル' }))
      expect(onClose).toHaveBeenCalled()
    })
  })
})
