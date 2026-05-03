import { describe, expect, it } from 'vitest'
import { coerceToType, validateCell } from '@/domain/validator'
import type { ColumnDef } from '@/types/schema'

describe('coerceToType', () => {
  describe('integer', () => {
    it('converts string to integer', () => {
      expect(coerceToType('42', 'integer')).toBe(42)
    })
    it('returns null for empty string', () => {
      expect(coerceToType('', 'integer')).toBeNull()
    })
    it('returns null for null', () => {
      expect(coerceToType(null, 'integer')).toBeNull()
    })
    it('returns the string unchanged when not a number', () => {
      expect(coerceToType('abc', 'integer')).toBe('abc')
    })
    it('truncates decimal strings to integer', () => {
      expect(coerceToType('3.9', 'integer')).toBe(3)
    })
  })

  describe('number', () => {
    it('converts string to float', () => {
      expect(coerceToType('3.14', 'number')).toBeCloseTo(3.14)
    })
    it('returns null for empty string', () => {
      expect(coerceToType('', 'number')).toBeNull()
    })
    it('returns the string unchanged when not a number', () => {
      expect(coerceToType('xyz', 'number')).toBe('xyz')
    })
  })

  describe('boolean', () => {
    it('returns true for true', () => {
      expect(coerceToType(true, 'boolean')).toBe(true)
    })
    it('returns true for string "true"', () => {
      expect(coerceToType('true', 'boolean')).toBe(true)
    })
    it('returns true for string "1"', () => {
      expect(coerceToType('1', 'boolean')).toBe(true)
    })
    it('returns false for "false"', () => {
      expect(coerceToType('false', 'boolean')).toBe(false)
    })
    it('returns false for "0"', () => {
      expect(coerceToType('0', 'boolean')).toBe(false)
    })
  })

  describe('string passthrough', () => {
    it('returns value as-is for string type', () => {
      expect(coerceToType('hello', 'string')).toBe('hello')
    })
    it('returns value as-is for enum type', () => {
      expect(coerceToType('fire', 'enum')).toBe('fire')
    })
  })
})

describe('validateCell', () => {
  const col = (overrides: Partial<ColumnDef>): ColumnDef => ({
    key: 'val',
    displayName: 'Val',
    type: 'string',
    ...overrides,
  })

  describe('required rule', () => {
    it('returns error for null when required', () => {
      const err = validateCell(null, col({ validation: { required: true } }))
      expect(err?.rule).toBe('required')
    })
    it('returns error for empty string when required', () => {
      const err = validateCell('', col({ validation: { required: true } }))
      expect(err?.rule).toBe('required')
    })
    it('returns null for non-empty value when required', () => {
      expect(validateCell('hello', col({ validation: { required: true } }))).toBeNull()
    })
  })

  describe('no validation rule', () => {
    it('returns null when no validation defined', () => {
      expect(validateCell(null, col({}))).toBeNull()
    })
  })

  describe('integer min/max', () => {
    const intCol = col({ type: 'integer', validation: { min: 0, max: 100 } })

    it('returns null for value within range', () => {
      expect(validateCell(50, intCol)).toBeNull()
    })
    it('returns min error when below minimum', () => {
      const err = validateCell(-1, intCol)
      expect(err?.rule).toBe('min')
    })
    it('returns max error when above maximum', () => {
      const err = validateCell(101, intCol)
      expect(err?.rule).toBe('max')
    })
    it('returns null at boundary min value', () => {
      expect(validateCell(0, intCol)).toBeNull()
    })
    it('returns null at boundary max value', () => {
      expect(validateCell(100, intCol)).toBeNull()
    })
    it('returns type error for non-integer', () => {
      const err = validateCell('abc', intCol)
      expect(err?.rule).toBe('type')
    })
  })

  describe('number min/max', () => {
    const numCol = col({ type: 'number', validation: { min: 0.5, max: 9.5 } })

    it('returns null for value within range', () => {
      expect(validateCell(5, numCol)).toBeNull()
    })
    it('returns min error when below minimum', () => {
      expect(validateCell(0.4, numCol)?.rule).toBe('min')
    })
    it('returns max error when above maximum', () => {
      expect(validateCell(9.6, numCol)?.rule).toBe('max')
    })
  })

  describe('string maxLength', () => {
    const strCol = col({ type: 'string', validation: { maxLength: 5 } })

    it('returns null when within maxLength', () => {
      expect(validateCell('hello', strCol)).toBeNull()
    })
    it('returns maxLength error when exceeding limit', () => {
      expect(validateCell('toolong', strCol)?.rule).toBe('maxLength')
    })
  })
})
