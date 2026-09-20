import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, linkedSignal, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CollectionContext } from '../../core/collection-context';
import { FieldTypeCatalog } from '../../core/field-types.service';
import { formatMetric } from '../../core/format';
import { httpStatus, problemExtension, problemMessage } from '../../core/http-errors';
import { Field, RecordList, SummaryMetric, SummaryReport, TrackerRecord } from '../../core/models';
import { Notify } from '../../core/notify.service';
import { RecordsApi } from '../../core/records-api.service';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { FieldValue } from '../../shared/field-value';
import { FilterPanel } from './filter-panel';
import { FilterDraft, toApiFilters } from './filters';

@Component({
  selector: 'app-table-view',
  imports: [RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatMenuModule, MatPaginatorModule, MatProgressBarModule, FieldValue, FilterPanel],
  template: `
    <div class="page">
      <div class="row tools">
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="search">
          <mat-label>Search {{ ctx.detail.value()?.name }}</mat-label>
          <input matInput [value]="searchInput()" (input)="onSearch($event)" />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <button mat-stroked-button type="button" (click)="showFilters.set(!showFilters())" [attr.aria-expanded]="showFilters()">
          <mat-icon>filter_list</mat-icon> Filters
          @if (activeFilters().length) { <span class="count">{{ activeFilters().length }}</span> }
        </button>
        <span class="spacer"></span>
        <button mat-button type="button" (click)="export()" [disabled]="!data()?.total"><mat-icon>download</mat-icon> Export CSV</button>
      </div>

      @if (showFilters()) { <app-filter-panel [fields]="ctx.fields()" [(filters)]="filters" /> }
      @if (list.isLoading()) { <mat-progress-bar mode="indeterminate" /> }

      @if (list.error() && !data()) {
        <div class="empty-state">
          <span class="material-icons">cloud_off</span>
          <h3>Could not load records</h3>
          <button mat-stroked-button (click)="list.reload()">Try again</button>
        </div>
      } @else if (data(); as d) {
        @if (d.total === 0 && !hasQuery()) {
          <div class="empty-state">
            <span class="material-icons">playlist_add</span>
            <h3>No records yet</h3>
            <p>Add your first entry to {{ ctx.detail.value()?.name }}.</p>
            <a mat-flat-button [routerLink]="['/collections', ctx.id(), 'records', 'new']">Add a record</a>
          </div>
        } @else if (d.total === 0) {
          <div class="empty-state">
            <span class="material-icons">search_off</span>
            <h3>Nothing matches</h3>
            <button mat-stroked-button (click)="clearAll()">Clear search and filters</button>
          </div>
        } @else {
          <div class="scroll surface-card">
            <table>
              <thead>
                <tr>
                  @for (f of columns(); track f.id) {
                    <th [attr.aria-sort]="ariaSort(f)">
                      @if (catalog.sortable(f.type)) {
                        <button type="button" class="sort" (click)="toggleSort(f)">
                          {{ f.name }}
                          <mat-icon class="arrow">{{ sortBy() === f.id ? (sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more' }}</mat-icon>
                        </button>
                      } @else { {{ f.name }} }
                    </th>
                  }
                  <th class="actions-col"><span class="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                @for (r of d.items; track r.id) {
                  <tr (click)="open(r)">
                    @for (f of columns(); track f.id; let first = $first) {
                      <td>
                        @if (first) {
                          <a class="first" [routerLink]="['/collections', ctx.id(), 'records', r.id]" (click)="$event.stopPropagation()">
                            <app-field-value [field]="f" [value]="r.values[f.key]" [references]="d.references" />
                          </a>
                        } @else {
                          <app-field-value [field]="f" [value]="r.values[f.key]" [references]="d.references" />
                        }
                      </td>
                    }
                    <td class="actions-col" (click)="$event.stopPropagation()">
                      <button mat-icon-button [matMenuTriggerFor]="rowMenu" [attr.aria-label]="'Actions for ' + labelOf(r)"><mat-icon>more_vert</mat-icon></button>
                      <mat-menu #rowMenu="matMenu">
                        <a mat-menu-item [routerLink]="['/collections', ctx.id(), 'records', r.id]"><mat-icon>visibility</mat-icon> View</a>
                        <a mat-menu-item [routerLink]="['/collections', ctx.id(), 'records', r.id, 'edit']"><mat-icon>edit</mat-icon> Edit</a>
                        <button mat-menu-item (click)="remove(r)"><mat-icon>delete</mat-icon> Delete</button>
                      </mat-menu>
                    </td>
                  </tr>
                }
              </tbody>
              @if (summary.value()?.metrics?.length) {
                <tfoot>
                  <tr>
                    @for (f of columns(); track f.id) {
                      <td>
                        @if (metricByField().get(f.id); as m) {
                          <span class="agg"><span class="agg-label">{{ aggName(m) }}</span> {{ format(m) }}</span>
                        }
                      </td>
                    }
                    <td></td>
                  </tr>
                </tfoot>
              }
            </table>
          </div>
          <mat-paginator [length]="d.total" [pageIndex]="page() - 1" [pageSize]="pageSize()" [pageSizeOptions]="[10, 25, 50, 100]"
                         (page)="onPage($event)" aria-label="Select page of records" />
        }
      }
    </div>
  `,
  styles: `
    .tools { margin-bottom: 8px; }
    .search { width: min(380px, 100%); }
    .count { margin-left: 8px; background: var(--mat-sys-primary); color: var(--mat-sys-on-primary); border-radius: 999px; padding: 0 8px; font-size: .75rem; }
    .scroll { padding: 0; overflow: auto; max-height: 68vh; }
    table { border-collapse: separate; border-spacing: 0; width: 100%; min-width: 640px; }
    th, td { text-align: left; padding: 12px 16px; border-bottom: 1px solid var(--mat-sys-outline-variant); vertical-align: middle; }
    thead th { position: sticky; top: 0; z-index: 2; background: var(--mat-sys-surface-container); font-weight: 600; white-space: nowrap; }
    tbody tr { cursor: pointer; }
    tbody tr:hover { background: var(--mat-sys-surface-container-high); }
    tfoot td { position: sticky; bottom: 0; background: var(--mat-sys-surface-container); font-weight: 600; border-bottom: 0; border-top: 2px solid var(--mat-sys-outline-variant); }
    .sort { background: none; border: 0; padding: 0; font: inherit; color: inherit; cursor: pointer; display: inline-flex; align-items: center; gap: 2px; }
    .arrow { font-size: 18px; width: 18px; height: 18px; opacity: .6; }
    .first { color: var(--mat-sys-primary); font-weight: 600; text-decoration: none; }
    .actions-col { width: 56px; text-align: right; }
    .agg-label { font-weight: 400; font-size: .8rem; color: var(--mat-sys-on-surface-variant); margin-right: 4px; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  `,
})
export class TableView {
  protected readonly ctx = inject(CollectionContext);
  protected readonly catalog = inject(FieldTypeCatalog);
  private readonly records = inject(RecordsApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);
  private readonly router = inject(Router);

