export type Row = {
  _id: string;
  _order: number;
  _invalid?: Record<string, unknown>;
  [key: string]: unknown;
};
