import { FieldTypeCatalog } from '../../core/field-types.service';
import { parseIsoDate } from '../../core/format';
import { ApiFilter, Field, FilterOperator, ValueKind } from '../../core/models';

export interface FilterDraft {
  id: string;
  fieldId: string | null;
  op: FilterOperator | null;
  value: unknown;
  value2: unknown;
}

export const NO_OPERAND: FilterOperator[] = ['isEmpty', 'isNotEmpty'];

export function newFilter(fieldId: string | null = null, op: FilterOperator | null = null): FilterDraft {
  return { id: crypto.randomUUID(), fieldId, op, value: null, value2: null };
}

/** Converts the editable drafts into API filters; incomplete drafts are ignored until they are complete. */
export function toApiFilters(drafts: FilterDraft[], fieldsById: Map<string, Field>, catalog: FieldTypeCatalog): ApiFilter[] {
  const result: ApiFilter[] = [];
  for (const d of drafts) {
    if (!d.fieldId || !d.op) continue;
    const field = fieldsById.get(d.fieldId);
    const kind = field ? catalog.kind(field.type) : undefined;
    if (!field || !kind) continue;

    if (NO_OPERAND.includes(d.op)) {
      result.push({ fieldId: field.id, operator: d.op });
      continue;
    }
    const first = convert(kind, d.op, d.value, false);
    if (first === undefined) continue;
    if (d.op === 'between') {
      const second = convert(kind, d.op, d.value2, true);
      if (second === undefined) continue;
      result.push({ fieldId: field.id, operator: d.op, value: first, value2: second });
    } else {
      result.push({ fieldId: field.id, operator: d.op, value: first });
    }
  }
  return result;
}

function convert(kind: ValueKind, op: FilterOperator, raw: unknown, second: boolean): unknown {
  if (raw === null || raw === undefined || raw === '') return undefined;
  switch (kind) {
    case 'number': {
      const n = Number(raw);
      return isNaN(n) ? undefined : n;
    }
    case 'boolean':
      return raw === true || raw === 'true';
    case 'date':
      return String(raw);
    case 'dateTime': {
      // The user thinks in calendar days (local); the server compares instants.
      const d = parseIsoDate(String(raw));
      if (!d) return undefined;
      if (op === 'after' || (op === 'between' && second)) d.setHours(23, 59, 59, 999);
      return d.toISOString();
    }
    default: {
      const s = String(raw).trim();
      return s || undefined;
    }
  }
}
