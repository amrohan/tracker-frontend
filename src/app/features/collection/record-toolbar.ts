import { Component, input, output } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDropdownModule } from "ng-zorro-antd/dropdown";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzMenuModule } from "ng-zorro-antd/menu";
import { Field } from "../../core/models";

@Component({
  selector: "app-record-toolbar",
  imports: [
    RouterLink,
    NzButtonModule,
    NzDropdownModule,
    NzIconModule,
    NzInputModule,
    NzMenuModule,
  ],
  template: `
    <section class="toolbar" aria-label="Record controls">
      <div class="search-wrap search">
        <input
          nz-input
          placeholder="Search records"
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
      </div>

      <div class="tools">
        <button
          nz-button
          nzType="default"
          type="button"
          [class.on]="filtersOpen() || activeFilterCount() > 0"
          (click)="toggleFilters.emit()"
          [attr.aria-expanded]="filtersOpen()"
        >
          <nz-icon nzType="filter" />
          <span class="label">Filters</span>
          @if (activeFilterCount()) {
            <span class="count" aria-label="Active filters">{{
              activeFilterCount()
            }}</span>
          }
        </button>

        @if (compact()) {
          <!-- phones: sort lives in a dropdown because cards have no column headers -->
          <button
            nz-button
            nzType="default"
            type="button"
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
                <nz-icon [nzType]="sortField() ? '' : 'check'" />
                <span>Newest first</span>
              </li>
              @for (f of sortableFields(); track f.id) {
                <li nz-menu-item (click)="sortPick.emit(f)">
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
                </li>
              }
            </ul>
          </nz-dropdown-menu>

          <button
            nz-button
            nzType="text"
            nzShape="circle"
            type="button"
            class="more-btn"
            nz-dropdown
            [nzDropdownMenu]="moreMenu"
            aria-label="More actions"
          >
            <nz-icon nzType="more" />
          </button>
          <nz-dropdown-menu #moreMenu="nzDropdownMenu">
            <ul nz-menu>
              <li nz-menu-item>
                <a [routerLink]="['/collections', collectionId(), 'import']">
                  <nz-icon nzType="upload" /><span>Import</span>
                </a>
              </li>
              <li
                nz-menu-item
                [nzDisabled]="!canExport()"
                (click)="canExport() && export.emit()"
              >
                <nz-icon nzType="download" /><span>Export CSV</span>
              </li>
            </ul>
          </nz-dropdown-menu>
        } @else {
          <span class="spacer"></span>
          <a
            nz-button
            nzType="default"
            class="tool-btn"
            [routerLink]="['/collections', collectionId(), 'import']"
          >
            <nz-icon nzType="upload" /><span class="label">Import</span>
          </a>
          <button
            nz-button
            nzType="default"
            type="button"
            class="tool-btn"
            [disabled]="!canExport()"
            (click)="export.emit()"
          >
            <nz-icon nzType="download" /><span class="label">Export CSV</span>
          </button>
        }
      </div>
    </section>
  `,
  styles: `
    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .spacer {
      flex: 1 1 auto;
    }
    .search {
      flex: 0 1 380px;
      min-width: 200px;
    }
    .search-icon {
      color: var(--app-text-muted);
      opacity: 0.8;
    }
    .tools {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .count {
      min-width: 20px;
      height: 20px;
      display: inline-grid;
      place-items: center;
      margin-left: 6px;
      padding: 0 5px;
      border-radius: 999px;
      background: var(--app-primary);
      color: var(--app-on-primary);
      font-size: 0.6875rem;
      font-weight: 700;
      line-height: 1;
    }
    .on {
      border-color: var(--app-primary) !important;
      color: var(--app-primary) !important;
    }
    @media (max-width: 767px) {
      .toolbar {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }
      .search {
        flex: 1 1 auto;
        min-width: 0;
      }
      .tools {
        gap: 6px;
      }
      .tool-btn {
        padding: 0 12px;
      }
      .more-btn {
        margin-left: auto;
      }
    }
    @media (max-width: 380px) {
      .tool-btn .label {
        display: none;
      }
      .tool-btn {
        padding: 0 10px;
        min-width: 44px;
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
  readonly sortableFields = input<Field[]>([]);
  readonly sortField = input<Field | null>(null);
  readonly sortAscending = input(false);
  readonly canExport = input(false);

  readonly search = output<string>();
  readonly toggleFilters = output<void>();
  readonly sortReset = output<void>();
  readonly sortPick = output<Field>();
  readonly export = output<void>();

  protected text(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }
}