  protected readonly searchInput = signal('');
  protected readonly search = signal('');
  protected readonly sortBy = signal<string | null>(null);
  protected readonly sortDir = signal<'asc' | 'desc'>('desc');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(25);
  protected readonly filters = signal<FilterDraft[]>([]);
  protected readonly showFilters = signal(false);

  protected readonly columns = computed<Field[]>(() => this.ctx.fields().filter((f) => f.showInList));
  protected readonly activeFilters = computed(() => toApiFilters(this.filters(), this.ctx.fieldsById(), this.catalog));
  protected readonly hasQuery = computed(() => !!this.search() || this.activeFilters().length > 0);

  private readonly baseParams = computed(() => {
    const p: Record<string, string | number> = {};
    if (this.search()) p['search'] = this.search();
    const f = this.activeFilters();
    if (f.length) p['filters'] = JSON.stringify(f);
    return p;
  });

  private readonly listParams = computed(() => {
    const p: Record<string, string | number> = { ...this.baseParams(), page: this.page(), pageSize: this.pageSize() };
    const by = this.sortBy();
    if (by) { p['sortBy'] = by; p['sortDir'] = this.sortDir(); }
    return p;
  });

  protected readonly list = httpResource<RecordList>(() => {
    const id = this.ctx.id();
    return id ? { url: `/api/collections/${id}/records`, params: this.listParams() } : undefined;
  });

