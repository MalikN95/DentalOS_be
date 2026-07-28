export type TemplateData = Record<string, string>;

const PLACEHOLDER_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;

export const renderTemplate = (template: string, data: TemplateData): string =>
  template.replace(
    PLACEHOLDER_PATTERN,
    (_match, key: string) => data[key] ?? '',
  );
