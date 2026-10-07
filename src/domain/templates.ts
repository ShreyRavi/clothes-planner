export interface TemplateFn {
  name: string;
  timeOfDay: string;
  dressCode: string;
}
export interface Template {
  id: string;
  name: string;
  description: string;
  order: number;
  functions: TemplateFn[];
  optional: TemplateFn[];
}

/** Returns a list of problems; empty means the template is valid. Used in CI and at load. */
export function validateTemplate(t: unknown): string[] {
  const errs: string[] = [];
  const o = t as Record<string, unknown>;
  if (!o || typeof o !== 'object') return ['not an object'];
  for (const k of ['id', 'name', 'description'] as const) {
    if (typeof o[k] !== 'string' || !(o[k] as string).length) errs.push(`${k} must be a non-empty string`);
  }
  if (typeof o.order !== 'number') errs.push('order must be a number');
  for (const k of ['functions', 'optional'] as const) {
    const list = o[k];
    if (!Array.isArray(list)) {
      errs.push(`${k} must be an array`);
      continue;
    }
    list.forEach((f, i) => {
      const fn = f as Record<string, unknown>;
      if (typeof fn?.name !== 'string' || !fn.name) errs.push(`${k}[${i}].name must be a non-empty string`);
      if (typeof fn?.timeOfDay !== 'string') errs.push(`${k}[${i}].timeOfDay must be a string`);
      if (typeof fn?.dressCode !== 'string') errs.push(`${k}[${i}].dressCode must be a string`);
    });
  }
  return errs;
}

const modules = import.meta.glob<Template>('../templates/*.json', { eager: true, import: 'default' });

export const TEMPLATES: Template[] = Object.values(modules)
  .filter((t) => validateTemplate(t).length === 0)
  .sort((a, b) => a.order - b.order);

export function templateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
