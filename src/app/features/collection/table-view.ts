import { httpResource } from "@angular/common/http";
import {
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatMenuModule } from "@angular/material/menu";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { Router, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";

import { CollectionContext } from "../../core/collection-context";
import { FieldTypeCatalog } from "../../core/field-types.service";
import { formatMetric } from "../../core/format";
import {
  httpStatus,
  problemExtension,
  problemMessage,
} from "../../core/http-errors";
import {
  Field,
  RecordList,
  SummaryMetric,
  SummaryReport,
  TrackerRecord,
} from "../../core/models";
import { Notify } from "../../core/notify.service";
import { RecordsApi } from "../../core/records-api.service";

import { ConfirmDialog } from "../../shared/confirm-dialog";
import { FieldValue } from "../../shared/field-value";

import { FilterPanel } from "./filter-panel";
import { FilterDraft, toApiFilters } from "./filters";

@Component({
  selector: "app-table-view",

  imports: [
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressBarModule,
    FieldValue,
    FilterPanel,
  ],

  template: `
    <div class="page table-page">
      <!-- =====================================================
           TOOLBAR
           ===================================================== -->

      <section class="toolbar" aria-label="Record controls">
        <div class="toolbar-main">
          <!-- Search -->
          <mat-form-field
            appearance="outline"
            subscriptSizing="dynamic"
            class="search"
          >
            <mat-label>Search records</mat-label>

            <input
              matInput
              [value]="searchInput()"
              (input)="onSearch($event)"
              autocomplete="off"
            />

            @if (searchInput()) {
              <button
                mat-icon-button
                matSuffix
                type="button"
                aria-label="Clear search"
                (click)="searchInput.set('')"
              >
                <mat-icon>close</mat-icon>
              </button>
            } @else {
              <mat-icon matSuffix class="search-suffix-icon">search</mat-icon>
            }
          </mat-form-field>

          <!-- Filters Toggle -->
          <button
            mat-stroked-button
            type="button"
            class="filter-button"
            [class.active-filters]="activeFilters().length > 0"
            [class.is-open]="showFilters()"
            (click)="showFilters.set(!showFilters())"
            [attr.aria-expanded]="showFilters()"
          >
            <mat-icon>tune</mat-icon>

            <span class="filter-text">Filters</span>

            @if (activeFilters().length) {
              <span class="count" aria-label="Active filters">
                {{ activeFilters().length }}
              </span>
            }
          </button>
        </div>

        <!-- Secondary actions -->
        <div class="toolbar-actions">
          <a
            mat-stroked-button
            class="action-btn"
            [routerLink]="['/collections', ctx.id(), 'import']"
          >
            <mat-icon>upload</mat-icon>
            <span>Import</span>
          </a>

          <button
            mat-stroked-button
            type="button"
            class="action-btn"
            (click)="export()"
            [disabled]="!data()?.total"
          >
            <mat-icon>download</mat-icon>
            <span>Export CSV</span>
          </button>
        </div>
      </section>

      <!-- =====================================================
           FILTER PANEL
           ===================================================== -->

      @if (showFilters()) {
        <div class="filters">
          <app-filter-panel [fields]="ctx.fields()" [(filters)]="filters" />
        </div>
      }

      <!-- =====================================================
           LOADING
           ===================================================== -->

      @if (list.isLoading()) {
        <mat-progress-bar
          class="loading"
          mode="indeterminate"
          aria-label="Loading records"
        />
      }

      <!-- =====================================================
           ERROR
           ===================================================== -->

      @if (list.error() && !data()) {
        <div class="empty-state">
          <div class="empty-icon-box error-box" aria-hidden="true">
            <mat-icon>cloud_off</mat-icon>
          </div>

          <h3>Could not load records</h3>

          <p>Something went wrong while loading the records.</p>

          <button mat-stroked-button type="button" (click)="list.reload()">
            <mat-icon>refresh</mat-icon>
            Try again
          </button>
        </div>
      } @else if (data(); as d) {
        <!-- ================= EMPTY ================= -->

        @if (d.total === 0 && !hasQuery()) {
          <div class="empty-state">
            <div class="empty-icon-box" aria-hidden="true">
              <mat-icon>playlist_add</mat-icon>
            </div>

            <h3>No records yet</h3>

            <p>
              Add your first entry to
              {{ ctx.detail.value()?.name }}.
            </p>

            <a
              mat-flat-button
              [routerLink]="['/collections', ctx.id(), 'records', 'new']"
            >
              <mat-icon>add</mat-icon>
              Add a record
            </a>
          </div>
        }

        <!-- ================= NO RESULTS ================= -->

        @else if (d.total === 0) {
          <div class="empty-state">
            <div class="empty-icon-box" aria-hidden="true">
              <mat-icon>search_off</mat-icon>
            </div>

            <h3>Nothing matches</h3>

            <p>Try changing your search or filters.</p>

            <button mat-stroked-button type="button" (click)="clearAll()">
              <mat-icon>filter_alt_off</mat-icon>
              Clear search and filters
            </button>
          </div>
        }

        <!-- ================= TABLE ================= -->

        @else {
          <div
            class="table-container surface-card"
            [class.loading-table]="list.isLoading()"
          >
            <div class="table-scroll">
              <table>
                <!-- ================= HEADER ================= -->

                <thead>
                  <tr>
                    @for (f of columns(); track f.id) {
                      <th scope="col" [attr.aria-sort]="ariaSort(f)">
                        @if (catalog.sortable(f.type)) {
                          <button
                            type="button"
                            class="sort"
                            (click)="toggleSort(f)"
                          >
                            <span>{{ f.name }}</span>

                            <mat-icon class="arrow">
                              {{
                                sortBy() === f.id
                                  ? sortDir() === "asc"
                                    ? "arrow_upward"
                                    : "arrow_downward"
                                  : "unfold_more"
                              }}
                            </mat-icon>
                          </button>
                        } @else {
                          <span>{{ f.name }}</span>
                        }
                      </th>
                    }

                    <th class="actions-col" scope="col">
                      <span class="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>

                <!-- ================= BODY ================= -->

                <tbody>
                  @for (r of d.items; track r.id) {
                    <tr class="record-row" (click)="open(r)">
                      @for (f of columns(); track f.id; let first = $first) {
                        <td>
                          @if (first) {
                            <a
                              class="first"
                              [routerLink]="[
                                '/collections',
                                ctx.id(),
                                'records',
                                r.id,
                              ]"
                              (click)="$event.stopPropagation()"
                            >
                              <app-field-value
                                [field]="f"
                                [value]="r.values[f.key]"
                                [references]="d.references"
                              />
                            </a>
                          } @else {
                            <app-field-value
                              [field]="f"
                              [value]="r.values[f.key]"
                              [references]="d.references"
                            />
                          }
                        </td>
                      }

                      <!-- Row actions (Sticky on horizontal scroll) -->
                      <td
                        class="actions-col"
                        (click)="$event.stopPropagation()"
                      >
                        <button
                          mat-icon-button
                          class="row-action-btn"
                          [matMenuTriggerFor]="rowMenu"
                          [attr.aria-label]="'Actions for ' + labelOf(r)"
                        >
                          <mat-icon>more_vert</mat-icon>
                        </button>

                        <mat-menu #rowMenu="matMenu">
                          <a
                            mat-menu-item
                            [routerLink]="[
                              '/collections',
                              ctx.id(),
                              'records',
                              r.id,
                            ]"
                          >
                            <mat-icon>visibility</mat-icon>
                            <span>View</span>
                          </a>

                          <a
                            mat-menu-item
                            [routerLink]="[
                              '/collections',
                              ctx.id(),
                              'records',
                              r.id,
                              'edit',
                            ]"
                          >
                            <mat-icon>edit</mat-icon>
                            <span>Edit</span>
                          </a>

                          <button
                            mat-menu-item
                            type="button"
                            class="delete-item"
                            (click)="remove(r)"
                          >
                            <mat-icon>delete</mat-icon>
                            <span>Delete</span>
                          </button>
                        </mat-menu>
                      </td>
                    </tr>
                  }
                </tbody>

                <!-- ================= SUMMARY ================= -->

                @if (summary.value()?.metrics?.length) {
                  <tfoot>
                    <tr>
                      @for (f of columns(); track f.id) {
                        <td>
                          @if (metricByField().get(f.id); as m) {
                            <span class="agg">
                              <span class="agg-label">
                                {{ aggName(m) }}
                              </span>
                              <span class="agg-value">
                                {{ format(m) }}
                              </span>
                            </span>
                          }
                        </td>
                      }

                      <td class="actions-col"></td>
                    </tr>
                  </tfoot>
                }
              </table>
            </div>
          </div>

          <!-- ================= PAGINATION ================= -->

          <mat-paginator
            class="paginator"
            [length]="d.total"
            [pageIndex]="page() - 1"
            [pageSize]="pageSize()"
            [pageSizeOptions]="[10, 25, 50, 100]"
            (page)="onPage($event)"
            aria-label="Select page of records"
          />
        }
      }
    </div>
  `,

  styles: `
    :host {
      display: block;
    }

    /* =========================================================
       PAGE
       ========================================================= */

    .table-page {
      padding-top: 16px;
    }

    /* =========================================================
       TOOLBAR
       ========================================================= */

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }

    .toolbar-main {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .search {
      flex: 1 1 320px;
      max-width: 400px;
      min-width: 200px;
    }

    .search-suffix-icon {
      color: var(--mat-sys-on-surface-variant, #49454f);
      opacity: 0.8;
    }

    .filter-button {
      flex-shrink: 0;
      height: 48px;
      padding: 0 16px;
      border-radius: 12px;
      transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .filter-button.is-open,
    .filter-button.active-filters {
      background: var(--mat-sys-secondary-container, #e8def8);
      color: var(--mat-sys-on-secondary-container, #1d192b);
      border-color: color-mix(
        in srgb,
        var(--mat-sys-secondary, #625b71) 60%,
        transparent
      );
    }

    .action-btn {
      height: 40px;
      border-radius: 10px;
      font-weight: 500;
    }

    /* =========================================================
       FILTER COUNT
       ========================================================= */

    .count {
      min-width: 20px;
      height: 20px;
      display: inline-grid;
      place-items: center;
      margin-left: 6px;
      padding: 0 5px;
      border-radius: 999px;
      background: var(--mat-sys-primary, #6750a4);
      color: var(--mat-sys-on-primary, #ffffff);
      font-size: 0.6875rem;
      font-weight: 700;
      line-height: 1;
    }

    /* =========================================================
       FILTERS
       ========================================================= */

    .filters {
      margin-bottom: 16px;
    }

    /* =========================================================
       LOADING PROGRESS BAR
       ========================================================= */

    .loading {
      height: 4px;
      margin-bottom: 10px;
      border-radius: 999px;
      overflow: hidden;
    }

    /* =========================================================
       TABLE CONTAINER
       ========================================================= */

    .table-container {
      position: relative;
      border-radius: 16px;
      border: 1px solid var(--mat-sys-outline-variant, #e0e2ec);
      background: var(--mat-sys-surface, #ffffff);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      overflow: hidden;
      transition: opacity 180ms ease;
    }

    .table-container.loading-table {
      opacity: 0.6;
      pointer-events: none;
    }

    .table-scroll {
      max-height: calc(100vh - 300px);
      min-height: 220px;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
    }

    /* =========================================================
       TABLE
       ========================================================= */

    table {
      width: 100%;
      min-width: 680px;
      border-collapse: separate;
      border-spacing: 0;
    }

    th,
    td {
      padding: 12px 16px;
      text-align: left;
      vertical-align: middle;
      border-bottom: 1px solid var(--mat-sys-outline-variant, #e0e2ec);
    }

    /* =========================================================
       TABLE HEADER
       ========================================================= */

    thead th {
      position: sticky;
      top: 0;
      z-index: 2;
      height: 46px;
      background: var(--mat-sys-surface-container, #f3edf7);
      color: var(--mat-sys-on-surface, #1d1b20);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    /* =========================================================
       ROWS
       ========================================================= */

    .record-row {
      cursor: pointer;
      transition: background-color 100ms ease;
    }

    .record-row:hover {
      background: var(--mat-sys-surface-container-lowest, #fdfbff);
    }

    .record-row:last-child td {
      border-bottom: 0;
    }

    /* =========================================================
       SORT
       ========================================================= */

    .sort {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 6px;
      margin: -4px -6px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: inherit;
      font: inherit;
      font-weight: inherit;
      letter-spacing: inherit;
      text-transform: inherit;
      cursor: pointer;
      white-space: nowrap;
      transition:
        background-color 140ms ease,
        color 140ms ease;
    }

    .sort:hover {
      background: var(--mat-sys-surface-container-high, #ece6f0);
      color: var(--mat-sys-primary, #6750a4);
    }

    .sort:focus-visible {
      outline: 2px solid var(--mat-sys-primary, #6750a4);
      outline-offset: 2px;
    }

    .sort .arrow {
      width: 18px;
      height: 18px;
      font-size: 18px;
      opacity: 0.55;
      transition:
        opacity 140ms ease,
        color 140ms ease;
    }

    .sort:hover .arrow {
      opacity: 1;
    }

    th[aria-sort="ascending"] .arrow,
    th[aria-sort="descending"] .arrow {
      opacity: 1;
      color: var(--mat-sys-primary, #6750a4);
    }

    /* =========================================================
       FIRST COLUMN / PRIMARY LINK
       ========================================================= */

    .first {
      display: inline-block;
      max-width: 100%;
      color: var(--mat-sys-primary, #6750a4);
      font-weight: 600;
      text-decoration: none;
      overflow-wrap: anywhere;
    }

    .first:hover {
      text-decoration: underline;
    }

    /* =========================================================
       STICKY ACTIONS COLUMN
       ========================================================= */

    .actions-col {
      width: 52px;
      min-width: 52px;
      padding: 6px 8px;
      text-align: right;
      position: sticky;
      right: 0;
      background: var(--mat-sys-surface, #ffffff);
      z-index: 1;
      box-shadow: -3px 0 6px -2px rgba(0, 0, 0, 0.05);
    }

    thead .actions-col {
      background: var(--mat-sys-surface-container, #f3edf7);
      z-index: 3;
    }

    .record-row:hover .actions-col {
      background: var(--mat-sys-surface-container-lowest, #fdfbff);
    }

    tfoot .actions-col {
      background: var(--mat-sys-surface-container, #f3edf7);
      z-index: 2;
    }

    .row-action-btn {
      color: var(--mat-sys-on-surface-variant, #49454f);
    }

    .delete-item {
      color: var(--mat-sys-error, #ba1a1a);
    }

    .delete-item mat-icon {
      color: var(--mat-sys-error, #ba1a1a);
    }

    /* =========================================================
       SUMMARY FOOTER
       ========================================================= */

    tfoot td {
      position: sticky;
      bottom: 0;
      z-index: 2;
      background: var(--mat-sys-surface-container, #f3edf7);
      color: var(--mat-sys-on-surface, #1d1b20);
      font-weight: 600;
      border-top: 2px solid var(--mat-sys-outline-variant, #e0e2ec);
      border-bottom: 0;
    }

    .agg {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 6px;
      background: var(--mat-sys-surface-container-high, #ece6f0);
      font-size: 0.8125rem;
      white-space: nowrap;
    }

    .agg-label {
      color: var(--mat-sys-on-surface-variant, #49454f);
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .agg-value {
      font-weight: 700;
    }

    /* =========================================================
       PAGINATOR
       ========================================================= */

    .paginator {
      margin-top: 6px;
      background: transparent;
      border-radius: 12px;
    }

    /* =========================================================
       EMPTY STATES
       ========================================================= */

    .empty-state {
      min-height: 260px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 20px;
      margin: 12px 0;
      border-radius: 16px;
      border: 1.5px dashed var(--mat-sys-outline-variant, #cac4d0);
      background: var(--mat-sys-surface, #ffffff);
    }

    .empty-icon-box {
      width: 56px;
      height: 56px;
      display: grid;
      place-items: center;
      border-radius: 16px;
      background: var(--mat-sys-surface-container, #f3edf7);
      color: var(--mat-sys-on-surface-variant, #49454f);
      margin-bottom: 14px;
    }

    .empty-icon-box mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .empty-icon-box.error-box {
      background: var(--mat-sys-error-container, #ffdad6);
      color: var(--mat-sys-on-error-container, #410002);
    }

    .empty-state h3 {
      margin: 0 0 6px;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--mat-sys-on-surface, #1d1b20);
    }

    .empty-state p {
      max-width: 420px;
      margin: 0 0 20px;
      font-size: 0.9rem;
      line-height: 1.45;
      color: var(--mat-sys-on-surface-variant, #49454f);
    }

    .empty-state button,
    .empty-state a {
      border-radius: 10px;
      min-height: 40px;
    }

    /* =========================================================
       SCREEN READER ONLY
       ========================================================= */

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* =========================================================
       TABLET (<= 900px)
       ========================================================= */

    @media (max-width: 900px) {
      .toolbar {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }

      .toolbar-main {
        width: 100%;
      }

      .toolbar-actions {
        justify-content: flex-end;
      }
    }

    /* =========================================================
       MOBILE (<= 640px)
       ========================================================= */

    @media (max-width: 640px) {
      .table-page {
        padding-top: 10px;
      }

      .toolbar {
        gap: 8px;
        margin-bottom: 10px;
      }

      .toolbar-main {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .search {
        flex: 1 1 auto;
        min-width: 0;
        max-width: none;
      }

      .filter-button {
        padding: 0 12px;
      }

      .toolbar-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        width: 100%;
        gap: 8px;
      }

      .action-btn {
        width: 100%;
        justify-content: center;
      }

      .table-container {
        border-radius: 14px;
      }

      .table-scroll {
        max-height: 58vh;
      }

      th,
      td {
        padding: 10px 12px;
      }
    }

    /* =========================================================
       TINY PHONES (<= 380px)
       ========================================================= */

    @media (max-width: 380px) {
      .filter-text {
        display: none;
      }

      .filter-button {
        padding: 0 10px;
      }

      .action-btn span {
        font-size: 0.8125rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .record-row,
      .filter-button,
      .table-container {
        transition: none;
      }
    }
  `,
})
export class TableView {
  protected readonly ctx = inject(CollectionContext);

  protected readonly catalog = inject(FieldTypeCatalog);

  private readonly records = inject(RecordsApi);

  private readonly dialog = inject(MatDialog);

  private readonly notify = inject(Notify);

  private readonly router = inject(Router);

  /* =========================================================
     STATE
     ========================================================= */

  protected readonly searchInput = signal("");

  protected readonly search = signal("");

  protected readonly sortBy = signal<string | null>(null);

  protected readonly sortDir = signal<"asc" | "desc">("desc");

  protected readonly page = signal(1);

  protected readonly pageSize = signal(25);

  protected readonly filters = signal<FilterDraft[]>([]);

  protected readonly showFilters = signal(false);

  /* =========================================================
     COLUMNS / FILTERS
     ========================================================= */

  protected readonly columns = computed<Field[]>(() =>
    this.ctx.fields().filter((f) => f.showInList),
  );

  protected readonly activeFilters = computed(() =>
    toApiFilters(this.filters(), this.ctx.fieldsById(), this.catalog),
  );

  protected readonly hasQuery = computed(
    () => !!this.search() || this.activeFilters().length > 0,
  );

  /* =========================================================
     REQUEST PARAMETERS
     ========================================================= */

  private readonly baseParams = computed(() => {
    const p: Record<string, string | number> = {};

    if (this.search()) {
      p["search"] = this.search();
    }

    const f = this.activeFilters();

    if (f.length) {
      p["filters"] = JSON.stringify(f);
    }

    return p;
  });

  private readonly listParams = computed(() => {
    const p: Record<string, string | number> = {
      ...this.baseParams(),

      page: this.page(),

      pageSize: this.pageSize(),
    };

    const by = this.sortBy();

    if (by) {
      p["sortBy"] = by;

      p["sortDir"] = this.sortDir();
    }

    return p;
  });

  /* =========================================================
     DATA
     ========================================================= */

  protected readonly list = httpResource<RecordList>(() => {
    const id = this.ctx.id();

    return id
      ? {
          url: `/api/collections/${id}/records`,
          params: this.listParams(),
        }
      : undefined;
  });

  /**
   * Summary uses the same search and filters
   * so the footer totals describe the records
   * currently represented by the table.
   */
  protected readonly summary = httpResource<SummaryReport>(() => {
    const id = this.ctx.id();

    return id
      ? {
          url: `/api/collections/${id}/summary`,
          params: this.baseParams(),
        }
      : undefined;
  });

  /**
   * Keep the previous page visible while
   * the next request is loading.
   */
  protected readonly data = linkedSignal<
    RecordList | undefined,
    RecordList | undefined
  >({
    source: () => this.list.value(),

    computation: (next, previous) => next ?? previous?.value,
  });

  protected readonly metricByField = computed(
    () =>
      new Map(
        (this.summary.value()?.metrics ?? []).map(
          (m) => [m.fieldId, m] as const,
        ),
      ),
  );

  /* =========================================================
     EFFECTS
     ========================================================= */

  constructor() {
    /*
     * Debounce search input.
     */
    effect((onCleanup) => {
      const value = this.searchInput().trim();

      const timer = setTimeout(() => this.search.set(value), 300);

      onCleanup(() => clearTimeout(timer));
    });

    /*
     * Any query/filter/sort change
     * returns to the first page.
     */
    effect(() => {
      this.search();

      this.activeFilters();

      this.sortBy();

      this.sortDir();

      untracked(() => this.page.set(1));
    });

    /*
     * Server may clamp the page.
     */
    effect(() => {
      const d = this.list.value();

      if (d && d.page !== untracked(this.page)) {
        untracked(() => this.page.set(d.page));
      }
    });
  }

  /* =========================================================
     SEARCH / PAGINATION
     ========================================================= */

  protected onSearch(event: Event): void {
    this.searchInput.set((event.target as HTMLInputElement).value);
  }

  protected onPage(event: PageEvent): void {
    this.pageSize.set(event.pageSize);

    this.page.set(event.pageIndex + 1);
  }

  /* =========================================================
     SORT
     ========================================================= */

  protected toggleSort(field: Field): void {
    if (this.sortBy() !== field.id) {
      this.sortBy.set(field.id);

      this.sortDir.set("asc");

      return;
    }

    if (this.sortDir() === "asc") {
      this.sortDir.set("desc");

      return;
    }

    this.sortBy.set(null);

    this.sortDir.set("desc");
  }

  protected ariaSort(field: Field): string | null {
    if (this.sortBy() !== field.id) {
      return null;
    }

    return this.sortDir() === "asc" ? "ascending" : "descending";
  }

  /* =========================================================
     CLEAR
     ========================================================= */

  protected clearAll(): void {
    this.searchInput.set("");

    this.search.set("");

    this.filters.set([]);
  }

  /* =========================================================
     NAVIGATION
     ========================================================= */

  protected open(record: TrackerRecord): void {
    void this.router.navigate([
      "/collections",
      this.ctx.id(),
      "records",
      record.id,
    ]);
  }

  /* =========================================================
     SUMMARY
     ========================================================= */

  protected format(metric: SummaryMetric): string {
    return formatMetric(metric);
  }

  protected aggName(metric: SummaryMetric): string {
    return {
      count: "Count",
      sum: "Total",
      average: "Avg",
      min: "Min",
      max: "Max",
      none: "",
    }[metric.aggregation];
  }

  /* =========================================================
     RECORD LABEL
     ========================================================= */

  protected labelOf(record: TrackerRecord): string {
    const key = this.ctx.titleField()?.key;

    const value = key ? record.values[key] : null;

    return typeof value === "string" && value ? value : "this record";
  }

  /* =========================================================
     EXPORT
     ========================================================= */

  protected async export(): Promise<void> {
    const id = this.ctx.id();

    if (!id) {
      return;
    }

    try {
      await this.records.exportCsv(
        id,
        this.baseParams(),
        this.ctx.detail.value()?.name ?? "export",
      );
    } catch (err) {
      this.notify.error(problemMessage(err, "Export failed."));
    }
  }

  /* =========================================================
     DELETE
     ========================================================= */

  protected async remove(record: TrackerRecord): Promise<void> {
    const name = this.labelOf(record);

    if (
      !(await this.confirm(
        "Delete record?",
        `“${name}” will be permanently deleted.`,
        "Delete",
      ))
    ) {
      return;
    }

    try {
      await this.records.remove(record.id, false);
    } catch (err) {
      if (httpStatus(err) !== 409) {
        return this.notify.error(problemMessage(err));
      }

      const count = problemExtension<number>(err, "referenceCount") ?? 0;

      const again = await this.confirm(
        "This record is referenced elsewhere",
        `${count} other record(s) point to “${name}”. Deleting it will clear those references.`,
        "Delete anyway",
      );

      if (!again) {
        return;
      }

      try {
        await this.records.remove(record.id, true);
      } catch (error) {
        return this.notify.error(problemMessage(error));
      }
    }

    this.notify.info("Record deleted.");

    this.list.reload();

    this.summary.reload();

    this.ctx.detail.reload();
  }

  /* =========================================================
     CONFIRM DIALOG
     ========================================================= */

  private confirm(
    title: string,
    message: string,
    confirmLabel: string,
  ): Promise<boolean> {
    return firstValueFrom(
      this.dialog
        .open<ConfirmDialog, unknown, boolean>(ConfirmDialog, {
          data: {
            title,
            message,
            confirmLabel,
            destructive: true,
          },
        })
        .afterClosed(),
    ).then((value) => value === true);
  }
}
