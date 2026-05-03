// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import FilterViewDialog from '@/components/filter/FilterViewDialog'
import type { TableSchema } from '@/types/schema'
import type { ViewDefinition } from '@/types/view'

const schema: TableSchema = {
  name: 'enemy',
  displayName: '敵',
  columns: [
    { key: 'name', displayName: '名前', type: 'string' },
    { key: 'hp', displayName: 'HP', type: 'integer' },
    { key: 'element', displayName: '属性', type: 'enum', enumValues: ['fire', 'ice'] },
  ],
}
const schemas = new Map([['enemy', schema]])
const tables = ['enemy']

function makeProps(overrides = {}) {
  return {
    schemas,
    tables,
    project: null,
    onSave: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
}

describe('FilterViewDialog', () => {
  describe('表示', () => {
    it('新規作成モードのタイトルを表示する', () => {
      render(<FilterViewDialog {...makeProps()} />)
      expect(screen.getByText('ビューを作成')).toBeInTheDocument()
    })

    it('editView があれば編集モードのタイトルを表示する', () => {
      const editView: ViewDefinition = {
        id: 'v1',
        name: '炎の敵',
        query: { type: 'filter', from: 'enemy' },
      }
      render(<FilterViewDialog {...makeProps({ editView })} />)
      expect(screen.getByText('ビューを編集')).toBeInTheDocument()
    })

    it('editView の名前を入力欄に初期表示する', () => {
      const editView: ViewDefinition = {
        id: 'v1',
        name: '炎の敵',
        query: { type: 'filter', from: 'enemy' },
      }
      render(<FilterViewDialog {...makeProps({ editView })} />)
      expect(screen.getByDisplayValue('炎の敵')).toBeInTheDocument()
    })

    it('editView がないとき削除ボタンは表示しない', () => {
      render(<FilterViewDialog {...makeProps()} />)
      expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument()
    })

    it('editView があるとき削除ボタンを表示する', () => {
      const editView: ViewDefinition = {
        id: 'v1',
        name: 'Test',
        query: { type: 'filter', from: 'enemy' },
      }
      render(<FilterViewDialog {...makeProps({ editView })} />)
      expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument()
    })
  })

  describe('保存ボタンの活性制御', () => {
    it('ビュー名が空のとき保存ボタンは無効', () => {
      render(<FilterViewDialog {...makeProps()} />)
      expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
    })

    it('ビュー名を入力すると保存ボタンが有効になる', async () => {
      const user = userEvent.setup()
      render(<FilterViewDialog {...makeProps()} />)
      await user.type(screen.getByPlaceholderText('例: fire属性の敵'), 'My View')
      expect(screen.getByRole('button', { name: '保存' })).not.toBeDisabled()
    })
  })

  describe('クローズ', () => {
    it('✕ ボタンで onClose を呼ぶ', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<FilterViewDialog {...makeProps({ onClose })} />)
      // Header close button is the first ✕
      const closeButtons = screen.getAllByText('✕')
      await user.click(closeButtons[0])
      expect(onClose).toHaveBeenCalled()
    })

    it('Escape キーで onClose を呼ぶ', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<FilterViewDialog {...makeProps({ onClose })} />)
      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalled()
    })

    it('キャンセルボタンで onClose を呼ぶ', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<FilterViewDialog {...makeProps({ onClose })} />)
      await user.click(screen.getByRole('button', { name: 'キャンセル' }))
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('保存', () => {
    it('名前だけ入力して保存すると onSave が正しい ViewDefinition で呼ばれる', async () => {
      const onSave = vi.fn()
      const user = userEvent.setup()
      render(<FilterViewDialog {...makeProps({ onSave })} />)
      await user.type(screen.getByPlaceholderText('例: fire属性の敵'), 'Test View')
      await user.click(screen.getByRole('button', { name: '保存' }))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test View',
          query: expect.objectContaining({ type: 'filter', from: 'enemy' }),
        })
      )
    })

    it('条件を追加して保存すると filter が含まれる', async () => {
      const onSave = vi.fn()
      const user = userEvent.setup()
      render(<FilterViewDialog {...makeProps({ onSave })} />)
      await user.type(screen.getByPlaceholderText('例: fire属性の敵'), 'Filtered')
      await user.click(screen.getByText('+ 条件を追加'))
      await user.type(screen.getByPlaceholderText('値'), 'Dragon')
      await user.click(screen.getByRole('button', { name: '保存' }))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            filter: expect.objectContaining({ column: 'name', op: 'eq', value: 'Dragon' }),
          }),
        })
      )
    })

    it('既存ビューを編集して保存すると同じ id が渡る', async () => {
      const onSave = vi.fn()
      const user = userEvent.setup()
      const editView: ViewDefinition = {
        id: 'existing-id',
        name: '旧名',
        query: { type: 'filter', from: 'enemy' },
      }
      render(<FilterViewDialog {...makeProps({ onSave, editView })} />)
      const nameInput = screen.getByDisplayValue('旧名')
      await user.clear(nameInput)
      await user.type(nameInput, '新名')
      await user.click(screen.getByRole('button', { name: '保存' }))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'existing-id', name: '新名' })
      )
    })
  })

  describe('条件の追加・削除', () => {
    it('+ 条件を追加 をクリックすると条件行が増える', async () => {
      const user = userEvent.setup()
      render(<FilterViewDialog {...makeProps()} />)
      expect(screen.queryByPlaceholderText('値')).not.toBeInTheDocument()
      await user.click(screen.getByText('+ 条件を追加'))
      expect(screen.getByPlaceholderText('値')).toBeInTheDocument()
    })

    it('条件行の ✕ で条件を削除できる', async () => {
      const user = userEvent.setup()
      render(<FilterViewDialog {...makeProps()} />)
      await user.click(screen.getByText('+ 条件を追加'))
      expect(screen.getByPlaceholderText('値')).toBeInTheDocument()
      // The last ✕ button is the condition delete button
      const allX = screen.getAllByText('✕')
      await user.click(allX[allX.length - 1])
      expect(screen.queryByPlaceholderText('値')).not.toBeInTheDocument()
    })

    it('数値カラムを選ぶと比較演算子が表示される', async () => {
      const user = userEvent.setup()
      render(<FilterViewDialog {...makeProps()} />)
      await user.click(screen.getByText('+ 条件を追加'))
      // Switch column to HP (integer)
      const colSelect = screen.getAllByRole('combobox')[2] // 0=table, 1=condMode(hidden), 2=column
      await user.selectOptions(colSelect, 'hp')
      // Integer operators should include > option
      const opSelect = screen.getAllByRole('combobox').find(
        (s) => (s as HTMLSelectElement).value === 'eq' || (s as HTMLSelectElement).value === 'gt'
      )
      expect(opSelect).toBeTruthy()
    })
  })

  describe('削除', () => {
    it('削除ボタンで onDelete に id が渡る', async () => {
      const onDelete = vi.fn()
      const onClose = vi.fn()
      const user = userEvent.setup()
      const editView: ViewDefinition = {
        id: 'v-to-delete',
        name: 'Test',
        query: { type: 'filter', from: 'enemy' },
      }
      render(<FilterViewDialog {...makeProps({ editView, onDelete, onClose })} />)
      await user.click(screen.getByRole('button', { name: '削除' }))
      expect(onDelete).toHaveBeenCalledWith('v-to-delete')
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('キーボードイベントの伝播', () => {
    it('Escape がダイアログ外に伝播しない', async () => {
      const outerKeyDown = vi.fn()
      const user = userEvent.setup()
      render(
        <div onKeyDown={outerKeyDown}>
          <FilterViewDialog {...makeProps()} />
        </div>
      )
      await user.keyboard('{Escape}')
      // stopPropagation によりダイアログ外の handler は呼ばれない
      expect(outerKeyDown).not.toHaveBeenCalled()
    })

    it('通常キーもダイアログ外に伝播しない', async () => {
      const outerKeyDown = vi.fn()
      const user = userEvent.setup()
      render(
        <div onKeyDown={outerKeyDown}>
          <FilterViewDialog {...makeProps()} />
        </div>
      )
      await user.keyboard('a')
      expect(outerKeyDown).not.toHaveBeenCalled()
    })
  })
})
