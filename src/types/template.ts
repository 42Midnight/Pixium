export interface TemplateField {
  id?: number;
  name: string;
  value: string;
}

export interface Template {
  id: number;
  name: string;
  fields: TemplateField[];
  prompt?: Record<string, string>;
}
