import {
  Component,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from "@angular/core";
import { FormsModule } from "@angular/forms";

import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDrawerModule } from "ng-zorro-antd/drawer";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzPopconfirmModule } from "ng-zorro-antd/popconfirm";
import { NzTagModule } from "ng-zorro-antd/tag";
import { NzTooltipModule } from "ng-zorro-antd/tooltip";
import { NzEmptyModule } from "ng-zorro-antd/empty";
import { SavedFiltersApi } from "../../core/saved-filters-api.service";
import { Notify } from "../../core/notify.service";
import { problemMessage } from "../../core/http-errors";
import { ApiFilter, SavedFilter } from "../../core/models";
import { FilterDraft, newFilter } from "./filters";
import { FieldTypeCatalog } from "../../core/field-types.service";
import { Field } from "../../core/models";

@Component({
  selector: "app-saved-filter-drawer",
  imports: [
    FormsModule,
    NzButtonModule,
    NzDrawerModule,
    NzIconModule,
    NzInputModule,
    NzSpinModule,
    NzPopconfirmModule,
    NzTagModule,
    NzTooltipModule,
    NzEmptyModule,
  ],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      nzPlacement="right"
      nzTitle="Saved Filters"
      [nzExtra]="extraTpl"
      (nzOnClose)="open.set(false)"
    >
      <ng-template nzDrawerContent>
        <div class="drawer-body">
          <!-- Save current filters section -->
          @if (currentFilters().length > 0) {
            <div class="save-section">
              <p class="section-label">
                <nz-icon nzType="save" /> Save current filters
              </p>
              <div class="save-row">
                <input
                  nz-input
                  placeholder="Filter name…"
                  [(ngModel)]="newName"
                  (keydown.enter)="saveCurrentFilters()"
                  class="save-input"
                  maxlength="100"
                />
                <button
                  nz-button
                  nzType="primary"
                  type="button"
                  [disabled]="!newName().trim() || saving()"
                  (click)="saveCurrentFilters()"
                  class="save-btn"
                >
                  @if (saving()) {
                    <nz-icon nzType="loading" />
                  } @else {
                    Save
                  }
                </button>
              </div>
            </div>
          }

          <!-- Saved filters list -->
          @if (loading()) {
            <div class="loading">
              <nz-spin nzSimple />
            </div>
          } @else if (savedFilters().length === 0) {
            <div class="empty-wrap">
              <div class="empty-icon">
                <nz-icon nzType="filter" />
              </div>
              <p class="empty-title">No saved filters yet</p>
              <p class="empty-sub">
                Apply some filters above, then save them here for quick access.
              </p>
            </div>
          } @else {
            <div class="list-section">
              <p class="section-label">
                <nz-icon nzType="unordered-list" /> Saved filters ({{
                  savedFilters().length
                }})
              </p>

              <div class="filter-list">
                @for (sf of savedFilters(); track sf.id) {
                  <div
                    class="filter-card"
                    [style.border-color]="
                      isActive(sf) ? 'var(--app-primary)' : null
                    "
                  >
                    <div class="filter-card-info">
                      <span class="filter-name">{{ sf.name }}</span>
                      <span class="filter-count">
                        {{ filterCount(sf) }}
                        {{ filterCount(sf) === 1 ? "filter" : "filters" }}
                      </span>
                    </div>

                    <div class="filter-card-actions">
                      <!-- Apply -->
                      <button
                        nz-button
                        nzType="text"
                        nzSize="small"
                        type="button"
                        nz-tooltip
                        [nzTooltipTitle]="
                          isActive(sf) ? 'Clear filter' : 'Apply filter'
                        "
                        (click)="toggleApply(sf)"
                        class="action-btn"
                        [class.active-btn]="isActive(sf)"
                      >
                        <nz-icon
                          [nzType]="
                            isActive(sf) ? 'check-circle' : 'play-circle'
                          "
                        />
                      </button>

                      <!-- Update with current filters -->
                      @if (currentFilters().length > 0) {
                        <button
                          nz-button
                          nzType="text"
                          nzSize="small"
                          type="button"
                          nz-tooltip
                          nzTooltipTitle="Update with current filters"
                          (click)="updateFilter(sf)"
                          class="action-btn"
                        >
                          <nz-icon nzType="sync" />
                        </button>
                      }

                      <!-- Delete -->
                      <button
                        nz-button
                        nzType="text"
                        nzSize="small"
                        nzDanger
                        type="button"
                        nz-popconfirm
                        nzPopconfirmTitle="Delete this saved filter?"
                        nzPopconfirmPlacement="left"
                        (nzOnConfirm)="deleteFilter(sf)"
                        class="action-btn delete-btn"
                      >
                        <nz-icon nzType="delete" />
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </ng-template>
    </nz-drawer>

    <ng-template #extraTpl>
      @if (savedFilters().length > 0) {
        <button
          nz-button
          nzType="text"
          nzSize="small"
          type="button"
          (click)="loadFilters()"
          nz-tooltip
          nzTooltipTitle="Refresh list"
        >
          <nz-icon nzType="reload" />
        </button>
      }
    </ng-template>
  `,
  styles: `
    .drawer-body {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 4px 0;
    }

    .section-label {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 10px;
      font-size: 0.8125rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }

    /* Save current section */
    .save-section {
      background: var(--app-surface-container-low);
      border-radius: 12px;
      padding: 14px 16px;
    }

    .save-row {
      display: flex;
      gap: 8px;
    }

    .save-input {
      flex: 1 1 auto;
      min-width: 0;
    }

    .save-btn {
      flex-shrink: 0;
    }

    /* Loading */
    .loading {
      display: flex;
      justify-content: center;
      padding: 40px 0;
    }

    /* Empty */
    .empty-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 32px 16px;
      gap: 8px;
    }

    .empty-icon {
      width: 52px;
      height: 52px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: var(--app-surface-container, #f3edf7);
      color: var(--app-text-muted, #49454f);
      font-size: 24px;
      margin-bottom: 4px;
    }

    .empty-title {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--app-text, #1d1b20);
    }

    .empty-sub {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--app-text-muted, #49454f);
      line-height: 1.5;
      max-width: 280px;
    }

    /* Filter list */
    .list-section {
      display: flex;
      flex-direction: column;
    }

    .filter-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .filter-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1.5px solid var(--app-outline-variant, #e0e2ec);
      background: var(--app-surface, #fff);
      transition:
        border-color 0.15s ease,
        background 0.15s ease,
        box-shadow 0.15s ease;
    }

    .filter-card-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
      flex: 1;
    }

    .filter-name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--app-text, #1d1b20);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .filter-count {
      font-size: 0.75rem;
      color: var(--app-text-muted, #49454f);
    }

    .filter-card-actions {
      display: flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
    }

    .action-btn {
      color: var(--app-text-muted, #49454f) !important;
    }

    .action-btn:hover {
      color: var(--app-primary, #6750a4) !important;
    }

    .active-btn {
      color: var(--app-primary, #6750a4) !important;
    }

    .delete-btn:hover {
      color: var(--app-error, #ba1a1a) !important;
    }
  `,
})
export class SavedFilterDrawer {
  readonly collectionId = input.required<string>();
  readonly fields = input<Field[]>([]);
  readonly currentFilters = input<FilterDraft[]>([]);
  readonly open = model(false);

  /** Emitted when user wants to apply a saved filter set */
  readonly applyFilter = output<FilterDraft[]>();

  private readonly api = inject(SavedFiltersApi);
  private readonly catalog = inject(FieldTypeCatalog);
  private readonly notify = inject(Notify);

  readonly savedFilters = signal<SavedFilter[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly newName = signal("");
  protected readonly activeFilterId = signal<string | null>(null);

  constructor() {
    let wasOpen = false;
    effect(() => {
      const isOpen = this.open();
      if (isOpen && !wasOpen) untracked(() => this.loadFilters());
      wasOpen = isOpen;
    });
  }

  ngOnInit() {
    this.loadFilters();
  }

  /** Called externally or when drawer first opens */
  async loadFilters(): Promise<void> {
    this.loading.set(true);
    try {
      const list = await this.api.list(this.collectionId());
      this.savedFilters.set(list);
    } catch (err) {
      this.notify.error(problemMessage(err, "Could not load saved filters."));
    } finally {
      this.loading.set(false);
    }
  }

  protected isActive(sf: SavedFilter): boolean {
    return this.activeFilterId() === sf.id;
  }

  protected filterCount(sf: SavedFilter): number {
    try {
      const arr = JSON.parse(sf.filtersJson);
      return Array.isArray(arr) ? arr.length : 0;
    } catch {
      return 0;
    }
  }

  protected toggleApply(sf: SavedFilter): void {
    if (this.activeFilterId() === sf.id) {
      // clear
      this.activeFilterId.set(null);
      this.applyFilter.emit([]);
      return;
    }

    try {
      const apiFilters: ApiFilter[] = JSON.parse(sf.filtersJson);
      const drafts = this.apiFiltersToDrafts(apiFilters);
      this.activeFilterId.set(sf.id);
      this.applyFilter.emit(drafts);
    } catch {
      this.notify.error("Could not parse this saved filter.");
    }
  }

  protected async saveCurrentFilters(): Promise<void> {
    const name = this.newName().trim();
    if (!name) return;

    const filtersJson = this.buildFiltersJson();
    this.saving.set(true);
    try {
      const created = await this.api.create(this.collectionId(), {
        name,
        filtersJson,
      });
      this.savedFilters.update((list) =>
        [...list, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      this.newName.set("");
      this.notify.info(`Filter "${name}" saved.`);
    } catch (err) {
      this.notify.error(problemMessage(err, "Could not save filter."));
    } finally {
      this.saving.set(false);
    }
  }

  protected async updateFilter(sf: SavedFilter): Promise<void> {
    const filtersJson = this.buildFiltersJson();
    try {
      const updated = await this.api.updateById(this.collectionId(), sf.id, {
        name: sf.name,
        filtersJson,
      });
      this.savedFilters.update((list) =>
        list.map((f) => (f.id === updated.id ? updated : f)),
      );
      this.notify.info(`"${sf.name}" updated.`);
    } catch (err) {
      this.notify.error(problemMessage(err, "Could not update filter."));
    }
  }

  protected async deleteFilter(sf: SavedFilter): Promise<void> {
    try {
      await this.api.delete(this.collectionId(), sf.id);
      this.savedFilters.update((list) => list.filter((f) => f.id !== sf.id));
      if (this.activeFilterId() === sf.id) {
        this.activeFilterId.set(null);
        this.applyFilter.emit([]);
      }
      this.notify.info(`"${sf.name}" deleted.`);
    } catch (err) {
      this.notify.error(problemMessage(err, "Could not delete filter."));
    }
  }

  private buildFiltersJson(): string {
    const fieldsById = new Map(this.fields().map((f) => [f.id, f]));
    const apiFilters = this.currentFilters()
      .filter((d) => d.fieldId && d.op)
      .map((d) => {
        const f: ApiFilter = {
          fieldId: d.fieldId!,
          operator: d.op!,
          value: d.value ?? undefined,
          value2: d.value2 ?? undefined,
        };
        return f;
      });
    return JSON.stringify(apiFilters);
  }

  private apiFiltersToDrafts(apiFilters: ApiFilter[]): FilterDraft[] {
    return apiFilters.map((f) => ({
      id: crypto.randomUUID(),
      fieldId: f.fieldId,
      op: f.operator,
      value: f.value ?? null,
      value2: f.value2 ?? null,
    }));
  }
}
