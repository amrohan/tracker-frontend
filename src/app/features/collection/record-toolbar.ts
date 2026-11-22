import { Component, computed, input, output } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDropdownModule } from "ng-zorro-antd/dropdown";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzMenuModule } from "ng-zorro-antd/menu";
import { NzTooltipModule } from "ng-zorro-antd/tooltip";
import { Field, SavedFilter } from "../../core/models";
import { OP_LABELS } from "../../core/labels";
import { FilterDraft, NO_OPERAND } from "./filters";

export interface ActiveFilterChip {
  index: number;
  fieldName: string;
  opLabel: string;
  valueLabel: string | null;
}

@Component({
  selector: "app-record-toolbar",
  imports: [
    RouterLink,
    NzButtonModule,
    NzDropdownModule,
    NzIconModule,
    NzInputModule,
    NzMenuModule,
    NzTooltipModule,
  ],
  template: `
    <section class="toolbar-wrapper" aria-label="Record controls">
      <!-- Main Toolbar Row -->
      <div class="toolbar-main">
        <!-- Search Input -->
        <div class="search-box">
          <nz-input-wrapper>
            <input
              nz-input
              placeholder="Search records…"
              [value]="searchValue()"
              (input)="search.emit(text($event))"
              autocomplete="off"
              class="search-input"
            />
            @if (searchValue()) {
              <nz-icon
                nzType="close-circle"
                class="search-suffix clear-search"
                (click)="search.emit('')"
                aria-label="Clear search"
              />
            } @else {
              <nz-icon nzType="search" class="search-icon search-suffix" />
            }
          </nz-input-wrapper>
        </div>

        <!-- Controls Group -->
        <div class="tools-group">
          <!-- Filters Toggle Button -->
          <button
            nz-button
            nzType="default"
            type="button"
            class="tool-btn filter-toggle-btn"
            [class.on]="filtersOpen() || activeFilterCount() > 0"
            (click)="toggleFilters.emit()"
            [attr.aria-expanded]="filtersOpen()"
            nz-tooltip
            nzTooltipTitle="Toggle filters panel"
          >
            <nz-icon nzType="filter" />
            <span class="label">Filters</span>
            @if (activeFilterCount() > 0) {
              <span class="count-badge" aria-label="Active filters">
                {{ activeFilterCount() }}
              </span>
            }
          </button>

          <!-- Saved Filter Presets -->
          @if (savedFilters().length > 0) {
            <div class="saved-presets-container" role="group" aria-label="Saved filters">
              @if (activeSavedFilterId()) {
                <!-- Active Preset Pill -->
                <div class="active-preset-chip" [title]="'Preset: ' + activeSavedFilterName()">
                  <nz-icon nzType="star" nzTheme="fill" class="preset-star" />
                  <span class="preset-title">{{ activeSavedFilterName() }}</span>
                  <button
                    type="button"
                    class="preset-clear-btn"
                    (click)="clearSavedFilter.emit()"
                    aria-label="Clear active preset"
                    nz-tooltip
                    nzTooltipTitle="Clear preset"
                  >
                    <nz-icon nzType="close" />
                  </button>
                </div>
              } @else {
                <!-- Inline Preset Pills -->
                <div class="preset-pills-scroll">
                  @for (sf of savedFilters().slice(0, inlinePresetCount()); track sf.id) {
                    <button
                      nz-button
                      nzType="default"
                      nzSize="small"
                      type="button"
                      class="preset-pill-btn"
                      (click)="selectSavedFilter.emit(sf)"
                      nz-tooltip
                      [nzTooltipTitle]="'Apply: ' + sf.name"
                    >
                      {{ sf.name }}
                    </button>
                  }

                  @if (savedFilters().length > inlinePresetCount()) {
                    <button
                      nz-button
                      nzType="text"
                      nzSize="small"
                      type="button"
                      class="preset-overflow-btn"
                      nz-dropdown
                      [nzDropdownMenu]="overflowMenu"
                      [nzTrigger]="'click'"
                      aria-label="More saved filters"
                    >
                      +{{ savedFilters().length - inlinePresetCount() }}
                      <nz-icon nzType="down" class="dropdown-chevron" />
                    </button>

                    <nz-dropdown-menu #overflowMenu="nzDropdownMenu">
                      <ul nz-menu>
                        @for (sf of savedFilters().slice(inlinePresetCount()); track sf.id) {
                          <li nz-menu-item (click)="selectSavedFilter.emit(sf)">
                            <div class="flex items-center gap-2">
                              <nz-icon nzType="filter" />
                              <span>{{ sf.name }}</span>
                            </div>
                          </li>
                        }
                      </ul>
                    </nz-dropdown-menu>
                  }
                </div>
              }

              <!-- Manage Saved Presets Drawer Button -->
              <button
                nz-button
                nzType="text"
                nzSize="small"
                type="button"
                class="preset-drawer-trigger"
                (click)="toggleSavedFilters.emit()"
                nz-tooltip
                nzTooltipTitle="Manage saved filters"
                aria-label="Manage saved filters"
              >
                <nz-icon nzType="folder-open" />
              </button>
            </div>
          } @else {
            <!-- No presets yet: simple Saved button -->
            <button
              nz-button
              nzType="default"
              type="button"
              class="tool-btn saved-btn"
              [class.on]="savedFiltersOpen()"
              (click)="toggleSavedFilters.emit()"
              nz-tooltip
              nzTooltipTitle="Saved filter presets"
            >
              <nz-icon nzType="star" nzTheme="outline" />
              <span class="label">Saved</span>
            </button>
          }

          <!-- Mobile / Compact Sort Menu -->
          @if (compact()) {
            <button
              nz-button
              nzType="default"
              type="button"
              class="tool-btn sort-btn"
              [class.on]="!!sortField()"
              nz-dropdown
              [nzDropdownMenu]="sortMenu"
            >
              <nz-icon nzType="swap" [nzRotate]="90" />
              <span class="label">{{ sortField()?.name ?? "Sort" }}</span>
            </button>

            <nz-dropdown-menu #sortMenu="nzDropdownMenu">
              <ul nz-menu>
                <li nz-menu-item (click)="sortReset.emit()">
                  <div class="flex items-center gap-2">
                    <nz-icon [nzType]="sortField() ? '' : 'check'" />
                    <span>Newest first</span>
                  </div>
                </li>
                @for (f of sortableFields(); track f.id) {
                  <li nz-menu-item (click)="sortPick.emit(f)">
                    <div class="flex items-center gap-2">
                      <nz-icon
                        [nzType]="
                          sortField()?.id === f.id
                            ? sortAscending()
                              ? 'arrow-up'
                              : 'arrow-down'
                            : ''
                        "
                      />
                      <span>{{ f.name }}</span>
                    </div>
                  </li>
                }
              </ul>
            </nz-dropdown-menu>

            <!-- Mobile More Actions Menu -->
            <button
              nz-button
              nzType="text"
              nzShape="circle"
              type="button"
              class="more-actions-btn"
              nz-dropdown
              [nzDropdownMenu]="moreMenu"
              aria-label="More actions"
            >
              <nz-icon nzType="more" />
            </button>

            <nz-dropdown-menu #moreMenu="nzDropdownMenu">
              <ul nz-menu>
                <li nz-menu-item>
                  <a
                    class="flex items-center gap-2.5"
                    [routerLink]="['/collections', collectionId(), 'import']"
                  >
                    <nz-icon nzType="upload" />
                    <span>Import records</span>
                  </a>
                </li>
                <li
                  nz-menu-item
                  [nzDisabled]="!canExport()"
                  (click)="canExport() && export.emit()"
                >
                  <div class="flex items-center gap-2.5">
                    <nz-icon nzType="download" />
                    <span>Export CSV</span>
                  </div>
                </li>
              </ul>
            </nz-dropdown-menu>
          } @else {
            <!-- Desktop Import & Export Buttons -->
            <span class="tools-spacer"></span>

            <a
              nz-button
              nzType="default"
              class="tool-btn action-link"
              [routerLink]="['/collections', collectionId(), 'import']"
            >
              <nz-icon nzType="upload" />
              <span class="label">Import</span>
            </a>

            <button
              nz-button
              nzType="default"
              type="button"
              class="tool-btn action-link"
              [disabled]="!canExport()"
              (click)="export.emit()"
            >
              <nz-icon nzType="download" />
              <span class="label">Export</span>
            </button>
          }
        </div>
      </div>

      <!-- Active Filter Chips Row -->
      @if (activeFilterChips().length > 0) {
        <div class="active-chips-bar" role="region" aria-label="Active filters">
          <div class="chips-scroll-wrap">
            <span class="chips-lead">
              <nz-icon nzType="filter" class="lead-icon" />
              <span class="lead-text">Active filters:</span>
            </span>

            @for (chip of activeFilterChips(); track chip.index) {
              <span class="active-chip">
                <strong class="chip-field-name">{{ chip.fieldName }}</strong>
                <span class="chip-op-text">{{ chip.opLabel }}</span>
                @if (chip.valueLabel) {
                  <span class="chip-value-text">{{ chip.valueLabel }}</span>
                }
                <button
                  type="button"
                  class="chip-delete-btn"
                  (click)="removeFilter.emit(chip.index)"
                  [attr.aria-label]="'Remove filter for ' + chip.fieldName"
                >
                  <nz-icon nzType="close" />
                </button>
              </span>
            }

            <button
              type="button"
              class="clear-all-text-btn"
              (click)="clearAllFilters.emit()"
            >
              Clear all
            </button>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .toolbar-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }

    /* ---- Main Toolbar Row ---- */
    .toolbar-main {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 38px;
    }

    .search-box {
      flex: 0 1 340px;
      min-width: 180px;
    }

    .search-input {
      height: 36px !important;
      border-radius: var(--radius-md) !important;
      background: var(--app-surface) !important;
      border: 1px solid var(--app-outline) !important;
      font-size: 0.8125rem !important;
      transition: all var(--transition-fast) !important;

      &:focus {
        border-color: var(--app-primary) !important;
        box-shadow: 0 0 0 2px var(--app-primary-container) !important;
      }
    }

    .search-icon {
      color: var(--app-text-muted);
      opacity: 0.75;
    }

    .clear-search {
      color: var(--app-text-muted);
      cursor: pointer;
      &:hover {
        color: var(--app-text);
      }
    }

    /* ---- Tools Group ---- */
    .tools-group {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .tools-spacer {
      flex: 1 1 auto;
    }

    .tool-btn {
      height: 36px !important;
      border-radius: var(--radius-md) !important;
      font-size: 0.8125rem !important;
      font-weight: 500 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      background: var(--app-surface) !important;
      border: 1px solid var(--app-outline) !important;
      color: var(--app-text) !important;
      transition: all var(--transition-fast) !important;

      &:hover {
        border-color: var(--app-primary) !important;
        color: var(--app-primary) !important;
        background: var(--app-primary-container) !important;
      }

      &.on {
        border-color: var(--app-primary) !important;
        color: var(--app-primary) !important;
        background: var(--app-primary-container) !important;
        font-weight: 600 !important;
      }
    }

    .count-badge {
      min-width: 18px;
      height: 18px;
      display: inline-grid;
      place-items: center;
      padding: 0 5px;
      border-radius: var(--radius-full);
      background: var(--app-primary);
      color: #ffffff;
      font-size: 0.6875rem;
      font-weight: 700;
      line-height: 1;
    }

    /* ---- Saved Presets Container ---- */
    .saved-presets-container {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    .preset-pills-scroll {
      display: flex;
      align-items: center;
      gap: 4px;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      &::-webkit-scrollbar {
        display: none;
      }
    }

    .preset-pill-btn {
      height: 32px !important;
      padding: 0 10px !important;
      border-radius: var(--radius-full) !important;
      font-size: 0.75rem !important;
      font-weight: 500 !important;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      background: var(--app-surface) !important;
      border: 1px solid var(--app-outline-variant) !important;
      color: var(--app-text-secondary) !important;
      transition: all var(--transition-fast) !important;

      &:hover {
        border-color: var(--app-primary) !important;
        color: var(--app-primary) !important;
        background: var(--app-primary-container) !important;
      }
    }

    .preset-overflow-btn {
      height: 30px !important;
      padding: 0 6px !important;
      font-size: 0.75rem !important;
      color: var(--app-text-muted);
      border-radius: var(--radius-sm);
    }

    .dropdown-chevron {
      font-size: 10px;
      margin-left: 2px;
      opacity: 0.7;
    }

    .preset-drawer-trigger {
      height: 32px !important;
      width: 32px !important;
      display: grid;
      place-items: center;
      color: var(--app-text-muted);
      border-radius: var(--radius-md) !important;
      flex-shrink: 0;

      &:hover {
        color: var(--app-text);
        background: var(--app-surface-container-high) !important;
      }
    }

    /* ---- Active Preset Chip ---- */
    .active-preset-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 8px 0 10px;
      border-radius: var(--radius-full);
      background: var(--app-primary-container);
      border: 1px solid var(--app-primary);
      color: var(--app-on-primary-container);
      font-size: 0.75rem;
      font-weight: 600;
      max-width: 220px;
      min-width: 0;
    }

    .preset-star {
      font-size: 12px;
      color: var(--app-primary);
      flex-shrink: 0;
    }

    .preset-title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }

    .preset-clear-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: none;
      background: transparent;
      color: var(--app-primary);
      cursor: pointer;
      padding: 0;
      font-size: 10px;
      transition: background-color var(--transition-fast);

      &:hover {
        background: var(--app-primary);
        color: #ffffff;
      }
    }

    .more-actions-btn {
      color: var(--app-text-muted);
      &:hover {
        color: var(--app-text);
        background: var(--app-surface-container-high);
      }
    }

    /* ---- Active Filter Chips Row ---- */
    .active-chips-bar {
      display: flex;
      align-items: center;
      padding: 4px 0 2px;
    }

    .chips-scroll-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      min-width: 0;
      width: 100%;
    }

    .chips-lead {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--app-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-right: 2px;
    }

    .lead-icon {
      font-size: 11px;
    }

    .active-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 26px;
      padding: 0 6px 0 9px;
      border-radius: var(--radius-full);
      background: var(--app-surface-container);
      border: 1px solid var(--app-outline-variant);
      color: var(--app-text);
      font-size: 0.72rem;
      line-height: 1;
      white-space: nowrap;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--app-outline);
        background: var(--app-surface);
      }
    }

    .chip-field-name {
      font-weight: 600;
      color: var(--app-text);
    }

    .chip-op-text {
      color: var(--app-text-muted);
      font-weight: 400;
    }

    .chip-value-text {
      font-weight: 500;
      color: var(--app-primary);
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chip-delete-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: none;
      background: transparent;
      color: var(--app-text-muted);
      cursor: pointer;
      padding: 0;
      font-size: 9px;
      margin-left: 2px;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--app-error-container);
        color: var(--app-error);
      }
    }

    .clear-all-text-btn {
      background: transparent;
      border: none;
      color: var(--app-text-muted);
      font-size: 0.72rem;
      font-weight: 500;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      margin-left: 2px;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--app-error);
        text-decoration: underline;
      }
    }

    /* ---- Mobile Responsiveness ---- */
    @media (max-width: 767px) {
      .toolbar-main {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }

      .search-box {
        flex: 1 1 auto;
        width: 100%;
      }

      .tools-group {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        width: 100%;
      }

      .tool-btn {
        flex: 1;
        justify-content: center;
        min-width: 80px;
      }

      .sort-btn {
        flex: 1;
        min-width: 80px;
      }

      .saved-presets-container {
        flex: 1 1 100%;
        overflow-x: auto;
      }

      .active-chips-bar {
        overflow-x: auto;
        padding: 2px 0 4px;
      }

      .chips-scroll-wrap {
        flex-wrap: nowrap;
        overflow-x: auto;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
        &::-webkit-scrollbar {
          display: none;
        }
      }
    }
  `,
})
export class RecordToolbar {
  readonly collectionId = input.required<string>();
  readonly compact = input(false);
  readonly searchValue = input("");
  readonly filtersOpen = input(false);
  readonly activeFilterCount = input(0);
  readonly savedFiltersOpen = input(false);
  readonly savedFiltersCount = input(0);
  readonly savedFilters = input<SavedFilter[]>([]);
  readonly activeSavedFilterId = input<string | null>(null);

