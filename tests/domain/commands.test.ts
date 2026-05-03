import { describe, expect, it, vi } from 'vitest'
import { CommandHistory, CompositeCommand, EditCellCommand } from '@/domain/commands'

describe('CommandHistory', () => {
  it('starts with empty stacks', () => {
    const h = new CommandHistory()
    expect(h.canUndo).toBe(false)
    expect(h.canRedo).toBe(false)
  })

  it('executes command and enables undo', () => {
    const h = new CommandHistory()
    const exec = vi.fn()
    const undo = vi.fn()
    h.execute({ execute: exec, undo, description: 'test' })
    expect(exec).toHaveBeenCalledOnce()
    expect(h.canUndo).toBe(true)
    expect(h.canRedo).toBe(false)
  })

  it('undo calls undo and enables redo', () => {
    const h = new CommandHistory()
    const exec = vi.fn()
    const undo = vi.fn()
    h.execute({ execute: exec, undo, description: 'test' })
    h.undo()
    expect(undo).toHaveBeenCalledOnce()
    expect(h.canUndo).toBe(false)
    expect(h.canRedo).toBe(true)
  })

  it('redo re-executes and disables redo', () => {
    const h = new CommandHistory()
    const exec = vi.fn()
    const undo = vi.fn()
    h.execute({ execute: exec, undo, description: 'test' })
    h.undo()
    h.redo()
    expect(exec).toHaveBeenCalledTimes(2)
    expect(h.canRedo).toBe(false)
    expect(h.canUndo).toBe(true)
  })

  it('new execute clears redo stack', () => {
    const h = new CommandHistory()
    const noop = { execute: vi.fn(), undo: vi.fn(), description: '' }
    h.execute(noop)
    h.undo()
    expect(h.canRedo).toBe(true)
    h.execute(noop)
    expect(h.canRedo).toBe(false)
  })

  it('undo on empty stack does nothing', () => {
    const h = new CommandHistory()
    expect(() => h.undo()).not.toThrow()
  })

  it('redo on empty stack does nothing', () => {
    const h = new CommandHistory()
    expect(() => h.redo()).not.toThrow()
  })

  it('clear empties both stacks', () => {
    const h = new CommandHistory()
    const noop = { execute: vi.fn(), undo: vi.fn(), description: '' }
    h.execute(noop)
    h.clear()
    expect(h.canUndo).toBe(false)
    expect(h.canRedo).toBe(false)
  })
})

describe('EditCellCommand', () => {
  it('execute sets new value', () => {
    let cell = 'old'
    const cmd = new EditCellCommand(
      (v) => { cell = v as string },
      () => cell,
      'new'
    )
    cmd.execute()
    expect(cell).toBe('new')
  })

  it('undo restores previous value', () => {
    let cell = 'old'
    const cmd = new EditCellCommand(
      (v) => { cell = v as string },
      () => cell,
      'new'
    )
    cmd.execute()
    cmd.undo()
    expect(cell).toBe('old')
  })

  it('uses default description when none provided', () => {
    const cmd = new EditCellCommand(vi.fn(), () => null, 'x')
    expect(cmd.description).toBe('セル編集')
  })

  it('uses provided description', () => {
    const cmd = new EditCellCommand(vi.fn(), () => null, 'x', 'custom desc')
    expect(cmd.description).toBe('custom desc')
  })
})

describe('CompositeCommand', () => {
  it('execute runs all commands in order', () => {
    const order: number[] = []
    const cmds = [1, 2, 3].map((n) => ({
      execute: vi.fn(() => order.push(n)),
      undo: vi.fn(),
      description: `cmd${n}`,
    }))
    const composite = new CompositeCommand(cmds)
    composite.execute()
    expect(order).toEqual([1, 2, 3])
  })

  it('undo runs commands in reverse order', () => {
    const order: number[] = []
    const cmds = [1, 2, 3].map((n) => ({
      execute: vi.fn(),
      undo: vi.fn(() => order.push(n)),
      description: `cmd${n}`,
    }))
    const composite = new CompositeCommand(cmds)
    composite.execute()
    composite.undo()
    expect(order).toEqual([3, 2, 1])
  })

  it('uses default description based on count', () => {
    const cmd = new CompositeCommand([
      { execute: vi.fn(), undo: vi.fn(), description: '' },
      { execute: vi.fn(), undo: vi.fn(), description: '' },
    ])
    expect(cmd.description).toBe('2件の操作')
  })

  it('uses provided description', () => {
    const cmd = new CompositeCommand([], 'batch paste')
    expect(cmd.description).toBe('batch paste')
  })
})
