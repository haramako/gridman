/**
 * パフォーマンステスト用ダミーデータ生成
 * 出力先: var/dummy/ (gitignore対象)
 *
 * Usage: npm run dev:gen-dummy
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dest = join(root, 'var', 'dummy')

const TABLE_COUNT = 10
const ROW_COUNT = 2000
const COL_COUNT = 30

const ENUM_VALUES = ['alpha', 'beta', 'gamma', 'delta', 'epsilon']

mkdirSync(dest, { recursive: true })

function makeColumns(tableIndex) {
  const cols = []
  for (let i = 0; i < COL_COUNT; i++) {
    const key = `col_${String(i).padStart(2, '0')}`
    if (i === 0) {
      cols.push({ key, displayName: '名前', type: 'string', isDisplayName: true })
      continue
    }
    const bucket = i % 5
    if (bucket === 0) cols.push({ key, displayName: `整数${i}`, type: 'integer', validation: { min: 0, max: 9999 } })
    else if (bucket === 1) cols.push({ key, displayName: `数値${i}`, type: 'number' })
    else if (bucket === 2) cols.push({ key, displayName: `文字${i}`, type: 'string' })
    else if (bucket === 3) cols.push({ key, displayName: `フラグ${i}`, type: 'boolean' })
    else cols.push({ key, displayName: `区分${i}`, type: 'enum', enumValues: ENUM_VALUES })
  }
  return cols
}

function makeRow(tableIndex, rowIndex, cols) {
  const row = {
    _id: `t${tableIndex}r${String(rowIndex).padStart(5, '0')}`,
    _order: rowIndex * 1000,
  }
  for (const col of cols) {
    if (col.key === 'col_00') {
      row[col.key] = `T${tableIndex}_行${String(rowIndex).padStart(4, '0')}`
    } else if (col.type === 'integer') {
      row[col.key] = Math.floor(Math.random() * 10000)
    } else if (col.type === 'number') {
      row[col.key] = Math.round(Math.random() * 1000 * 100) / 100
    } else if (col.type === 'string') {
      row[col.key] = `val_${col.key}_${rowIndex % 100}`
    } else if (col.type === 'boolean') {
      row[col.key] = rowIndex % 3 === 0
    } else if (col.type === 'enum') {
      row[col.key] = ENUM_VALUES[rowIndex % ENUM_VALUES.length]
    }
  }
  return row
}

const tableNames = Array.from(
  { length: TABLE_COUNT },
  (_, i) => `table_${String(i).padStart(2, '0')}`
)

writeFileSync(
  join(dest, 'project.json'),
  JSON.stringify(
    { version: 1, name: 'ダミー（パフォーマンステスト）', tables: tableNames, views: [] },
    null,
    2
  ),
  'utf-8'
)

for (let t = 0; t < TABLE_COUNT; t++) {
  const name = tableNames[t]
  const cols = makeColumns(t)

  writeFileSync(
    join(dest, `${name}.schema.json`),
    JSON.stringify({ name, displayName: `テーブル${String(t).padStart(2, '0')}`, columns: cols }, null, 2),
    'utf-8'
  )

  const lines = Array.from({ length: ROW_COUNT }, (_, i) =>
    JSON.stringify(makeRow(t, i + 1, cols))
  ).join('\n') + '\n'
  writeFileSync(join(dest, `${name}.jsonl`), lines, 'utf-8')

  console.log(`  ${name}: ${ROW_COUNT} 行 × ${COL_COUNT} カラム`)
}

console.log(`\n完了: ${dest}`)
