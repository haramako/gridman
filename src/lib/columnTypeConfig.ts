import type { PageLayoutWidget } from '@/types/page';
import type { ColumnType } from '@/types/schema';

export type ColumnTypeConfig = {
  icon: string;
  defaultWidth: number;
  filterOps: readonly string[];
  filterValueWidget: 'text' | 'enum' | 'boolean';
  defaultWidget: PageLayoutWidget;
  emptyValue: '' | null;
  gridReadonly: boolean;
  supportsKbdEdit: boolean;
  supportsTypeToEdit: boolean;
  hasEnumValues: boolean;
  hasRefTable: boolean;
  validationGroup: 'number' | 'string' | 'other';
};

const OPS_STRING = ['eq', 'neq', 'contains', 'startsWith', 'isNull', 'isNotNull'] as const;
const OPS_NUMBER = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'isNull', 'isNotNull'] as const;
const OPS_ENUM = ['eq', 'neq', 'isNull', 'isNotNull'] as const;
const OPS_BOOL = ['eq', 'isNull', 'isNotNull'] as const;

export const COLUMN_TYPE_CONFIG: Record<ColumnType, ColumnTypeConfig> = {
  string: {
    icon: '🔤',
    defaultWidth: 150,
    filterOps: OPS_STRING,
    filterValueWidget: 'text',
    defaultWidget: 'text',
    emptyValue: '',
    gridReadonly: false,
    supportsKbdEdit: true,
    supportsTypeToEdit: true,
    hasEnumValues: false,
    hasRefTable: false,
    validationGroup: 'string',
  },
  integer: {
    icon: '🔢',
    defaultWidth: 100,
    filterOps: OPS_NUMBER,
    filterValueWidget: 'text',
    defaultWidget: 'number',
    emptyValue: null,
    gridReadonly: false,
    supportsKbdEdit: true,
    supportsTypeToEdit: true,
    hasEnumValues: false,
    hasRefTable: false,
    validationGroup: 'number',
  },
  number: {
    icon: '🔢',
    defaultWidth: 100,
    filterOps: OPS_NUMBER,
    filterValueWidget: 'text',
    defaultWidget: 'number',
    emptyValue: null,
    gridReadonly: false,
    supportsKbdEdit: true,
    supportsTypeToEdit: true,
    hasEnumValues: false,
    hasRefTable: false,
    validationGroup: 'number',
  },
  boolean: {
    icon: '☑',
    defaultWidth: 60,
    filterOps: OPS_BOOL,
    filterValueWidget: 'boolean',
    defaultWidget: 'checkbox',
    emptyValue: '',
    gridReadonly: false,
    supportsKbdEdit: false,
    supportsTypeToEdit: false,
    hasEnumValues: false,
    hasRefTable: false,
    validationGroup: 'other',
  },
  enum: {
    icon: '📋',
    defaultWidth: 120,
    filterOps: OPS_ENUM,
    filterValueWidget: 'enum',
    defaultWidget: 'select',
    emptyValue: '',
    gridReadonly: false,
    supportsKbdEdit: true,
    supportsTypeToEdit: false,
    hasEnumValues: true,
    hasRefTable: false,
    validationGroup: 'other',
  },
  ref: {
    icon: '🔗',
    defaultWidth: 160,
    filterOps: OPS_STRING,
    filterValueWidget: 'text',
    defaultWidget: 'text',
    emptyValue: '',
    gridReadonly: false,
    supportsKbdEdit: true,
    supportsTypeToEdit: false,
    hasEnumValues: false,
    hasRefTable: true,
    validationGroup: 'other',
  },
  'ref[]': {
    icon: '🔗',
    defaultWidth: 160,
    filterOps: OPS_STRING,
    filterValueWidget: 'text',
    defaultWidget: 'tag-list',
    emptyValue: '',
    gridReadonly: false,
    supportsKbdEdit: true,
    supportsTypeToEdit: false,
    hasEnumValues: false,
    hasRefTable: true,
    validationGroup: 'other',
  },
  json: {
    icon: '{}',
    defaultWidth: 80,
    filterOps: OPS_STRING,
    filterValueWidget: 'text',
    defaultWidget: 'json',
    emptyValue: '',
    gridReadonly: true,
    supportsKbdEdit: false,
    supportsTypeToEdit: false,
    hasEnumValues: false,
    hasRefTable: false,
    validationGroup: 'other',
  },
  text: {
    icon: '📝',
    defaultWidth: 200,
    filterOps: OPS_STRING,
    filterValueWidget: 'text',
    defaultWidget: 'text',
    emptyValue: '',
    gridReadonly: true,
    supportsKbdEdit: false,
    supportsTypeToEdit: false,
    hasEnumValues: false,
    hasRefTable: false,
    validationGroup: 'string',
  },
  date: {
    icon: '📅',
    defaultWidth: 120,
    filterOps: OPS_STRING,
    filterValueWidget: 'text',
    defaultWidget: 'text',
    emptyValue: '',
    gridReadonly: false,
    supportsKbdEdit: true,
    supportsTypeToEdit: true,
    hasEnumValues: false,
    hasRefTable: false,
    validationGroup: 'other',
  },
};

export const COLUMN_TYPE_OPTIONS = (Object.keys(COLUMN_TYPE_CONFIG) as ColumnType[]).map(
  (type) => ({ value: type, label: type })
);
