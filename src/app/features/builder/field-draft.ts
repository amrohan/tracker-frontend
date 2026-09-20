import { AggregationType, Field, FieldConfig, FieldInput, FieldType } from '../../core/models';
import { FieldPatch } from '../../core/collections-api.service';

export interface FieldDraft {
  cid: string;
  id?: string;
  name: string;
  type: FieldType;
  originalType?: FieldType;
  required: boolean;
  config: FieldConfig;
  aggregation: AggregationType;
  isTitle: boolean;
  showInList: boolean;
  description: string;
}

export function newDraft(): FieldDraft {
  return {
    cid: crypto.randomUUID(), name: '', type: 'text', required: false, config: {},
    aggregation: 'none', isTitle: false, showInList: true, description: '',
  };
}

export function draftFromField(f: Field): FieldDraft {
  return {
    cid: f.id, id: f.id, name: f.name, type: f.type, originalType: f.type, required: f.required,
    config: structuredClone(f.config ?? {}), aggregation: f.aggregation, isTitle: f.isTitle,
    showInList: f.showInList, description: f.description ?? '',
  };
}

function cleanConfig(d: FieldDraft): FieldConfig {
  const c = d.config;
  switch (d.type) {
    case 'select':
    case 'multiSelect':
      return { options: (c.options ?? []).map((o) => o.trim()).filter(Boolean) };
    case 'reference':
    case 'multiReference':
      return { targetCollectionId: c.targetCollectionId ?? null };
    case 'currency':
      return { currency: c.currency ?? 'INR', min: c.min ?? null, max: c.max ?? null };
    case 'number':
      return { min: c.min ?? null, max: c.max ?? null };
    case 'rating':
      return { max: c.max ?? 5 };
    default:
      return {};
  }
}

export function toInput(d: FieldDraft): FieldInput {
  return {
    name: d.name.trim(), type: d.type, required: d.required, config: cleanConfig(d),
    aggregation: d.aggregation, isTitle: d.isTitle, showInList: d.showInList,
    description: d.description.trim() || null,
  };
}

/** Only the properties that changed, or null when nothing did. */
export function diffField(original: Field, d: FieldDraft): FieldPatch | null {
  const patch: FieldPatch = {};
  if (d.name.trim() !== original.name) patch.name = d.name.trim();
  if (d.required !== original.required) patch.required = d.required;
  if (d.aggregation !== original.aggregation) patch.aggregation = d.aggregation;
  if (d.isTitle !== original.isTitle) patch.isTitle = d.isTitle;
  if (d.showInList !== original.showInList) patch.showInList = d.showInList;
  if (d.description.trim() !== (original.description ?? '')) patch.description = d.description.trim();

  const config = cleanConfig(d);
  const typeChanged = d.type !== original.type;
  if (typeChanged) patch.type = d.type;
  if (typeChanged || JSON.stringify(normalize(config)) !== JSON.stringify(normalize(original.config ?? {}))) patch.config = config;

  return Object.keys(patch).length ? patch : null;
}

function normalize(c: FieldConfig): FieldConfig {
  const out: FieldConfig = {};
  if (c.options?.length) out.options = c.options;
  if (c.targetCollectionId) out.targetCollectionId = c.targetCollectionId;
  if (c.currency) out.currency = c.currency;
  if (c.min !== null && c.min !== undefined) out.min = c.min;
  if (c.max !== null && c.max !== undefined) out.max = c.max;
  return out;
}

export function validateDrafts(drafts: FieldDraft[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  drafts.forEach((d, i) => {
    const label = d.name.trim() || `Field ${i + 1}`;
    if (!d.name.trim()) problems.push(`${label} needs a name.`);
    else if (seen.has(d.name.trim().toLowerCase())) problems.push(`Two fields are named “${d.name.trim()}”.`);
    seen.add(d.name.trim().toLowerCase());
    if ((d.type === 'select' || d.type === 'multiSelect') && !(d.config.options ?? []).some((o) => o.trim())) {
      problems.push(`${label} needs at least one option.`);
    }
    if ((d.type === 'reference' || d.type === 'multiReference') && !d.config.targetCollectionId) {
      problems.push(`${label} needs a collection to point to.`);
    }
    if (d.config.min != null && d.config.max != null && d.config.min > d.config.max) {
      problems.push(`${label}: minimum is greater than maximum.`);
    }
  });
  if (drafts.filter((d) => d.isTitle).length > 1) problems.push('Only one field can be the title.');
  return problems;
}
