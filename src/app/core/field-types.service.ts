import { HttpClient } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AggregationType, FieldType, FieldTypeInfo, FilterOperator, ValueKind } from './models';

/** Server-published field-type catalog. Operators, aggregations and conversions are never hardcoded in the UI. */
@Service()
export class FieldTypeCatalog {
  private readonly http = inject(HttpClient);
  readonly types = signal<FieldTypeInfo[]>([]);
  private readonly byType = computed(() => new Map(this.types().map((t) => [t.type, t] as const)));

  async load(): Promise<void> {
    if (this.types().length) return;
    try {
      this.types.set(await firstValueFrom(this.http.get<FieldTypeInfo[]>('/api/meta/field-types')));
    } catch {
      /* the API may be starting; screens degrade gracefully and retry via ensure() */
    }
  }

  info(type: FieldType): FieldTypeInfo | undefined { return this.byType().get(type); }
  kind(type: FieldType): ValueKind | undefined { return this.info(type)?.kind; }
  operators(type: FieldType): FilterOperator[] { return this.info(type)?.operators ?? []; }
  aggregations(type: FieldType): AggregationType[] { return this.info(type)?.aggregations ?? []; }
  sortable(type: FieldType): boolean { return this.info(type)?.sortable ?? false; }
  convertibleTo(type: FieldType): FieldType[] { return this.info(type)?.convertibleTo ?? []; }
}
