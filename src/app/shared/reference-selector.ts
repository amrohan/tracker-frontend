import { Component, ElementRef, computed, effect, inject, input, model, signal, viewChild } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { LookupItem, RecordReference } from '../core/models';
import { RecordsApi } from '../core/records-api.service';

/** Picks one or many records of another collection. Works for any collection: labels come from its title field. */
@Component({
  selector: 'app-reference-selector',
  imports: [MatFormFieldModule, MatChipsModule, MatAutocompleteModule, MatIconModule],
  template: `
    <mat-form-field class="full" appearance="outline">
      <mat-label>{{ label() }}</mat-label>
      <mat-chip-grid #grid [attr.aria-label]="label()">
        @for (id of selectedIds(); track id) {
          <mat-chip-row (removed)="remove(id)">
            {{ labelOf(id) }}
            <button matChipRemove [attr.aria-label]="'Remove ' + labelOf(id)"><mat-icon>cancel</mat-icon></button>
          </mat-chip-row>
        }
        @if (multiple() || selectedIds().length === 0) {
          <input #inp placeholder="Search…" [matChipInputFor]="grid" [matAutocomplete]="auto"
                 (input)="onInput($event)" (focus)="query.set(query())" />
        }
      </mat-chip-grid>
      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="select($event.option.value)">
        @for (o of options(); track o.id) {
          <mat-option [value]="o.id" [disabled]="selectedIds().includes(o.id)">{{ o.label }}</mat-option>
        } @empty {
          <mat-option disabled>No matches</mat-option>
        }
      </mat-autocomplete>
    </mat-form-field>
  `,
})
export class ReferenceSelector {
  readonly collectionId = input.required<string>();
  readonly multiple = input(false);
  readonly label = input('');
  readonly value = model<string | string[] | null>(null);
  /** Labels the server already resolved (edit mode), so chips render before any lookup. */
  readonly knownLabels = input<Record<string, RecordReference>>({});

  private readonly api = inject(RecordsApi);
  private readonly inp = viewChild<ElementRef<HTMLInputElement>>('inp');

  protected readonly query = signal('');
  protected readonly options = signal<LookupItem[]>([]);
  private readonly cache = signal<Record<string, string>>({});

  protected readonly selectedIds = computed<string[]>(() => {
    const v = this.value();
    return Array.isArray(v) ? v : v ? [v] : [];
  });

  constructor() {
    effect((onCleanup) => {
      const q = this.query();
      const id = this.collectionId();
      const timer = setTimeout(async () => {
        try {
          const items = await this.api.lookup(id, q);
          this.options.set(items);
          this.cache.update((c) => ({ ...c, ...Object.fromEntries(items.map((i) => [i.id, i.label])) }));
        } catch {
          this.options.set([]);
        }
      }, 200);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected labelOf(id: string): string {
    return this.cache()[id] ?? this.knownLabels()[id]?.label ?? 'Unknown record';
  }

  protected onInput(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
  }

  protected select(id: string): void {
    if (this.multiple()) {
      const current = this.selectedIds();
      if (!current.includes(id)) this.value.set([...current, id]);
    } else {
      this.value.set(id);
    }
    this.query.set('');
    const input = this.inp()?.nativeElement;
    if (input) input.value = '';
  }

  protected remove(id: string): void {
    const rest = this.selectedIds().filter((x) => x !== id);
    this.value.set(this.multiple() ? rest : null);
  }
}