  readonly filters = input<FilterDraft[]>([]);
  readonly fields = input<Field[]>([]);

  readonly activeSavedFilterName = computed(() => {
    const id = this.activeSavedFilterId();
    if (!id) return null;
    return this.savedFilters().find((f) => f.id === id)?.name ?? null;
  });

  /** How many preset pills to show inline before "overflow" dropdown. */
  protected readonly inlinePresetCount = computed(() =>
    this.compact() ? 1 : 3,
  );

  /** Human-readable active filter chips */
  protected readonly activeFilterChips = computed<ActiveFilterChip[]>(() => {
    const drafts = this.filters();
    const fieldsList = this.fields();
    const chips: ActiveFilterChip[] = [];

    drafts.forEach((d, idx) => {
      if (!d.fieldId || !d.op) return;
      const f = fieldsList.find((x) => x.id === d.fieldId);
      if (!f) return;

      const opLabel = OP_LABELS[d.op] ?? d.op;
      let valueLabel: string | null = null;

      if (!NO_OPERAND.includes(d.op)) {
        if (d.value !== null && d.value !== undefined && d.value !== "") {
          if (d.op === "between" && d.value2) {
            valueLabel = `${d.value} – ${d.value2}`;
          } else {
            valueLabel = String(d.value);
          }
        }
      }

      chips.push({
        index: idx,
        fieldName: f.name,
        opLabel,
        valueLabel,
      });
    });

    return chips;
  });

  readonly sortableFields = input<Field[]>([]);
  readonly sortField = input<Field | null>(null);
  readonly sortAscending = input(false);
  readonly canExport = input(false);

  readonly search = output<string>();
  readonly toggleFilters = output<void>();
  readonly toggleSavedFilters = output<void>();
  readonly selectSavedFilter = output<SavedFilter>();
  readonly clearSavedFilter = output<void>();
  readonly removeFilter = output<number>();
  readonly clearAllFilters = output<void>();
  readonly sortReset = output<void>();
  readonly sortPick = output<Field>();
  readonly export = output<void>();

  protected text(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }
}
