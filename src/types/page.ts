export type PageLayoutWidget =
  | 'text'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'table'
  | 'tag-list'
  | 'json';

export type PageLayoutItem =
  | {
      type: 'field';
      key: string;
      label?: string;
      widget: PageLayoutWidget;
      columns?: string[];
    }
  | {
      type: 'section';
      label?: string;
      children: PageLayoutItem[];
    };

export type PageTemplate = {
  name: string;
  table: string;
  layout: PageLayoutItem[];
};

export type PageTemplateDefinition = {
  id: string;
  name: string;
  table: string;
  layout: PageLayoutItem[];
};
