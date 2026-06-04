// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import Cell from '@/components/spreadsheet/Cell'
import type { ColumnDef } from '@/types/schema'
import type { Row } from '@/types/row'

// ---- store / context mocks ----

vi.mock('@/stores/project.store', () => ({ useProjectStore: vi.fn() }))
vi.mock('@/stores/selection.store', () => ({ useSelectionStore: vi.fn() }))
vi.mock('@/components/spreadsheet/SpreadsheetGrid', () => ({ useGridContext: vi.fn() }))

import { useProjectStore } from '@/stores/project.store'
import { useSelectionStore } from '@/stores/selection.store'
import { useGridContext } from '@/components/spreadsheet/SpreadsheetGrid'

const mockNavigate = vi.fn()
const mockFocusContainer = vi.fn()
const mockSetCursor = vi.fn()
const mockSetEditing = vi.fn()
const mockUpdateCell = vi.fn()
const mockClearEditInitialValue = vi.fn()
const mockSetJsonPanelCell = vi.fn()
const mockOnCellMouseDown = vi.fn()

const baseSelectionState = {
  cursor: null,
  editingCell: null,
  editInitialValue: null,
  jsonPanelCell: null,
  setCursor: mockSetCursor,
  setEditing: mockSetEditing,
  clearEditInitialValue: mockClearEditInitialValue,
  setJsonPanelCell: mockSetJsonPanelCell,
}

const baseProjectState = {
  updateCell: mockUpdateCell,
  dirtyRowIds: new Map(),
  dirtyCellIds: new Map(),
}

const baseGridContext = {
  navigate: mockNavigate,
  selectionBounds: null,
  focusContainer: mockFocusContainer,
  onCellMouseDown: mockOnCellMouseDown,
  filteredRows: [],
  columns: [],
  readOnly: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useSelectionStore).mockReturnValue(baseSelectionState as any)
  vi.mocked(useProjectStore).mockReturnValue(baseProjectState as any)
  vi.mocked(useGridContext).mockReturnValue(baseGridContext)
})

// ---- helpers ----

const row: Row = { _id: 'r1', _order: 0, name: 'スライム', hp: 50 }

const col = (overrides: Partial<ColumnDef> = {}): ColumnDef => ({
  key: 'name',
  displayName: '名前',
  type: 'string',
  ...overrides,
})

function renderCell(overrides: {
  row?: Row
  col?: ColumnDef
  selectionState?: object
  gridContext?: object
} = {}) {
  if (overrides.selectionState) {
    vi.mocked(useSelectionStore).mockReturnValue({
      ...baseSelectionState,
      ...overrides.selectionState,
    } as any)
  }
  if (overrides.gridContext) {
    vi.mocked(useGridContext).mockReturnValue({
      ...baseGridContext,
      ...overrides.gridContext,
    })
  }

  const r = overrides.row ?? row
  const c = overrides.col ?? col()

  return render(
    <table>
      <tbody>
        <tr>
          <Cell
            row={r}
            col={c}
            colIndex={0}
            gridRowIndex={0}
            tableName="enemy"
            schemas={new Map()}
            tables={new Map()}
            project={null}
          />
        </tr>
      </tbody>
    </table>
  )
}

// ---- tests ----

