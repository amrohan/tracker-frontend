import { BreakpointObserver } from "@angular/cdk/layout";
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
import { toSignal } from "@angular/core/rxjs-interop";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { Router, RouterLink, RouterOutlet } from "@angular/router";
import { firstValueFrom, map } from "rxjs";

import { CollectionContext } from "../../core/collection-context";
import { FieldTypeCatalog } from "../../core/field-types.service";
import {
  httpStatus,
  problemExtension,
  problemMessage,
} from "../../core/http-errors";
import {
  Field,
  RecordList,
  SummaryReport,
  TrackerRecord,
} from "../../core/models";
import { Notify } from "../../core/notify.service";
import { RecordsApi } from "../../core/records-api.service";
import { ConfirmDialog } from "../../shared/confirm-dialog";

import { recordLabel } from "./record-list.utils";
import { RecordCardList } from "./record-card-list";
import { FilterPanel } from "./filter-panel";
import { FilterDraft, toApiFilters } from "./filters";
import { RecordTable } from "./record-table";
import { RecordToolbar } from "./record-toolbar";

@Component({
  selector: "app-table-view",
  imports: [
    RouterLink,
    RouterOutlet,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    FilterPanel,
    RecordToolbar,
    RecordCardList,
    RecordTable,
  ],
  template: `
    <div class="page table-page">
      <app-record-toolbar
        [collectionId]="collectionId()"
        [compact]="isMobile()"
        [searchValue]="searchInput()"
        (search)="searchInput.set($event)"
        [filtersOpen]="showFilters()"
        (toggleFilters)="showFilters.set(!showFilters())"
        [activeFilterCount]="activeFilters().length"
        [sortableFields]="sortableColumns()"
        [sortField]="sortField()"
        [sortAscending]="sortDir() === 'asc'"
        (sortReset)="resetSort()"
        (sortPick)="pickSort($event)"
        [canExport]="!!data()?.total"
        (export)="export()"
      />

      @if (showFilters()) {
        <div class="filters">
          <app-filter-panel [fields]="ctx.fields()" [(filters)]="filters" />
        </div>
      }

      @if (list.isLoading()) {
        <mat-progress-bar
          class="loading"
          mode="indeterminate"
          aria-label="Loading records"
        />
      }

      @if (list.error() && !data()) {
        <div class="empty-state">
          <div class="empty-icon-box error-box" aria-hidden="true">
            <mat-icon>cloud_off</mat-icon>
          </div>
          <h3>Could not load records</h3>
          <p>Something went wrong while loading the records.</p>
          <button mat-stroked-button type="button" (click)="list.reload()">
            <mat-icon>refresh</mat-icon> Try again
          </button>
        </div>
      } @else if (data(); as d) {
        @if (d.total === 0 && !hasQuery()) {
          <div class="empty-state">
            <div class="empty-icon-box" aria-hidden="true">
              <mat-icon>playlist_add</mat-icon>
            </div>
            <h3>No records yet</h3>
            <p>Add your first entry to {{ ctx.detail.value()?.name }}.</p>
            <a
              mat-flat-button
              [routerLink]="['/collections', collectionId(), 'records', 'new']"
            >
              <mat-icon>add</mat-icon> Add a record
            </a>
          </div>
        } @else if (d.total === 0) {
          <div class="empty-state">
            <div class="empty-icon-box" aria-hidden="true">
              <mat-icon>search_off</mat-icon>
            </div>
            <h3>Nothing matches</h3>
            <p>Try changing your search or filters.</p>
            <button mat-stroked-button type="button" (click)="clearAll()">
              <mat-icon>filter_alt_off</mat-icon> Clear search and filters
            </button>
          </div>
        } @else {
          <p class="count-line" aria-live="polite">
            @if (hasQuery() && total()) {
              {{ d.total }} of {{ total() }} records match
            } @else {
              {{ d.total }} {{ d.total === 1 ? "record" : "records" }}
            }
          </p>

          @if (isMobile()) {
            <app-record-card-list
              [collectionId]="collectionId()"
              [titleField]="titleCol()"
              [cardFields]="cardFields()"
              [items]="d.items"
              [references]="d.references"
              [metrics]="metrics()"
              [filtered]="hasQuery()"
              [dimmed]="list.isLoading()"
              (open)="open($event)"
              (delete)="remove($event)"
            />
          } @else {
            <app-record-table
              [collectionId]="collectionId()"
              [columns]="columns()"
              [items]="d.items"
              [references]="d.references"
              [metrics]="metrics()"
              [sortFieldId]="sortBy()"
              [sortAscending]="sortDir() === 'asc'"
              [loading]="list.isLoading()"
              (toggleSort)="toggleSort($event)"
              (open)="open($event)"
              (delete)="remove($event)"
            />
          }

          <mat-paginator
            class="paginator"
            [length]="d.total"
            [pageIndex]="page() - 1"
            [pageSize]="pageSize()"
            [pageSizeOptions]="[10, 25, 50, 100]"
            [hidePageSize]="isMobile()"
            [showFirstLastButtons]="!isMobile()"
            (page)="onPage($event)"
            aria-label="Select page of records"
          />
        }
      }
    </div>
    <router-outlet />
  `,
  styles: `
    :host {
      display: block;
    }
    .table-page {
      padding-top: 16px;
    }

    .filters {
      margin-bottom: 14px;
    }
    .loading {
      height: 4px;
      margin-bottom: 10px;
      border-radius: 999px;
      overflow: hidden;
    }
    .count-line {
      margin: 4px 2px 10px;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .paginator {
      margin-top: 8px;
      background: transparent;
    }

    .empty-state {
      min-height: 240px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 36px 20px;
      margin: 12px 0;
      border-radius: 16px;
      border: 1.5px dashed var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface);
    }
    .empty-icon-box {
      width: 56px;
      height: 56px;
      display: grid;
      place-items: center;
      border-radius: 16px;
      margin-bottom: 14px;
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface-variant);
    }
    .empty-icon-box mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    .empty-icon-box.error-box {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
    .empty-state h3 {
      margin: 0 0 6px;
      font-size: 1.25rem;
    }
    .empty-state p {
      max-width: 420px;
      margin: 0 0 18px;
      font-size: 0.9375rem;
      line-height: 1.45;
      color: var(--mat-sys-on-surface-variant);
    }

    @media (max-width: 767px) {
      .table-page {
        padding-top: 10px;
        padding-bottom: 96px;
      } /* room for the floating "Add record" button */
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
  private seenVersion = untracked(() => this.ctx.recordsVersion());

  /** Phones get cards; tablets and desktops get the table. */
  protected readonly isMobile = toSignal(
    inject(BreakpointObserver)
      .observe("(max-width: 767px)")
      .pipe(map((s) => s.matches)),
    { initialValue: false },
  );

  protected readonly collectionId = computed(() => this.ctx.id() ?? "");

  /* ------------------------------ query state ------------------------------ */
  protected readonly searchInput = signal("");
  protected readonly search = signal("");
  protected readonly sortBy = signal<string | null>(null);
  protected readonly sortDir = signal<"asc" | "desc">("desc");
  protected readonly page = signal(1);
  protected readonly pageSize = signal(25);
  protected readonly filters = signal<FilterDraft[]>([]);
  protected readonly showFilters = signal(false);

  /* -------------------------- derived from fields --------------------------- */
  protected readonly columns = computed<Field[]>(() =>
    this.ctx.fields().filter((f) => f.showInList),
  );
  protected readonly titleCol = computed<Field | undefined>(
    () => this.columns()[0],
  );
  protected readonly cardFields = computed<Field[]>(() =>
    this.columns().slice(1),
  );
  protected readonly sortableColumns = computed<Field[]>(() =>
    this.columns().filter((f) => this.catalog.sortable(f.type)),
  );
  protected readonly sortField = computed<Field | null>(() => {
    const id = this.sortBy();
    return id ? (this.ctx.fieldsById().get(id) ?? null) : null;
  });
  protected readonly activeFilters = computed(() =>
    toApiFilters(this.filters(), this.ctx.fieldsById(), this.catalog),
  );
  protected readonly hasQuery = computed(
    () => !!this.search() || this.activeFilters().length > 0,
  );
  /** Total records in the collection (for "3 of 24 match"). */
  protected readonly total = computed(
    () => this.ctx.detail.value()?.recordCount ?? 0,
  );

  /* --------------------------- request parameters --------------------------- */
  private readonly baseParams = computed(() => {
    const p: Record<string, string | number> = {};
    if (this.search()) p["search"] = this.search();
    const f = this.activeFilters();
    if (f.length) p["filters"] = JSON.stringify(f);
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

  /* -------------------------------- data ------------------------------------ */
  protected readonly list = httpResource<RecordList>(() => {
    const id = this.ctx.id();
    return id
      ? { url: `/api/collections/${id}/records`, params: this.listParams() }
      : undefined;
  });

  /** Same search and filters, so totals always describe what the list shows. */
  protected readonly summary = httpResource<SummaryReport>(() => {
    const id = this.ctx.id();
    return id
      ? { url: `/api/collections/${id}/summary`, params: this.baseParams() }
      : undefined;
  });

  /** Keeps the previous page on screen while the next one loads. */
  protected readonly data = linkedSignal<
    RecordList | undefined,
    RecordList | undefined
  >({
    source: () => this.list.value(),
    computation: (next, previous) => next ?? previous?.value,
  });

  protected readonly metrics = computed(
    () => this.summary.value()?.metrics ?? [],
  );

  constructor() {
    // reload the list and totals when a drawer saved or deleted a record
    effect(() => {
      const version = this.ctx.recordsVersion();
      untracked(() => {
        if (version === this.seenVersion) return;
        this.seenVersion = version;
        this.list.reload();
        this.summary.reload();
      });
    });

    // debounce the search box
    effect((onCleanup) => {
      const value = this.searchInput().trim();
      const timer = setTimeout(() => this.search.set(value), 300);
      onCleanup(() => clearTimeout(timer));
    });

    // any query / sort change returns to the first page
    effect(() => {
      this.search();
      this.activeFilters();
      this.sortBy();
      this.sortDir();
      untracked(() => this.page.set(1));
    });

    // the server clamps out-of-range pages
    effect(() => {
      const d = this.list.value();
      if (d && d.page !== untracked(this.page))
        untracked(() => this.page.set(d.page));
    });
  }

  /* ------------------------------- paging ------------------------------ */
  protected onPage(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.page.set(event.pageIndex + 1);
  }

  /* -------------------------------- sort -------------------------------- */
  /** Desktop header click: asc -> desc -> default. */
  protected toggleSort(field: Field): void {
    if (this.sortBy() !== field.id) {
      this.sortBy.set(field.id);
      this.sortDir.set("asc");
    } else if (this.sortDir() === "asc") {
      this.sortDir.set("desc");
    } else {
      this.resetSort();
    }
  }

  /** Mobile menu: choosing the same field again flips the direction. */
  protected pickSort(field: Field): void {
    if (this.sortBy() !== field.id) {
      this.sortBy.set(field.id);
      this.sortDir.set("asc");
    } else {
      this.sortDir.set(this.sortDir() === "asc" ? "desc" : "asc");
    }
  }

  protected resetSort(): void {
    this.sortBy.set(null);
    this.sortDir.set("desc");
  }

  protected clearAll(): void {
    this.searchInput.set("");
    this.search.set("");
    this.filters.set([]);
  }

  /* ---------------------------- navigation ------------------------------ */
  protected open(record: TrackerRecord): void {
    void this.router.navigate([
      "/collections",
      this.collectionId(),
      "records",
      record.id,
    ]);
  }

  /* ------------------------------- export -------------------------------- */
  protected async export(): Promise<void> {
    const id = this.ctx.id();
    if (!id) return;
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

  /* ------------------------------- delete -------------------------------- */
  protected async remove(record: TrackerRecord): Promise<void> {
    const name = recordLabel(record, this.titleCol()?.key);

    if (
      !(await this.confirm(
        "Delete record?",
        `“${name}” will be permanently deleted.`,
        "Delete",
      ))
    )
      return;

    try {
      await this.records.remove(record.id, false);
    } catch (err) {
      if (httpStatus(err) !== 409)
        return this.notify.error(problemMessage(err));

      const count = problemExtension<number>(err, "referenceCount") ?? 0;
      const again = await this.confirm(
        "This record is referenced elsewhere",
        `${count} other record(s) point to “${name}”. Deleting it will clear those references.`,
        "Delete anyway",
      );
      if (!again) return;

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

  private confirm(
    title: string,
    message: string,
    confirmLabel: string,
  ): Promise<boolean> {
    return firstValueFrom(
      this.dialog
        .open<ConfirmDialog, unknown, boolean>(ConfirmDialog, {
          data: { title, message, confirmLabel, destructive: true },
        })
        .afterClosed(),
    ).then((value) => value === true);
  }
}
