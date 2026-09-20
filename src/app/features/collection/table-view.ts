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
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatMenuModule } from "@angular/material/menu";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { Router, RouterLink, RouterOutlet } from "@angular/router";
import { firstValueFrom, map } from "rxjs";

import { CollectionContext } from "../../core/collection-context";
import { FieldTypeCatalog } from "../../core/field-types.service";
import { formatMetric, metricLabel } from "../../core/format";
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
    RouterOutlet,
  ],

  template: `
    <div class="page table-page">
      <!-- ============================ TOOLBAR ============================ -->
      <section class="toolbar" aria-label="Record controls">
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
            <mat-icon matSuffix class="search-icon">search</mat-icon>
          }
        </mat-form-field>

        <div class="tools">
          <button
            mat-stroked-button
            type="button"
            class="tool-btn"
            [class.on]="showFilters() || activeFilters().length > 0"
            (click)="showFilters.set(!showFilters())"
            [attr.aria-expanded]="showFilters()"
          >
            <mat-icon>tune</mat-icon>
            <span class="label">Filters</span>
            @if (activeFilters().length) {
              <span class="count" aria-label="Active filters">{{
                activeFilters().length
              }}</span>
            }
          </button>

          @if (isMobile()) {
            <!-- phones: sort lives in a menu because cards have no column headers -->
            <button
              mat-stroked-button
              type="button"
              class="tool-btn"
              [class.on]="!!sortBy()"
              [matMenuTriggerFor]="sortMenu"
            >
              <mat-icon>swap_vert</mat-icon>
              <span class="label">{{ sortLabel() }}</span>
            </button>
            <mat-menu #sortMenu="matMenu">
              <button mat-menu-item type="button" (click)="resetSort()">
                <mat-icon>{{ sortBy() ? "" : "check" }}</mat-icon>
                <span>Newest first</span>
              </button>
              @for (f of sortableColumns(); track f.id) {
                <button mat-menu-item type="button" (click)="pickSort(f)">
                  <mat-icon>{{
                    sortBy() === f.id
                      ? sortDir() === "asc"
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
                [routerLink]="['/collections', ctx.id(), 'import']"
              >
                <mat-icon>upload</mat-icon><span>Import</span>
              </a>
              <button
                mat-menu-item
                type="button"
                [disabled]="!data()?.total"
                (click)="export()"
              >
                <mat-icon>download</mat-icon><span>Export CSV</span>
              </button>
            </mat-menu>
          } @else {
            <span class="spacer"></span>
            <a
              mat-stroked-button
              class="tool-btn"
              [routerLink]="['/collections', ctx.id(), 'import']"
            >
              <mat-icon>upload</mat-icon><span class="label">Import</span>
            </a>
            <button
              mat-stroked-button
              type="button"
              class="tool-btn"
              (click)="export()"
              [disabled]="!data()?.total"
            >
              <mat-icon>download</mat-icon><span class="label">Export CSV</span>
            </button>
          }
        </div>
      </section>

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

      <!-- ============================ CONTENT ============================ -->
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
              [routerLink]="['/collections', ctx.id(), 'records', 'new']"
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
            <!-- ======================= PHONE: CARDS ======================= -->
            <ul
              class="cards"
              role="list"
              [class.dim]="list.isLoading()"
              aria-label="Records"
            >
              @for (r of d.items; track r.id) {
                <li class="card" (click)="open(r)">
                  <div class="card-head">
                    @if (titleCol(); as tf) {
                      <a
                        class="card-title"
                        [routerLink]="[
                          '/collections',
                          ctx.id(),
                          'records',
                          r.id,
                        ]"
                        (click)="$event.stopPropagation()"
                      >
                        <app-field-value
                          [field]="tf"
                          [value]="r.values[tf.key]"
                          [references]="d.references"
                        />
                      </a>
                    }
                    <span class="spacer"></span>
                    <span (click)="$event.stopPropagation()">
                      <button
                        mat-icon-button
                        type="button"
                        [matMenuTriggerFor]="cardMenu"
                        [attr.aria-label]="'Actions for ' + labelOf(r)"
                      >
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #cardMenu="matMenu">
                        <a
                          mat-menu-item
                          [routerLink]="[
                            '/collections',
                            ctx.id(),
                            'records',
                            r.id,
                          ]"
                          ><mat-icon>visibility</mat-icon><span>View</span></a
                        >

                        <a
                          mat-menu-item
                          [routerLink]="[
                            '/collections',
                            ctx.id(),
                            'records',
                            r.id,
                            'edit',
                          ]"
                          ><mat-icon>edit</mat-icon><span>Edit</span>
                        </a>
                        <button
                          mat-menu-item
                          type="button"
                          class="delete-item"
                          (click)="remove(r)"
                        >
                          <mat-icon>delete</mat-icon><span>Delete</span>
                        </button>
                      </mat-menu>
                    </span>
                  </div>

                  <dl class="card-body">
                    @for (f of cardFields(); track f.id) {
                      @if (hasValue(r, f)) {
                        <div class="kv">
                          <dt>{{ f.name }}</dt>
                          <dd>
                            <app-field-value
                              [field]="f"
                              [value]="r.values[f.key]"
                              [references]="d.references"
                            />
                          </dd>
                        </div>
                      }
                    }
                  </dl>
                </li>
              }
            </ul>

            @if (metrics().length) {
              <section class="totals" aria-label="Totals">
                <h4>
                  Totals
                  @if (hasQuery()) {
                    <span>(matching records)</span>
                  }
                </h4>
                <div class="totals-grid">
                  @for (m of metrics(); track m.fieldId + m.aggregation) {
                    <div class="total">
                      <span class="t-label">{{ label(m) }}</span>
                      <span class="t-value">{{ format(m) }}</span>
                    </div>
                  }
                </div>
              </section>
            }
          } @else {
            <!-- ====================== DESKTOP: TABLE ====================== -->
            <div
              class="table-container surface-card"
              [class.loading-table]="list.isLoading()"
            >
              <div class="table-scroll">
                <table>
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
                              <mat-icon class="arrow">{{
                                sortBy() === f.id
                                  ? sortDir() === "asc"
                                    ? "arrow_upward"
                                    : "arrow_downward"
                                  : "unfold_more"
                              }}</mat-icon>
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
                              ><mat-icon>visibility</mat-icon
                              ><span>View</span></a
                            >

                            <a
                              mat-menu-item
                              [routerLink]="[
                                '/collections',
                                ctx.id(),
                                'records',
                                r.id,
                                'edit',
                              ]"
                              ><mat-icon>edit</mat-icon><span>Edit</span></a
                            >
                            <button
                              mat-menu-item
                              type="button"
                              class="delete-item"
                              (click)="remove(r)"
                            >
                              <mat-icon>delete</mat-icon><span>Delete</span>
                            </button>
                          </mat-menu>
                        </td>
                      </tr>
                    }
                  </tbody>

                  @if (metrics().length) {
                    <tfoot>
                      <tr>
                        @for (f of columns(); track f.id) {
                          <td>
                            @if (metricByField().get(f.id); as m) {
                              <span class="agg">
                                <span class="agg-label">{{ aggName(m) }}</span>
                                <span class="agg-value">{{ format(m) }}</span>
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
      --row-hover: color-mix(
        in srgb,
        var(--mat-sys-primary) 7%,
        var(--mat-sys-surface)
      );
    }
    .table-page {
      padding-top: 16px;
    }
    .spacer {
      flex: 1 1 auto;
    }

    /* ---------------- toolbar ---------------- */
    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
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

    /* ---------------- desktop table ---------------- */
    .table-container {
      padding: 0;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface);
      transition: opacity 0.18s ease;
    }
    .table-container.loading-table {
      opacity: 0.6;
      pointer-events: none;
    }
    .table-scroll {
      max-height: calc(100vh - 290px);
      min-height: 220px;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
    }
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
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      font-size: 0.9375rem;
    }

    thead th {
      position: sticky;
      top: 0;
      z-index: 3;
      height: 46px;
      white-space: nowrap;
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    /* first column stays visible when scrolling wide tables sideways */
    tbody td:first-child,
    tfoot td:first-child {
      position: sticky;
      left: 0;
      z-index: 1;
      background: var(--mat-sys-surface);
    }
    thead th:first-child {
      left: 0;
      z-index: 5;
    }
    tfoot td:first-child {
      background: var(--mat-sys-surface-container);
      z-index: 2;
    }

    .record-row {
      cursor: pointer;
    }
    .record-row:hover > td {
      background: var(--row-hover);
    }
    .record-row:last-child td {
      border-bottom: 0;
    }

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
      letter-spacing: inherit;
      text-transform: inherit;
      cursor: pointer;
    }
    .sort:hover {
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-primary);
    }
    .sort .arrow {
      width: 18px;
      height: 18px;
      font-size: 18px;
      opacity: 0.55;
    }
    .sort:hover .arrow,
    th[aria-sort] .arrow {
      opacity: 1;
    }
    th[aria-sort] .arrow {
      color: var(--mat-sys-primary);
    }

    .first {
      color: var(--mat-sys-primary);
      font-weight: 600;
      text-decoration: none;
      overflow-wrap: anywhere;
    }
    .first:hover {
      text-decoration: underline;
    }

    .actions-col {
      width: 52px;
      min-width: 52px;
      padding: 6px 8px;
      text-align: right;
      position: sticky;
      right: 0;
      z-index: 1;
      background: var(--mat-sys-surface);
      box-shadow: -1px 0 0 var(--mat-sys-outline-variant);
    }
    thead .actions-col {
      background: var(--mat-sys-surface-container);
      z-index: 4;
    }
    tfoot .actions-col {
      background: var(--mat-sys-surface-container);
      z-index: 2;
    }
    .row-action-btn {
      color: var(--mat-sys-on-surface-variant);
    }

    tfoot td {
      position: sticky;
      bottom: 0;
      z-index: 2;
      background: var(--mat-sys-surface-container);
      border-top: 2px solid var(--mat-sys-outline-variant);
      border-bottom: 0;
      font-weight: 600;
    }
    .agg {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 6px;
      background: var(--mat-sys-surface-container-high);
      white-space: nowrap;
    }
    .agg-label {
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .agg-value {
      font-weight: 700;
    }

    .delete-item,
    .delete-item mat-icon {
      color: var(--mat-sys-error);
    }

    /* ---------------- phone cards ---------------- */
    .cards {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 10px;
      transition: opacity 0.18s ease;
    }
    .cards.dim {
      opacity: 0.6;
    }
    .card {
      padding: 6px 6px 14px 16px;
      border-radius: 16px;
      cursor: pointer;
      background: var(--mat-sys-surface-container-low);
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .card:active {
      background: var(--row-hover);
    }
    .card-head {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 48px;
    }
    .card-title {
      min-width: 0;
      font-size: 1.0625rem;
      font-weight: 600;
      line-height: 1.3;
      color: var(--mat-sys-primary);
      text-decoration: none;
      overflow-wrap: anywhere;
    }
    .card-body {
      margin: 0;
      padding-right: 10px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px 16px;
    }
    .kv {
      min-width: 0;
    }
    dt {
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
      margin-bottom: 2px;
    }
    dd {
      margin: 0;
      font-size: 0.9375rem;
      overflow-wrap: anywhere;
    }

    .totals {
      margin-top: 14px;
      padding: 14px 16px;
      border-radius: 16px;
      background: var(--mat-sys-surface-container);
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .totals h4 {
      margin: 0 0 10px;
      font-size: 0.9rem;
    }
    .totals h4 span {
      font-weight: 400;
      color: var(--mat-sys-on-surface-variant);
    }
    .totals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
    }
    .total {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .t-label {
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .t-value {
      font-size: 1.125rem;
      font-weight: 700;
      overflow-wrap: anywhere;
    }

    .paginator {
      margin-top: 8px;
      background: transparent;
    }

    /* ---------------- empty states ---------------- */
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

    /* ---------------- phones ---------------- */
    @media (max-width: 767px) {
      .table-page {
        padding-top: 10px;
        padding-bottom: 96px;
      } /* room for the floating "Add record" button */
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
    @media (prefers-reduced-motion: reduce) {
      .table-container,
      .cards {
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
  private seenVersion = untracked(() => this.ctx.recordsVersion());

  /** Phones get a card list; tablets and desktops get the table. */
  protected readonly isMobile = toSignal(
    inject(BreakpointObserver)
      .observe("(max-width: 767px)")
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  /* ------------------------------ state ------------------------------ */
  protected readonly searchInput = signal("");
  protected readonly search = signal("");
  protected readonly sortBy = signal<string | null>(null);
  protected readonly sortDir = signal<"asc" | "desc">("desc");
  protected readonly page = signal(1);
  protected readonly pageSize = signal(25);
  protected readonly filters = signal<FilterDraft[]>([]);
  protected readonly showFilters = signal(false);

  /* ------------------------ columns / filters ------------------------ */
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

  protected readonly sortLabel = computed(() => {
    const id = this.sortBy();
    return id ? (this.ctx.fieldsById().get(id)?.name ?? "Sort") : "Sort";
  });

  /* ------------------------ request parameters ----------------------- */
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

  /* -------------------------------- data ----------------------------- */
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

  protected readonly metrics = computed<SummaryMetric[]>(
    () => this.summary.value()?.metrics ?? [],
  );
  protected readonly metricByField = computed(
    () => new Map(this.metrics().map((m) => [m.fieldId, m] as const)),
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
      if (d && d.page !== untracked(this.page)) {
        untracked(() => this.page.set(d.page));
      }
    });
  }

  /* --------------------------- search / paging ----------------------- */
  protected onSearch(event: Event): void {
    this.searchInput.set((event.target as HTMLInputElement).value);
  }

  protected onPage(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.page.set(event.pageIndex + 1);
  }

  /* -------------------------------- sort ----------------------------- */
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

  /** Phone menu: choose a field; choosing it again flips the direction. */
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

  protected ariaSort(field: Field): string | null {
    if (this.sortBy() !== field.id) return null;
    return this.sortDir() === "asc" ? "ascending" : "descending";
  }

  protected clearAll(): void {
    this.searchInput.set("");
    this.search.set("");
    this.filters.set([]);
  }

  /* ---------------------------- navigation --------------------------- */
  protected open(record: TrackerRecord): void {
    void this.router.navigate([
      "/collections",
      this.ctx.id(),
      "records",
      record.id,
    ]);
  }

  /* ---------------------------- helpers ------------------------------ */
  /** Cards skip empty fields to stay compact. */
  protected hasValue(record: TrackerRecord, field: Field): boolean {
    const v = record.values[field.key];
    return !(
      v === null ||
      v === undefined ||
      v === "" ||
      (Array.isArray(v) && v.length === 0)
    );
  }

  protected format(metric: SummaryMetric): string {
    return formatMetric(metric);
  }

  protected label(metric: SummaryMetric): string {
    return metricLabel(metric);
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

  protected labelOf(record: TrackerRecord): string {
    const key = this.ctx.titleField()?.key;
    const value = key ? record.values[key] : null;
    return typeof value === "string" && value ? value : "this record";
  }

  /* ------------------------------ export ----------------------------- */
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

  /* ------------------------------ delete ----------------------------- */
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