  /** The summary honours the same search/filters, so footer totals always describe what the table shows. */
  protected readonly summary = httpResource<SummaryReport>(() => {
    const id = this.ctx.id();
    return id ? { url: `/api/collections/${id}/summary`, params: this.baseParams() } : undefined;
  });

  /** Keeps showing the previous page while the next one loads (no flicker). */
  protected readonly data = linkedSignal<RecordList | undefined, RecordList | undefined>({
    source: () => this.list.value(),
    computation: (next, previous) => next ?? previous?.value,
  });

  protected readonly metricByField = computed(() => new Map((this.summary.value()?.metrics ?? []).map((m) => [m.fieldId, m] as const)));

  constructor() {
    effect((onCleanup) => {
      const value = this.searchInput().trim();
      const timer = setTimeout(() => this.search.set(value), 300);
      onCleanup(() => clearTimeout(timer));
    });
    effect(() => {
      this.search(); this.activeFilters(); this.sortBy(); this.sortDir();
      untracked(() => this.page.set(1));
    });
    effect(() => {
      const d = this.list.value();
      if (d && d.page !== untracked(this.page)) untracked(() => this.page.set(d.page)); // server clamped an out-of-range page
    });
  }

  protected onSearch(e: Event): void { this.searchInput.set((e.target as HTMLInputElement).value); }
  protected onPage(e: PageEvent): void { this.pageSize.set(e.pageSize); this.page.set(e.pageIndex + 1); }

  protected toggleSort(f: Field): void {
    if (this.sortBy() !== f.id) { this.sortBy.set(f.id); this.sortDir.set('asc'); }
    else if (this.sortDir() === 'asc') this.sortDir.set('desc');
    else { this.sortBy.set(null); this.sortDir.set('desc'); }
  }

  protected ariaSort(f: Field): string | null {
    if (this.sortBy() !== f.id) return null;
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  protected clearAll(): void {
    this.searchInput.set('');
    this.search.set('');
    this.filters.set([]);
  }

  protected open(r: TrackerRecord): void {
    void this.router.navigate(['/collections', this.ctx.id(), 'records', r.id]);
  }

  protected format(m: SummaryMetric): string { return formatMetric(m); }
  protected aggName(m: SummaryMetric): string {
    return { count: 'Count', sum: 'Total', average: 'Avg', min: 'Min', max: 'Max', none: '' }[m.aggregation];
  }

  protected labelOf(r: TrackerRecord): string {
    const key = this.ctx.titleField()?.key;
    const v = key ? r.values[key] : null;
    return typeof v === 'string' && v ? v : 'this record';
  }

  protected async export(): Promise<void> {
    const id = this.ctx.id();
    if (!id) return;
    try {
      await this.records.exportCsv(id, this.baseParams(), this.ctx.detail.value()?.name ?? 'export');
    } catch (err) {
      this.notify.error(problemMessage(err, 'Export failed.'));
    }
  }

  protected async remove(r: TrackerRecord): Promise<void> {
    const name = this.labelOf(r);
    if (!(await this.confirm('Delete record?', `“${name}” will be permanently deleted.`, 'Delete'))) return;
    try {
      await this.records.remove(r.id, false);
    } catch (err) {
      if (httpStatus(err) !== 409) return this.notify.error(problemMessage(err));
      const n = problemExtension<number>(err, 'referenceCount') ?? 0;
      const again = await this.confirm(
        'This record is referenced elsewhere',
        `${n} other record(s) point to “${name}”. Deleting it will clear those references.`, 'Delete anyway');
      if (!again) return;
      try { await this.records.remove(r.id, true); } catch (e2) { return this.notify.error(problemMessage(e2)); }
    }
    this.notify.info('Record deleted.');
    this.list.reload();
    this.summary.reload();
    this.ctx.detail.reload();
  }

  private confirm(title: string, message: string, confirmLabel: string): Promise<boolean> {
    return firstValueFrom(this.dialog.open<ConfirmDialog, unknown, boolean>(ConfirmDialog, {
      data: { title, message, confirmLabel, destructive: true },
    }).afterClosed()).then((v) => v === true);
  }
}
