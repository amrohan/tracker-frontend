import { Component, input, output } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatMenuModule } from "@angular/material/menu";
import { RouterLink } from "@angular/router";
import { Field } from "../../core/models";

@Component({
  selector: "app-record-toolbar",
  imports: [
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
  ],
  template: `
    <section class="toolbar" aria-label="Record controls">
      <mat-form-field
        appearance="outline"
        subscriptSizing="dynamic"
        class="search"
      >
        <mat-label>Search records</mat-label>
        <input
          matInput
          [value]="searchValue()"
          (input)="search.emit(text($event))"
          autocomplete="off"
        />
        @if (searchValue()) {
          <button
            mat-icon-button
            matSuffix
            type="button"
            aria-label="Clear search"
            (click)="search.emit('')"
          >
            <mat-icon>close</mat-icon>
          </button>
        } @else {
          <mat-icon matSuffix class="search-icon">search</mat-icon>
        }
      </mat-form-field>

      <div class="tools">
        <button
          mat-stroked-button
          type="button"
          class="tool-btn"
          [class.on]="filtersOpen() || activeFilterCount() > 0"
          (click)="toggleFilters.emit()"
          [attr.aria-expanded]="filtersOpen()"
        >
          <mat-icon>tune</mat-icon>
          <span class="label">Filters</span>
          @if (activeFilterCount()) {
            <span class="count" aria-label="Active filters">{{
              activeFilterCount()
            }}</span>
          }
        </button>

        @if (compact()) {
          <!-- phones: sort lives in a menu because cards have no column headers -->
          <button
            mat-stroked-button
            type="button"
            class="tool-btn"
            [class.on]="!!sortField()"
            [matMenuTriggerFor]="sortMenu"
          >
            <mat-icon>swap_vert</mat-icon>
            <span class="label">{{ sortField()?.name ?? "Sort" }}</span>
          </button>
          <mat-menu #sortMenu="matMenu">
            <button mat-menu-item type="button" (click)="sortReset.emit()">
              <mat-icon>{{ sortField() ? "" : "check" }}</mat-icon
              ><span>Newest first</span>
            </button>
            @for (f of sortableFields(); track f.id) {
              <button mat-menu-item type="button" (click)="sortPick.emit(f)">
                <mat-icon>{{
                  sortField()?.id === f.id
                    ? sortAscending()
                      ? "arrow_upward"
                      : "arrow_downward"
                    : ""
                }}</mat-icon>
                <span>{{ f.name }}</span>
              </button>
            }
          </mat-menu>

          <button
            mat-icon-button
            type="button"
            class="more-btn"
            [matMenuTriggerFor]="moreMenu"
            aria-label="More actions"
          >
            <mat-icon>more_horiz</mat-icon>
          </button>
          <mat-menu #moreMenu="matMenu">
            <a
              mat-menu-item
              [routerLink]="['/collections', collectionId(), 'import']"
            >
              <mat-icon>upload</mat-icon><span>Import</span>
            </a>
            <button
              mat-menu-item
              type="button"
              [disabled]="!canExport()"
              (click)="export.emit()"
            >
              <mat-icon>download</mat-icon><span>Export CSV</span>
            </button>
          </mat-menu>
        } @else {
          <span class="spacer"></span>
          <a
            mat-stroked-button
            class="tool-btn"
            [routerLink]="['/collections', collectionId(), 'import']"
          >
            <mat-icon>upload</mat-icon><span class="label">Import</span>
          </a>
          <button
            mat-stroked-button
            type="button"
            class="tool-btn"
            [disabled]="!canExport()"
            (click)="export.emit()"
          >
            <mat-icon>download</mat-icon><span class="label">Export CSV</span>
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
      color: var(--mat-sys-on-surface-variant);
      opacity: 0.8;
    }
    .tools {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .tool-btn {
      height: 44px;
      border-radius: 12px;
      white-space: nowrap;
    }
    .tool-btn.on {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    .count {
      min-width: 20px;
      height: 20px;
      display: inline-grid;
      place-items: center;
      margin-left: 6px;
      padding: 0 5px;
      border-radius: 999px;
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
      font-size: 0.6875rem;
      font-weight: 700;
      line-height: 1;
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