describe('Cell', () => {
  describe('表示', () => {
    it('セルの値を表示する', () => {
      renderCell()
      expect(screen.getByText('スライム')).toBeInTheDocument()
    })

    it('null 値のセルは空白を表示する', () => {
      renderCell({ row: { ...row, name: null } })
      const td = screen.getByRole('cell')
      expect(td.textContent).toBe('')
    })

    it('バリデーション違反セルは ⚠ マークと _invalid の値を表示する', () => {
      const invalidRow: Row = {
        _id: 'r1',
        _order: 0,
        name: 'ok',
        _invalid: { name: 'bad!!value' },
      }
      renderCell({ row: invalidRow })
      expect(screen.getByText('⚠')).toBeInTheDocument()
      expect(screen.getByText('bad!!value')).toBeInTheDocument()
    })

    it('json 型は [JSON] と表示する', () => {
      renderCell({ col: col({ key: 'data', type: 'json' }), row: { ...row, data: { x: 1 } } })
      expect(screen.getByText('[JSON]')).toBeInTheDocument()
    })
  })

  describe('クリック操作', () => {
    it('クリックで onCellMouseDown が呼ばれる', async () => {
      const user = userEvent.setup()
      renderCell()
      await user.click(screen.getByRole('cell'))
      expect(mockOnCellMouseDown).toHaveBeenCalledWith(
        expect.any(Object),
        { rowId: 'r1', colKey: 'name', tableName: 'enemy' }
      )
    })

    it('ダブルクリックで setEditing が呼ばれ input が表示される', async () => {
      const user = userEvent.setup()
      renderCell()
      await user.dblClick(screen.getByRole('cell'))
      expect(mockSetEditing).toHaveBeenCalledWith({ rowId: 'r1', colKey: 'name', tableName: 'enemy' })
    })
  })

  describe('編集モード（string 型）', () => {
    const editingState = {
      editingCell: { rowId: 'r1', colKey: 'name', tableName: 'enemy' },
      editInitialValue: null,
    }

    it('editing 中は input が表示される', () => {
      renderCell({ selectionState: editingState })
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('現在の値が input の初期値になる', () => {
      renderCell({ selectionState: editingState })
      expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('スライム')
    })

    it('値を変更せずに Enter すると updateCell は呼ばれず、次行へ navigate する', async () => {
      const user = userEvent.setup()
      renderCell({ selectionState: editingState })
      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.keyboard('{Enter}')
      expect(mockUpdateCell).not.toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('r1', 'name', 1, 0)
    })

    it('Escape でキャンセルし setEditing(null) が呼ばれる', async () => {
      const user = userEvent.setup()
      renderCell({ selectionState: editingState })
      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.keyboard('{Escape}')
      expect(mockSetEditing).toHaveBeenCalledWith(null)
      expect(mockUpdateCell).not.toHaveBeenCalled()
    })

    it('値を変更せずに Tab すると updateCell は呼ばれず、右へ navigate する', async () => {
      const user = userEvent.setup()
      renderCell({ selectionState: editingState })
      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.tab()
      expect(mockUpdateCell).not.toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('r1', 'name', 0, 1)
    })

    it('値を変更せずに Shift+Tab すると updateCell は呼ばれず、左へ navigate する', async () => {
      const user = userEvent.setup()
      renderCell({ selectionState: editingState })
      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.tab({ shift: true })
      expect(mockUpdateCell).not.toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('r1', 'name', 0, -1)
    })

    it('値を変更して Enter すると updateCell が呼ばれる', async () => {
      const user = userEvent.setup()
      renderCell({ selectionState: editingState })
      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.clear(input)
      await user.type(input, 'ゴブリン')
      await user.keyboard('{Enter}')
      expect(mockUpdateCell).toHaveBeenCalledWith('enemy', 'r1', 'name', 'ゴブリン')
      expect(mockNavigate).toHaveBeenCalledWith('r1', 'name', 1, 0)
    })

    it('editInitialValue があれば type-to-edit の値で開始する', () => {
      renderCell({
        selectionState: {
          editingCell: { rowId: 'r1', colKey: 'name', tableName: 'enemy' },
          editInitialValue: 'g',
        },
      })
      expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('g')
    })
  })

  describe('boolean 型', () => {
    const boolCol = col({ key: 'active', type: 'boolean' })
    const boolRow: Row = { _id: 'r1', _order: 0, active: true }

    it('true のとき ✓ を表示する', () => {
      renderCell({ row: boolRow, col: boolCol })
      expect(screen.getByText('✓')).toBeInTheDocument()
    })

    it('false のとき空白を表示する', () => {
      renderCell({ row: { ...boolRow, active: false }, col: boolCol })
      expect(screen.queryByText('✓')).not.toBeInTheDocument()
    })

    it('クリックで updateCell が現在値の反転で呼ばれる', async () => {
      const user = userEvent.setup()
      renderCell({ row: boolRow, col: boolCol })
      await user.click(screen.getByRole('cell'))
      expect(mockUpdateCell).toHaveBeenCalledWith('enemy', 'r1', 'active', false)
    })
  })

  describe('readOnly', () => {
    it('readOnly のとき dblClick しても setEditing が呼ばれない', async () => {
      const user = userEvent.setup()
      render(
        <table>
          <tbody>
            <tr>
              <Cell
                row={row}
                col={col()}
                colIndex={0}
                gridRowIndex={0}
                tableName="enemy"
                schemas={new Map()}
                tables={new Map()}
                project={null}
                readOnly
              />
            </tr>
          </tbody>
        </table>
      )
      await user.dblClick(screen.getByRole('cell'))
      expect(mockSetEditing).not.toHaveBeenCalled()
    })
  })
})
