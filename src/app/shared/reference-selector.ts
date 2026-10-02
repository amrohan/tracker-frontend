import {
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzSelectModule } from "ng-zorro-antd/select";
import { LookupItem, RecordReference } from "../core/models";
import { RecordsApi } from "../core/records-api.service";

/** Picks one or many records of another collection. Works for any collection: labels come from its title field. */
@Component({
  selector: "app-reference-selector",
  imports: [FormsModule, NzSelectModule],
  template: `
    <nz-select
      class="full-width-select"
      [nzMode]="multiple() ? 'multiple' : 'default'"
      [nzPlaceHolder]="label() || 'Search…'"
      [nzServerSearch]="true"
      [nzShowSearch]="true"
      [nzAllowClear]="true"
      [ngModel]="selectedModel()"
      (ngModelChange)="onModelChange($event)"
      (nzOnSearch)="onSearch($event)"
    >
      @for (o of combinedOptions(); track o.id) {
        <nz-option [nzValue]="o.id" [nzLabel]="o.label" />
      }
    </nz-select>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    .full-width-select {
      width: 100%;
    }
  `,
})
export class ReferenceSelector {
  readonly collectionId = input.required<string>();
  readonly multiple = input(false);
  readonly label = input("");
  readonly value = model<string | string[] | null>(null);
  /** Labels the server already resolved (edit mode), so chips render before any lookup. */
  readonly knownLabels = input<Record<string, RecordReference>>({});

  private readonly api = inject(RecordsApi);

  protected readonly query = signal("");
  protected readonly options = signal<LookupItem[]>([]);
  private readonly cache = signal<Record<string, string>>({});

  protected readonly selectedModel = computed(() => {
    const v = this.value();
    if (this.multiple()) {
      return Array.isArray(v) ? v : v ? [v] : [];
    }
    return Array.isArray(v) ? v[0] ?? null : v ?? null;
  });

  protected readonly combinedOptions = computed<LookupItem[]>(() => {
    const map = new Map<string, string>();

    // Seed with known labels
    const known = this.knownLabels();
    for (const [id, ref] of Object.entries(known)) {
      if (ref?.label) map.set(id, ref.label);
    }

    // Add local cache
    for (const [id, label] of Object.entries(this.cache())) {
      map.set(id, label);
    }

    // Add active search results
    for (const item of this.options()) {
      map.set(item.id, item.label);
    }

    // Ensure selected IDs have an option even if not searched yet
    const v = this.value();
    const ids = Array.isArray(v) ? v : v ? [v] : [];
    for (const id of ids) {
      if (!map.has(id)) {
        map.set(id, known[id]?.label || id);
      }
    }

    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  });

  constructor() {
    effect((onCleanup) => {
      const q = this.query();
      const id = this.collectionId();
      const timer = setTimeout(async () => {
        try {
          const items = await this.api.lookup(id, q);
          this.options.set(items);
          this.cache.update((c) => ({
            ...c,
            ...Object.fromEntries(items.map((i) => [i.id, i.label])),
          }));
        } catch {
          this.options.set([]);
        }
      }, 200);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected onSearch(q: string): void {
    this.query.set(q);
  }

  protected onModelChange(val: string | string[] | null): void {
    if (this.multiple()) {
      const arr = Array.isArray(val) ? val : val ? [val] : [];
      this.value.set(arr.length ? arr : null);
    } else {
      this.value.set(val ?? null);
    }
  }
}
