import { BreakpointObserver } from "@angular/cdk/layout";
import { NgTemplateOutlet } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { firstValueFrom, map } from "rxjs";

import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzModalModule } from "ng-zorro-antd/modal";
import { NzPaginationModule } from "ng-zorro-antd/pagination";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzTagModule } from "ng-zorro-antd/tag";

import { SharingApi } from "../../core/sharing-api.service";
import {
  PublicCollection,
  PublicField,
  PublicRecord,
  PublicRecordList,
} from "../../core/models";
import { formatDate, formatDateTime } from "../../core/format";
import { coverBackground, fallbackBackground } from "../../core/cover-presets";
import { LocalStorageService } from "../../core/local-storage.service";

@Component({
  selector: "app-public-view-page",
  imports: [
    NgTemplateOutlet,
    RouterLink,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzPaginationModule,
    NzSpinModule,
    NzTagModule,
  ],
  template: `
    <div class="pv-root">
      <!-- ── Top bar ── -->
      <header class="pv-topbar">
        <div class="pv-topbar-inner">
          <div class="pv-brand">
            <span class="pv-brand-icon" aria-hidden="true">📊</span>
            <span class="pv-brand-name">Personal Tracker</span>
          </div>
          <a nz-button nzType="default" routerLink="/login">
            <nz-icon nzType="user" />
            <span>Sign in</span>
          </a>
        </div>
      </header>

      <main class="page pv-main">
        @if (loading()) {
          <div class="pv-center">
            <nz-spin nzSimple nzSize="large" />
            <p>Loading shared tracker…</p>
          </div>
        } @else if (error()) {
          <div class="empty-state">
            <div class="empty-icon-box error-box" aria-hidden="true">
              <nz-icon nzType="lock" />
            </div>
            <h3>Link unavailable</h3>
            <p>{{ error() }}</p>
            <a nz-button nzType="primary" routerLink="/">Go to home</a>
          </div>
        } @else if (collection(); as col) {
          <!-- ── Hero ── -->
          <section class="surface-card pv-hero">
            <div class="pv-cover" [style.background]="coverBg()"></div>
            <div class="pv-hero-body">
              <div class="pv-hero-icon" aria-hidden="true">{{ col.icon }}</div>
              <div class="pv-hero-text">
                <div class="pv-title-row">
                  <h1>{{ col.name }}</h1>
                  <span class="pv-badge">
                    <nz-icon nzType="eye" />
                    Read-only
                  </span>
                </div>
                @if (col.description) {
                  <p class="pv-desc">{{ col.description }}</p>
                }
                <div class="pv-chips">
                  <span class="pv-chip">
                    <nz-icon nzType="database" />
                    {{ total() }} {{ total() === 1 ? "record" : "records" }}
                  </span>
                  <span class="pv-chip">
                    <nz-icon nzType="table" />
                    {{ col.fields.length }} fields
                  </span>
                  <span class="pv-chip">
                    <nz-icon nzType="user" />
                    Shared by {{ col.ownerDisplayName }}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <!-- ── Toolbar ── -->
          <section class="toolbar" aria-label="Record controls">
            <div class="search">
              <nz-input-wrapper>
                <input
                  nz-input
                  placeholder="Search records"
                  [value]="searchQuery()"
                  (input)="searchQuery.set(text($event))"
                  autocomplete="off"
                />
                @if (searchQuery()) {
                  <nz-icon
                    nzType="close-circle"
                    class="search-suffix clear-search"
                    (click)="searchQuery.set('')"
                    aria-label="Clear search"
                  />
                } @else {
                  <nz-icon nzType="search" class="search-suffix search-icon" />
                }
              </nz-input-wrapper>
            </div>

            @if (isMobile() && sortField()) {
              <button
                nz-button
                nzType="default"
                type="button"
                class="on"
                (click)="resetSort()"
              >
                <nz-icon [nzType]="sortAsc() ? 'arrow-up' : 'arrow-down'" />
                <span>{{ sortField()?.name }}</span>
                <nz-icon nzType="close" class="mini" />
              </button>
            }
          </section>

          @if (loadingRecords() && !recordList()) {
            <div class="loading-bar">
              <nz-spin nzSimple nzSize="small" />
              <span>Loading records…</span>
            </div>
          } @else if (total() === 0) {
            <div class="empty-state">
              <div class="empty-icon-box" aria-hidden="true">
                <nz-icon nzType="file-text" />
              </div>
              <h3>No records yet</h3>
              <p>This tracker doesn't have any records.</p>
            </div>
          } @else if (hasQuery() && visibleRows().length === 0) {
            <div class="empty-state">
              <div class="empty-icon-box" aria-hidden="true">
                <nz-icon nzType="search" />
              </div>
              <h3>Nothing matches</h3>
              <p>No records on this page match your search.</p>
              <button
                nz-button
                nzType="default"
                type="button"
                (click)="searchQuery.set('')"
              >
                <nz-icon nzType="close-circle" /> Clear search
              </button>
            </div>
          } @else {
            <p class="count-line" aria-live="polite">
              @if (hasQuery()) {
                {{ visibleRows().length }} of {{ records().length }} on this
                page match
              } @else {
                {{ total() }} {{ total() === 1 ? "record" : "records" }}
              }
            </p>

            @if (isMobile()) {
              <!-- ── Cards (phones) ── -->
              <div class="pv-cards" [class.dimmed]="loadingRecords()">
                @for (row of visibleRows(); track row.id) {
                  <article
                    class="surface-card pv-card"
                    tabindex="0"
                    (click)="openDetail(row)"
                    (keydown.enter)="openDetail(row)"
                  >
                    @if (titleField(); as tf) {
                      <h3 class="pv-card-title">
                        {{ formatValue(tf, row.values[tf.key]) }}
                      </h3>
                    }
                    <dl class="pv-card-fields">
                      @for (f of cardFields(); track f.id) {
                        <div class="pv-card-row">
                          <dt>{{ f.name }}</dt>
                          <dd>
                            <ng-container
                              *ngTemplateOutlet="
                                valueTpl;
                                context: { field: f, value: row.values[f.key] }
                              "
                            />
                          </dd>
                        </div>
                      }
                    </dl>
                    <div class="pv-card-foot">
                      {{ fmtDate(row.createdAt) }}
                    </div>
                  </article>
                }
              </div>
            } @else {
              <!-- ── Table (tablet / desktop) ── -->
              <div
                class="table-container surface-card"
                [class.loading-table]="loadingRecords()"
                [class.resizing-active]="activeResizingCol() !== null"
              >
                <div class="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        @for (
                          f of visibleFields();
                          track f.id;
                          let first = $first
                        ) {
                          <th
                            scope="col"
                            [attr.aria-sort]="ariaSort(f)"
                            [style.width.px]="colWidth(f.id)"
                            [style.min-width.px]="colWidth(f.id) || 120"
                            [class.sticky-col]="first"
                          >
                            <div class="header-cell-content">
                              @if (isSortable(f)) {
                                <button
                                  type="button"
                                  class="sort"
                                  (click)="toggleSort(f)"
                                >
                                  <span>{{ f.name }}</span>
                                  <nz-icon
                                    class="arrow"
                                    [nzType]="sortIconType(f)"
                                  />
                                </button>
                              } @else {
                                <span>{{ f.name }}</span>
                              }
                            </div>
                            <div
                              class="resize-handle"
                              [class.active]="activeResizingCol() === f.id"
                              (pointerdown)="onResizeStart($event, f.id)"
                              (click)="$event.stopPropagation()"
                            ></div>
                          </th>
                        }
                        <th scope="col" class="date-col sticky-end">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of visibleRows(); track row.id) {
                        <tr class="record-row" (click)="openDetail(row)">
                          @for (
                            f of visibleFields();
                            track f.id;
                            let first = $first
                          ) {
                            <td
                              [style.width.px]="colWidth(f.id)"
                              [style.min-width.px]="colWidth(f.id) || 120"
                              [class.sticky-col]="first"
                            >
                              @if (first) {
                                <span class="first">
                                  <ng-container
                                    *ngTemplateOutlet="
                                      valueTpl;
                                      context: {
                                        field: f,
                                        value: row.values[f.key],
                                      }
                                    "
                                  />
                                </span>
                              } @else {
                                <ng-container
                                  *ngTemplateOutlet="
                                    valueTpl;
                                    context: {
                                      field: f,
                                      value: row.values[f.key],
                                    }
                                  "
                                />
                              }
                            </td>
                          }
                          <td class="date-col sticky-end">
                            {{ fmtDate(row.createdAt) }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }

            <div class="paginator-wrap">
              <nz-pagination
                [nzTotal]="total()"
                [nzPageIndex]="currentPage()"
                [nzPageSize]="pageSize()"
                [nzPageSizeOptions]="[10, 25, 50, 100]"
                [nzShowSizeChanger]="!isMobile()"
                [nzShowQuickJumper]="!isMobile()"
                (nzPageIndexChange)="onPageChange($event)"
                (nzPageSizeChange)="onPageSizeChange($event)"
                [nzShowTotal]="totalTpl"
              />
              <ng-template #totalTpl let-count
                >Total {{ count }} items</ng-template
              >
            </div>
          }
        }
      </main>

      <footer class="pv-footer">
        <span>Powered by</span>
        <a routerLink="/">Personal Tracker</a>
        <span aria-hidden="true">·</span>
        <span>Public read-only link</span>
      </footer>
    </div>

    <!-- ── Shared value renderer (table cells, cards, detail modal) ── -->
    <ng-template #valueTpl let-f="field" let-v="value">
      @switch (f.type) {
        @case ("url") {
          @if (v) {
            <a
              class="pv-link"
              [href]="v"
              target="_blank"
              rel="noopener noreferrer"
              (click)="$event.stopPropagation()"
            >
              <span class="pv-link-text">{{ v }}</span>
              <nz-icon nzType="export" />
            </a>
          } @else {
            <span class="pv-dash">—</span>
          }
        }
        @case ("boolean") {
          @if (v === true) {
            <span class="pv-bool yes">
              <nz-icon nzType="check-circle" nzTheme="fill" /> Yes
            </span>
          } @else if (v === false) {
            <span class="pv-bool no">
              <nz-icon nzType="close-circle" nzTheme="outline" /> No
            </span>
          } @else {
            <span class="pv-dash">—</span>
          }
        }
        @case ("rating") {
          @if (v != null && v !== "") {
            <span class="pv-rating">{{ v }} ★</span>
          } @else {
            <span class="pv-dash">—</span>
          }
        }
        @case ("multiSelect") {
          @if (asArray(v).length > 0) {
            <span class="pv-tags">
              @for (tag of asArray(v); track tag) {
                <nz-tag>{{ tag }}</nz-tag>
              }
            </span>
          } @else {
            <span class="pv-dash">—</span>
          }
        }
        @case ("select") {
          @if (v) {
            <nz-tag>{{ v }}</nz-tag>
          } @else {
            <span class="pv-dash">—</span>
          }
        }
        @default {
          <span class="pv-text">{{ formatValue(f, v) }}</span>
        }
      }
    </ng-template>

    <!-- ── Record detail modal ── -->
    <nz-modal
      [nzVisible]="selectedRecord() !== null"
      [nzTitle]="modalTitle"
      [nzFooter]="modalFooter"
      (nzOnCancel)="closeDetail()"
      [nzWidth]="620"
    >
      <ng-template #modalTitle>
        <div class="pv-modal-title">
          <div class="pv-modal-icon">{{ collection()?.icon || "📋" }}</div>
          <div class="pv-modal-heading">
            <h3>{{ selectedTitle() }}</h3>
            <p>{{ collection()?.name }}</p>
          </div>
        </div>
      </ng-template>

      <ng-container *nzModalContent>
        @if (selectedRecord(); as rec) {
          <div class="pv-detail">
            @for (f of collection()?.fields; track f.id) {
              <div class="pv-detail-row">
                <div class="pv-detail-label">{{ f.name }}</div>
                <div class="pv-detail-value">
                  <ng-container
                    *ngTemplateOutlet="
                      valueTpl;
                      context: { field: f, value: rec.values[f.key] }
                    "
                  />
                </div>
              </div>
            }

            <div class="pv-detail-meta">
              <span
                >Created <strong>{{ fmtDateTime(rec.createdAt) }}</strong></span
              >
              <span
                >Updated <strong>{{ fmtDateTime(rec.updatedAt) }}</strong></span
              >
            </div>
          </div>
        }
      </ng-container>

      <ng-template #modalFooter>
        <button nz-button nzType="default" (click)="closeDetail()">
          Close
        </button>
      </ng-template>
    </nz-modal>
  `,
  styles: `
    :host {
      display: block;
    }
    .pv-root {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--app-surface);
      color: var(--app-text);
    }

    /* ── Top bar ── */
    .pv-topbar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: var(--app-surface);
      border-bottom: 1px solid var(--app-outline-variant);
    }
    .pv-topbar-inner {
      max-width: 1200px;
      margin: 0 auto;
      height: 56px;
      padding: 0 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .pv-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pv-brand-icon {
      font-size: 1.3rem;
    }
    .pv-brand-name {
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .pv-main {
      flex: 1;
    }
    .pv-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 80px 16px;
      color: var(--app-text-muted);
    }

    /* ── Empty / error states (same as table view) ── */
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
      border: 1.5px dashed var(--app-outline-variant);
      background: var(--app-surface);
    }
    .empty-icon-box {
      width: 56px;
      height: 56px;
      display: grid;
      place-items: center;
      border-radius: 16px;
      margin-bottom: 14px;
      background: var(--app-surface-container);
      color: var(--app-text-muted);
      font-size: 28px;
    }
    .empty-icon-box.error-box {
      background: var(--app-error-container);
      color: var(--app-on-error-container);
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
      color: var(--app-text-muted);
    }

    /* ── Hero ── */
    .pv-hero {
      padding: 0;
      overflow: hidden;
      margin-bottom: 16px;
    }
    .pv-cover {
      height: 96px;
      width: 100%;
    }
    .pv-hero-body {
      display: flex;
      align-items: flex-start;
      gap: 18px;
      padding: 0 24px 22px;
    }
    .pv-hero-icon {
      width: 72px;
      height: 72px;
      margin-top: -36px;
      display: grid;
      place-items: center;
      flex: none;
      font-size: 2.25rem;
      line-height: 1;
      border-radius: 20px;
      background: var(--app-surface);
      border: 1px solid var(--app-outline-variant);
      box-shadow: var(--app-shadow-2);
    }
    .pv-hero-text {
      flex: 1;
      min-width: 0;
      padding-top: 14px;
    }
    .pv-title-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 4px;
    }
    .pv-title-row h1 {
      font-size: 1.5rem;
      letter-spacing: -0.02em;
      overflow-wrap: anywhere;
    }
    .pv-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--app-on-primary-container);
      background: var(--app-primary-container);
    }
    .pv-desc {
      margin: 0 0 12px;
      font-size: 0.9375rem;
      line-height: 1.5;
      color: var(--app-text-muted);
    }
    .pv-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .pv-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--app-text-muted);
      background: var(--app-surface-container);
      border: 1px solid var(--app-outline-variant);
    }

    /* ── Toolbar ── */
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
      color: var(--app-text-muted);
      opacity: 0.8;
    }
    .clear-search {
      cursor: pointer;
    }
    .on {
      border-color: var(--app-primary) !important;
      color: var(--app-primary) !important;
    }
    .mini {
      font-size: 10px;
    }

    .loading-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 2px 10px;
      color: var(--app-text-muted);
      font-size: 0.85rem;
    }
    .count-line {
      margin: 4px 2px 10px;
      font-size: 0.875rem;
      color: var(--app-text-muted);
    }
    .paginator-wrap {
      margin-top: 16px;
      display: flex;
      justify-content: flex-end;
    }

    /* ── Table (matches record table) ── */
    .table-container {
      padding: 0;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid var(--app-outline-variant);
      background: var(--app-surface);
      transition: opacity 0.18s ease;
    }
    .table-container.loading-table {
      opacity: 0.6;
      pointer-events: none;
    }
    .table-container.resizing-active {
      user-select: none;
      cursor: col-resize;
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
      background: transparent;
    }
    th,
    td {
      padding: 12px 16px;
      vertical-align: middle;
      border-bottom: 1px solid var(--app-outline-variant);
      font-size: 0.9375rem;
      box-sizing: border-box;
    }
    th {
      position: sticky;
      top: 0;
      z-index: 1;
      height: 46px;
      white-space: nowrap;
      background: var(--app-surface-container);
      color: var(--app-text);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .header-cell-content {
      display: flex;
      align-items: center;
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .resize-handle {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 10px;
      cursor: col-resize;
      user-select: none;
      z-index: 10;
      touch-action: none;
    }
    .resize-handle::after {
      content: "";
      position: absolute;
      top: 25%;
      bottom: 25%;
      right: 2px;
      width: 2px;
      background: var(--app-outline-variant);
      border-radius: 1px;
      transition:
        background-color 0.15s ease,
        width 0.15s ease,
        top 0.15s ease,
        bottom 0.15s ease;
    }
    .resize-handle:hover::after,
    .resize-handle.active::after {
      background: var(--app-primary);
      width: 3px;
      top: 15%;
      bottom: 15%;
    }
    .sticky-col {
      position: sticky;
      left: 0;
      z-index: 2;
    }
    td.sticky-col {
      background: var(--app-surface);
    }
    th.sticky-col {
      background: var(--app-surface-container);
      z-index: 3;
    }
    .sticky-end {
      position: sticky;
      right: 0;
      z-index: 2;
    }
    th.sticky-end {
      z-index: 3;
    }
    .date-col {
      width: 130px;
      min-width: 130px;
      white-space: nowrap;
      font-size: 0.8125rem;
      color: var(--app-text-muted);
      box-shadow: -1px 0 0 var(--app-outline-variant);
    }
    td.date-col {
      background: var(--app-surface);
    }
    th.date-col {
      background: var(--app-surface-container);
      color: var(--app-text);
      font-size: 0.75rem;
    }
    .record-row {
      cursor: pointer;
    }
    .record-row:hover > td {
      background: color-mix(in srgb, var(--app-primary) 7%, var(--app-surface));
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
      background: var(--app-surface-container-high);
      color: var(--app-primary);
    }
    .sort .arrow {
      opacity: 0.55;
      font-size: 16px;
    }
    .sort:hover .arrow,
    th[aria-sort] .arrow {
      opacity: 1;
    }
    th[aria-sort] .arrow {
      color: var(--app-primary);
    }
    .first {
      color: var(--app-primary);
      font-weight: 600;
      overflow-wrap: anywhere;
    }

    /* ── Cell values ── */
    .pv-text {
      display: block;
      max-width: 280px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pv-dash {
      color: var(--app-text-muted);
    }
    .pv-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      max-width: 240px;
      color: var(--app-primary);
    }
    .pv-link-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pv-link:hover .pv-link-text {
      text-decoration: underline;
    }
    .pv-bool {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-weight: 500;
    }
    .pv-bool.yes {
      color: #16a34a;
    }
    .pv-bool.no {
      color: var(--app-error);
    }
    .pv-rating {
      font-weight: 600;
      color: #d48806;
    }
    .pv-tags {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .pv-tags nz-tag {
      margin: 0;
    }

    /* ── Cards (phones) ── */
    .pv-cards {
      display: grid;
      gap: 12px;
      transition: opacity 0.18s ease;
    }
    .pv-cards.dimmed {
      opacity: 0.6;
      pointer-events: none;
    }
    .pv-card {
      padding: 14px 16px;
      cursor: pointer;
    }
    .pv-card:active {
      background: color-mix(in srgb, var(--app-primary) 7%, var(--app-surface));
    }
    .pv-card-title {
      margin: 0 0 10px;
      font-size: 1rem;
      color: var(--app-primary);
      overflow-wrap: anywhere;
    }
    .pv-card-fields {
      margin: 0;
      display: grid;
      gap: 8px;
    }
    .pv-card-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 16px;
    }
    .pv-card-row dt {
      flex: none;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .pv-card-row dd {
      margin: 0;
      min-width: 0;
      text-align: right;
      font-size: 0.875rem;
      overflow-wrap: anywhere;
    }
    .pv-card-row .pv-text {
      white-space: normal;
      max-width: none;
    }
    .pv-card-foot {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid var(--app-outline-variant);
      font-size: 0.75rem;
      color: var(--app-text-muted);
    }

    /* ── Detail modal ── */
    .pv-modal-title {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-right: 24px;
    }
    .pv-modal-icon {
      width: 40px;
      height: 40px;
      flex: none;
      display: grid;
      place-items: center;
      font-size: 1.25rem;
      border-radius: 12px;
      background: var(--app-primary-container);
    }
    .pv-modal-heading {
      min-width: 0;
    }
    .pv-modal-heading h3 {
      margin: 0;
      font-size: 1rem;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }
    .pv-modal-heading p {
      margin: 0;
      font-size: 0.75rem;
      color: var(--app-text-muted);
    }
    .pv-detail {
      display: flex;
      flex-direction: column;
    }
    .pv-detail-row {
      padding: 12px 0;
      border-bottom: 1px solid var(--app-outline-variant);
    }
    .pv-detail-row:first-child {
      padding-top: 0;
    }
    .pv-detail-label {
      margin-bottom: 4px;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .pv-detail-value {
      font-size: 0.9375rem;
      overflow-wrap: anywhere;
    }
    .pv-detail-value .pv-text {
      white-space: pre-wrap;
      max-width: none;
    }
    .pv-detail-value .pv-link {
      max-width: 100%;
    }
    .pv-detail-meta {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 8px;
      padding-top: 14px;
      font-size: 0.75rem;
      color: var(--app-text-muted);
    }
    .pv-detail-meta strong {
      font-weight: 600;
      color: var(--app-text-secondary);
    }

    /* ── Footer ── */
    .pv-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 6px;
      padding: 28px 16px;
      font-size: 0.8125rem;
      color: var(--app-text-muted);
    }
    .pv-footer a {
      font-weight: 600;
    }

    @media (max-width: 767px) {
      .pv-main {
        padding-bottom: 32px;
      }
      .toolbar {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }
      .search {
        flex: 1 1 auto;
        min-width: 0;
      }
      .pv-hero-body {
        gap: 14px;
        padding: 0 16px 18px;
      }
      .pv-hero-icon {
        width: 60px;
        height: 60px;
        margin-top: -30px;
        font-size: 1.85rem;
        border-radius: 16px;
      }
      .pv-hero-text {
        padding-top: 10px;
      }
      .pv-title-row h1 {
        font-size: 1.25rem;
      }
      .paginator-wrap {
        justify-content: center;
      }
    }
  `,
})
export class PublicViewPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(SharingApi);
  private readonly storage = inject(LocalStorageService);

  /** Phones get cards; tablets and desktops get the table. */
  protected readonly isMobile = toSignal(
    inject(BreakpointObserver)
      .observe("(max-width: 767px)")
      .pipe(map((s) => s.matches)),
    { initialValue: false },
  );

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly collection = signal<PublicCollection | null>(null);

  readonly loadingRecords = signal(false);
  readonly recordList = signal<PublicRecordList | null>(null);
  readonly currentPage = signal(1);
  readonly pageSize = signal(25);

  readonly searchQuery = signal("");
  readonly selectedRecord = signal<PublicRecord | null>(null);

  readonly sortFieldId = signal<string | null>(null);
  readonly sortAsc = signal(true);

  protected readonly columnWidths = signal<Record<string, number>>({});
  protected readonly activeResizingCol = signal<string | null>(null);

  private token = "";

  readonly total = computed(() => this.recordList()?.total ?? 0);
  readonly records = computed(() => this.recordList()?.items ?? []);
  readonly hasQuery = computed(() => this.searchQuery().trim().length > 0);

  readonly visibleFields = computed<PublicField[]>(() => {
    const col = this.collection();
    if (!col) return [];
    return col.fields.filter((f) => f.showInList || f.isTitle);
  });

  readonly titleField = computed<PublicField | undefined>(
    () => this.visibleFields()[0],
  );
  readonly cardFields = computed<PublicField[]>(() =>
    this.visibleFields().slice(1),
  );

  readonly sortField = computed<PublicField | null>(() => {
    const id = this.sortFieldId();
    return id ? (this.visibleFields().find((f) => f.id === id) ?? null) : null;
  });

  /** Search + sort run on the loaded page only; the API pages the rest. */
  readonly visibleRows = computed<PublicRecord[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    let rows = this.records();

    if (q) {
      rows = rows.filter((rec) =>
        Object.values(rec.values).some(
          (val) => val != null && String(val).toLowerCase().includes(q),
        ),
      );
    }

    const field = this.sortField();
    if (field) {
      const dir = this.sortAsc() ? 1 : -1;
      rows = [...rows].sort((x, y) => {
        const a = x.values[field.key];
        const b = y.values[field.key];
        const ae = this.isEmpty(a);
        const be = this.isEmpty(b);
        if (ae || be) return ae === be ? 0 : ae ? 1 : -1; // empties last
        return dir * this.compare(a, b);
      });
    }
    return rows;
  });

  readonly selectedTitle = computed(() => {
    const rec = this.selectedRecord();
    const tf = this.titleField();
    if (!rec) return "Record details";
    if (!tf) return "Record details";
    const v = rec.values[tf.key];
    return this.isEmpty(v) ? "Record details" : this.formatValue(tf, v);
  });

  readonly coverBg = computed(() => {
    const col = this.collection();
    if (!col) return fallbackBackground("default");
    if (col.coverType === "gradient" || col.coverType === "color") {
      return (
        coverBackground({
          type: col.coverType,
          value: col.coverValue ?? undefined,
        }) ?? fallbackBackground(col.id)
      );
    }
    return fallbackBackground(col.id);
  });

  async ngOnInit(): Promise<void> {
    this.token = this.route.snapshot.paramMap.get("token") ?? "";
    const saved = this.storage.getItem<Record<string, number>>(
      this.storageKey(),
    );
    if (saved && typeof saved === "object") this.columnWidths.set(saved);
    await this.loadCollection();
  }

  async loadCollection(): Promise<void> {
    this.loading.set(true);
    try {
      const col = await firstValueFrom(
        this.api.getPublicCollection(this.token),
      );
      this.collection.set(col);
      await this.loadRecords(1);
    } catch {
      this.error.set(
        "This share link is invalid, expired, or has been revoked.",
      );
    } finally {
      this.loading.set(false);
    }
  }

  async loadRecords(page: number): Promise<void> {
    this.loadingRecords.set(true);
    try {
      const list = await firstValueFrom(
        this.api.getPublicRecords(this.token, page, this.pageSize()),
      );
      this.recordList.set(list);
      this.currentPage.set(page);
    } catch {
      // non-fatal: keep whatever is already on screen
    } finally {
      this.loadingRecords.set(false);
    }
  }

  onPageChange(page: number): void {
    if (page === this.currentPage()) return;
    void this.loadRecords(page);
  }

  onPageSizeChange(size: number): void {
    if (size === this.pageSize()) return;
    this.pageSize.set(size);
    void this.loadRecords(1);
  }

  openDetail(row: PublicRecord): void {
    this.selectedRecord.set(row);
  }

  closeDetail(): void {
    this.selectedRecord.set(null);
  }

  protected text(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  /* ------------------------------- sorting ------------------------------- */

  protected isSortable(f: PublicField): boolean {
    return f.type !== "multiSelect";
  }

  /** Header click: asc -> desc -> default order. */
  protected toggleSort(f: PublicField): void {
    if (this.sortFieldId() !== f.id) {
      this.sortFieldId.set(f.id);
      this.sortAsc.set(true);
    } else if (this.sortAsc()) {
      this.sortAsc.set(false);
    } else {
      this.resetSort();
    }
  }

  protected resetSort(): void {
    this.sortFieldId.set(null);
    this.sortAsc.set(true);
  }

  protected ariaSort(f: PublicField): string | null {
    if (this.sortFieldId() !== f.id) return null;
    return this.sortAsc() ? "ascending" : "descending";
  }

  protected sortIconType(f: PublicField): string {
    if (this.sortFieldId() !== f.id) return "swap";
    return this.sortAsc() ? "arrow-up" : "arrow-down";
  }

  private isEmpty(v: unknown): boolean {
    return v === null || v === undefined || v === "";
  }

  private compare(a: unknown, b: unknown): number {
    if (typeof a === "number" && typeof b === "number") return a - b;
    if (typeof a === "boolean" && typeof b === "boolean")
      return Number(a) - Number(b);
    return String(a).localeCompare(String(b), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  /* --------------------------- column resizing --------------------------- */

  private storageKey(): string {
    return `public_view_widths_${this.token}`;
  }

  protected colWidth(fieldId: string): number | undefined {
    return this.columnWidths()[fieldId];
  }

  protected onResizeStart(event: PointerEvent, columnId: string): void {
    event.preventDefault();
    event.stopPropagation();

    const handle = event.currentTarget as HTMLElement;
    const headerCell = handle.closest("th") as HTMLElement | null;
    if (!headerCell) return;

    const startX = event.clientX;
    const startWidth = headerCell.getBoundingClientRect().width;
    const minWidth = 80;

    this.activeResizingCol.set(columnId);
    handle.setPointerCapture(event.pointerId);

    const onMove = (e: PointerEvent) => {
      const width = Math.max(
        minWidth,
        Math.round(startWidth + (e.clientX - startX)),
      );
      this.columnWidths.update((prev) => ({ ...prev, [columnId]: width }));
    };

    const onUp = (e: PointerEvent) => {
      handle.releasePointerCapture(e.pointerId);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      this.activeResizingCol.set(null);
      this.storage.setItem(this.storageKey(), this.columnWidths());
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  /* ------------------------------ formatting ------------------------------ */

  asArray(val: unknown): string[] {
    return Array.isArray(val) ? val.map(String) : [];
  }

  formatValue(field: PublicField, value: unknown): string {
    if (value === null || value === undefined || value === "") return "—";
    if (field.type === "boolean") return value === true ? "Yes" : "No";
    if (field.type === "date" && typeof value === "string")
      return formatDate(value);
    if (field.type === "dateTime" && typeof value === "string")
      return formatDateTime(value);
    if (field.type === "multiSelect" && Array.isArray(value))
      return (value as string[]).join(", ");
    if (field.type === "rating") return `${value} ★`;
    return String(value);
  }

  fmtDate(iso: string): string {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(iso),
    );
  }

  fmtDateTime(iso: string): string {
    return formatDateTime(iso);
  }
}
