import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { SharingApi } from '../../core/sharing-api.service';
import {
  PublicCollection,
  PublicField,
  PublicRecord,
  PublicRecordList,
} from '../../core/models';
import { formatDate, formatDateTime } from '../../core/format';
import { coverBackground, fallbackBackground } from '../../core/cover-presets';

@Component({
  selector: 'app-public-view-page',
  imports: [
    FormsModule,
    RouterLink,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSpinModule,
    NzTagModule,
    NzTableModule,
    NzTooltipModule,
  ],
  template: `
    <div class="public-view-root">

      <!-- ── Top bar ── -->
      <header class="pv-topbar">
        <div class="pv-topbar-inner">
          <div class="pv-brand">
            <span class="pv-brand-icon">📊</span>
            <span class="pv-brand-name">Personal Tracker</span>
          </div>
          <div class="pv-actions">
            <a routerLink="/login" class="pv-signin-btn">
              <nz-icon nzType="user" />
              Sign in
            </a>
          </div>
        </div>
      </header>

      <!-- ── Main ── -->
      <main class="pv-main">

        @if (loading()) {
          <div class="pv-loading">
            <nz-spin nzSimple nzSize="large" />
            <p>Loading shared tracker…</p>
          </div>
        } @else if (error()) {
          <div class="pv-error-card">
            <div class="pv-error-icon">🔒</div>
            <h2>Link unavailable</h2>
            <p>{{ error() }}</p>
            <a routerLink="/" nz-button nzType="primary">Go to Home</a>
          </div>
        } @else if (collection(); as col) {
          <!-- ── Banner / Hero ── -->
          <div class="pv-hero-card">
            <div class="pv-hero-cover" [style.background]="coverBg()"></div>
            <div class="pv-hero-content">
              <div class="pv-hero-icon">{{ col.icon }}</div>
              <div class="pv-hero-text">
                <div class="pv-hero-title-row">
                  <h1 class="pv-hero-title">{{ col.name }}</h1>
                  <span class="pv-readonly-badge">
                    <nz-icon nzType="eye" />
                    Read-only
                  </span>
                </div>
                @if (col.description) {
                  <p class="pv-hero-desc">{{ col.description }}</p>
                }
                <div class="pv-hero-meta">
                  <span class="pv-meta-chip">
                    <nz-icon nzType="database" />
                    {{ recordList()?.total ?? 0 }} records
                  </span>
                  <span class="pv-meta-chip">
                    <nz-icon nzType="table" />
                    {{ col.fields.length }} fields
                  </span>
                  <span class="pv-meta-chip">
                    <nz-icon nzType="user" />
                    Shared by {{ col.ownerDisplayName }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Table controls (Search & Summary) ── -->
          <div class="pv-table-header">
            <div class="pv-search-box">
              <nz-icon nzType="search" class="pv-search-icon" />
              <input
                type="text"
                nz-input
                placeholder="Search records…"
                [(ngModel)]="searchQuery"
                class="pv-search-input"
              />
            </div>

            <div class="pv-results-count">
              @if (searchQuery().trim()) {
                Showing {{ filteredRecords().length }} of {{ records().length }} loaded
              } @else {
                Total {{ recordList()?.total ?? 0 }} records
              }
            </div>
          </div>

          <!-- ── Records table ── -->
          <div class="pv-table-section">
            @if (loadingRecords()) {
              <div class="pv-loading py-10">
                <nz-spin nzSimple />
              </div>
            } @else {
              <nz-table
                [nzData]="filteredRecords()"
                [nzTotal]="recordList()?.total ?? 0"
                [nzPageIndex]="currentPage()"
                [nzPageSize]="pageSize"
                [nzFrontPagination]="false"
                [nzShowPagination]="(recordList()?.total ?? 0) > pageSize && !searchQuery().trim()"
                (nzPageIndexChange)="onPageChange($event)"
                nzSize="middle"
                [nzScroll]="{ x: '100%' }"
                class="pv-table"
              >
                <thead>
                  <tr>
                    @for (f of visibleFields(); track f.id) {
                      <th>{{ f.name }}</th>
                    }
                    <th nzWidth="130px">Created</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of filteredRecords(); track row.id) {
                    <tr class="pv-table-row" (click)="openDetail(row)">
                      @for (f of visibleFields(); track f.id) {
                        <td>
                          @switch (f.type) {
                            @case ('url') {
                              @if (row.values[f.key]) {
                                <a
                                  [href]="row.values[f.key]"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  (click)="$event.stopPropagation()"
                                  class="pv-link-cell"
                                >
                                  {{ row.values[f.key] }}
                                  <nz-icon nzType="export" class="text-xs" />
                                </a>
                              } @else {
                                <span class="pv-empty-dash">—</span>
                              }
                            }
                            @case ('boolean') {
                              @if (row.values[f.key] === true) {
                                <nz-icon nzType="check-circle" nzTheme="fill" class="pv-bool-yes" />
                              } @else if (row.values[f.key] === false) {
                                <nz-icon nzType="close-circle" nzTheme="outline" class="pv-bool-no" />
                              } @else {
                                <span class="pv-empty-dash">—</span>
                              }
                            }
                            @case ('rating') {
                              @if (row.values[f.key] != null) {
                                <span class="pv-rating-cell">
                                  {{ row.values[f.key] }} ★
                                </span>
                              } @else {
                                <span class="pv-empty-dash">—</span>
                              }
                            }
                            @case ('multiSelect') {
                              @if (asArray(row.values[f.key]).length > 0) {
                                <div class="pv-tags-cell">
                                  @for (tag of asArray(row.values[f.key]); track tag) {
                                    <nz-tag>{{ tag }}</nz-tag>
                                  }
                                </div>
                              } @else {
                                <span class="pv-empty-dash">—</span>
                              }
                            }
                            @case ('select') {
                              @if (row.values[f.key]) {
                                <nz-tag nzColor="default">{{ row.values[f.key] }}</nz-tag>
                              } @else {
                                <span class="pv-empty-dash">—</span>
                              }
                            }
                            @default {
                              <span class="pv-cell">{{ formatValue(f, row.values[f.key]) }}</span>
                            }
                          }
                        </td>
                      }
                      <td class="pv-date-cell">{{ fmtDate(row.createdAt) }}</td>
                    </tr>
                  }
                </tbody>
              </nz-table>

              @if (filteredRecords().length === 0) {
                <div class="pv-empty">
                  <nz-icon nzType="inbox" class="pv-empty-icon" />
                  <p>{{ searchQuery().trim() ? 'No records match your search.' : 'No records yet.' }}</p>
                </div>
              }
            }
          </div>
        }

      </main>

      <!-- ── Record Detail Modal ── -->
      <nz-modal
        [nzVisible]="selectedRecord() !== null"
        [nzTitle]="recordModalTitle"
        [nzFooter]="recordModalFooter"
        (nzOnCancel)="closeDetail()"
        [nzWidth]="620"
      >
        <ng-template #recordModalTitle>
          <div class="pv-modal-title">
            <span class="pv-modal-title-icon">📋</span>
            <span>Record Details</span>
          </div>
        </ng-template>

        <ng-container *nzModalContent>
          @if (selectedRecord(); as rec) {
            <div class="pv-detail-fields">
              @for (f of collection()?.fields; track f.id) {
                <div class="pv-detail-row">
                  <div class="pv-detail-label">
                    <span>{{ f.name }}</span>
                    @if (f.isTitle) {
                      <span class="pv-field-type-tag">Title</span>
                    }
                  </div>
                  <div class="pv-detail-value">
                    @switch (f.type) {
                      @case ('url') {
                        @if (rec.values[f.key]) {
                          <a
                            [href]="rec.values[f.key]"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="pv-link-cell"
                          >
                            {{ rec.values[f.key] }}
                            <nz-icon nzType="export" class="text-xs" />
                          </a>
                        } @else {
                          <span class="pv-empty-dash">—</span>
                        }
                      }
                      @case ('boolean') {
                        @if (rec.values[f.key] === true) {
                          <span class="pv-bool-text yes"><nz-icon nzType="check-circle" nzTheme="fill" /> Yes</span>
                        } @else if (rec.values[f.key] === false) {
                          <span class="pv-bool-text no"><nz-icon nzType="close-circle" nzTheme="outline" /> No</span>
                        } @else {
                          <span class="pv-empty-dash">—</span>
                        }
                      }
                      @case ('rating') {
                        @if (rec.values[f.key] != null) {
                          <span class="pv-rating-stars">{{ rec.values[f.key] }} ★</span>
                        } @else {
                          <span class="pv-empty-dash">—</span>
                        }
                      }
                      @case ('multiSelect') {
                        @if (asArray(rec.values[f.key]).length > 0) {
                          <div class="pv-tags-cell">
                            @for (tag of asArray(rec.values[f.key]); track tag) {
                              <nz-tag>{{ tag }}</nz-tag>
                            }
                          </div>
                        } @else {
                          <span class="pv-empty-dash">—</span>
                        }
                      }
                      @case ('select') {
                        @if (rec.values[f.key]) {
                          <nz-tag>{{ rec.values[f.key] }}</nz-tag>
                        } @else {
                          <span class="pv-empty-dash">—</span>
                        }
                      }
                      @default {
                        <span>{{ formatValue(f, rec.values[f.key]) }}</span>
                      }
                    }
                  </div>
                </div>
              }

              <div class="pv-detail-meta-footer">
                <div>Created: <strong>{{ fmtDateTime(rec.createdAt) }}</strong></div>
                <div>Updated: <strong>{{ fmtDateTime(rec.updatedAt) }}</strong></div>
              </div>
            </div>
          }
        </ng-container>

        <ng-template #recordModalFooter>
          <button nz-button nzType="default" (click)="closeDetail()">Close</button>
        </ng-template>
      </nz-modal>

      <!-- ── Footer ── -->
      <footer class="pv-footer">
        <span>Powered by</span>
        <a routerLink="/" class="pv-footer-link">Personal Tracker</a>
        <span>·</span>
        <span>Public read-only link</span>
      </footer>
    </div>
  `,
  styles: `
    .public-view-root {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--app-background, #f8fafc);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: var(--app-text, #0f172a);
    }

    /* Top bar */
    .pv-topbar {
      background: var(--app-surface, #ffffff);
      border-bottom: 1px solid var(--app-outline-variant, #e2e8f0);
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .pv-topbar-inner {
      max-width: 76rem;
      margin: 0 auto;
      padding: 0 1.25rem;
      height: 3.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .pv-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .pv-brand-icon { font-size: 1.35rem; }
    .pv-brand-name {
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: -0.015em;
      color: var(--app-text, #0f172a);
    }
    .pv-signin-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--app-primary, #0e7c86);
      text-decoration: none;
      padding: 0.375rem 0.875rem;
      border-radius: 9999px;
      border: 1.5px solid var(--app-primary, #0e7c86);
      transition: all 0.15s ease;
    }
    .pv-signin-btn:hover {
      background: var(--app-primary-container, #e0f7fa);
      color: var(--app-primary, #0e7c86);
    }

    /* Main */
    .pv-main {
      flex: 1;
      max-width: 76rem;
      margin: 0 auto;
      width: 100%;
      padding: 2rem 1.25rem 4rem;
    }
    .pv-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 5rem 1rem;
      color: var(--app-text-muted, #64748b);
    }

    /* Error */
    .pv-error-card {
      max-width: 28rem;
      margin: 5rem auto;
      text-align: center;
      padding: 2.5rem;
      background: var(--app-surface, #ffffff);
      border-radius: 1.5rem;
      border: 1px solid var(--app-outline-variant, #e2e8f0);
      box-shadow: 0 8px 30px rgba(0,0,0,0.06);
    }
    .pv-error-icon { font-size: 3.5rem; margin-bottom: 0.75rem; }
    .pv-error-card h2 {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--app-text, #0f172a);
      margin: 0 0 0.5rem;
    }
    .pv-error-card p {
      color: var(--app-text-muted, #64748b);
      margin: 0 0 1.5rem;
      font-size: 0.9375rem;
    }

    /* Hero Card */
    .pv-hero-card {
      background: var(--app-surface, #ffffff);
      border-radius: 1.25rem;
      border: 1px solid var(--app-outline-variant, #e2e8f0);
      box-shadow: 0 2px 10px rgba(0,0,0,0.04);
      overflow: hidden;
      margin-bottom: 1.75rem;
    }
    .pv-hero-cover {
      height: 100px;
      width: 100%;
    }
    .pv-hero-content {
      display: flex;
      align-items: flex-start;
      gap: 1.25rem;
      padding: 0 1.75rem 1.5rem;
      margin-top: -2.25rem;
    }
    .pv-hero-icon {
      font-size: 3rem;
      line-height: 1;
      width: 4.5rem;
      height: 4.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--app-surface, #ffffff);
      border: 3px solid var(--app-surface, #ffffff);
      border-radius: 1.25rem;
      box-shadow: 0 4px 14px rgba(0,0,0,0.1);
      flex-shrink: 0;
    }
    .pv-hero-text {
      flex: 1;
      padding-top: 2.75rem;
      min-width: 0;
    }
    .pv-hero-title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-bottom: 0.375rem;
    }
    .pv-hero-title {
      font-size: 1.625rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: var(--app-text, #0f172a);
      margin: 0;
    }
    .pv-hero-desc {
      color: var(--app-text-muted, #64748b);
      font-size: 0.9375rem;
      margin: 0 0 0.875rem;
      line-height: 1.5;
    }
    .pv-hero-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }
    .pv-meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--app-text-muted, #64748b);
      background: var(--app-surface-container, #f1f5f9);
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      border: 1px solid var(--app-outline-variant, #e2e8f0);
    }
    .pv-readonly-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--app-primary, #0e7c86);
      background: var(--app-primary-container, #e0f7fa);
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
    }

    /* Table controls */
    .pv-table-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.875rem;
      flex-wrap: wrap;
    }
    .pv-search-box {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      max-width: 20rem;
    }
    .pv-search-icon {
      position: absolute;
      left: 0.75rem;
      color: var(--app-text-muted, #64748b);
      pointer-events: none;
      z-index: 2;
    }
    .pv-search-input {
      padding-left: 2.25rem !important;
      border-radius: 0.75rem !important;
    }
    .pv-results-count {
      font-size: 0.8125rem;
      color: var(--app-text-muted, #64748b);
    }

    /* Table */
    .pv-table-section {
      background: var(--app-surface, #ffffff);
      border-radius: 1.25rem;
      border: 1px solid var(--app-outline-variant, #e2e8f0);
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      overflow: hidden;
    }
    .pv-table { width: 100%; }
    .pv-table-row {
      cursor: pointer;
      transition: background 0.12s ease;
    }
    .pv-table-row:hover td {
      background-color: var(--app-surface-hover, #f8fafc) !important;
    }
    .pv-cell {
      display: block;
      max-width: 260px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pv-date-cell {
      white-space: nowrap;
      color: var(--app-text-muted, #64748b);
      font-size: 0.8125rem;
    }
    .pv-empty-dash {
      color: var(--app-text-muted, #94a3b8);
    }
    .pv-link-cell {
      color: var(--app-primary, #0e7c86);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      max-width: 240px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pv-link-cell:hover { text-decoration: underline; }
    .pv-bool-yes { color: #16a34a; font-size: 1.1rem; }
    .pv-bool-no { color: #dc2626; font-size: 1.1rem; }
    .pv-rating-cell {
      font-weight: 600;
      color: #eab308;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .pv-tags-cell {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    /* Modal details */
    .pv-modal-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.125rem;
      font-weight: 700;
    }
    .pv-modal-title-icon { font-size: 1.25rem; }
    .pv-detail-fields {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 0.5rem 0;
    }
    .pv-detail-row {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--app-outline-variant, #f1f5f9);
    }
    .pv-detail-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted, #64748b);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .pv-field-type-tag {
      font-size: 0.6875rem;
      text-transform: none;
      color: var(--app-primary, #0e7c86);
      background: var(--app-primary-container, #e0f7fa);
      padding: 0.1rem 0.4rem;
      border-radius: 9999px;
    }
    .pv-detail-value {
      font-size: 0.9375rem;
      color: var(--app-text, #0f172a);
      word-break: break-word;
    }
    .pv-bool-text.yes { color: #16a34a; font-weight: 600; }
    .pv-bool-text.no { color: #dc2626; font-weight: 600; }
    .pv-rating-stars {
      color: #eab308;
      font-weight: 700;
      font-size: 1rem;
    }
    .pv-detail-meta-footer {
      display: flex;
      justify-content: space-between;
      padding-top: 0.75rem;
      font-size: 0.75rem;
      color: var(--app-text-muted, #64748b);
      border-top: 1px dashed var(--app-outline-variant, #e2e8f0);
    }

    /* Empty */
    .pv-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3.5rem 1rem;
      color: var(--app-text-muted, #64748b);
    }
    .pv-empty-icon {
      font-size: 2.75rem;
      opacity: 0.35;
      margin-bottom: 0.75rem;
    }

    /* Footer */
    .pv-footer {
      text-align: center;
      padding: 2rem 1.25rem;
      font-size: 0.8125rem;
      color: var(--app-text-muted, #94a3b8);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .pv-footer-link {
      color: var(--app-primary, #0e7c86);
      text-decoration: none;
      font-weight: 600;
    }
    .pv-footer-link:hover { text-decoration: underline; }
  `,
})
export class PublicViewPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(SharingApi);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly collection = signal<PublicCollection | null>(null);

  readonly loadingRecords = signal(false);
  readonly recordList = signal<PublicRecordList | null>(null);
  readonly currentPage = signal(1);
  readonly pageSize = 50;

  readonly searchQuery = signal('');
  readonly selectedRecord = signal<PublicRecord | null>(null);

  readonly records = computed(() => this.recordList()?.items ?? []);

  readonly filteredRecords = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const all = this.records();
    if (!q) return all;

    return all.filter((rec) => {
      return Object.values(rec.values).some((val) => {
        if (val == null) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  });

  readonly visibleFields = computed(() => {
    const col = this.collection();
    if (!col) return [];
    return col.fields.filter((f) => f.showInList || f.isTitle);
  });

  readonly coverBg = computed(() => {
    const col = this.collection();
    if (!col) return fallbackBackground('default');
    if (col.coverType === 'gradient' || col.coverType === 'color') {
      return coverBackground({ type: col.coverType, value: col.coverValue ?? undefined })
        ?? fallbackBackground(col.id);
    }
    return fallbackBackground(col.id);
  });

  private token = '';

  async ngOnInit(): Promise<void> {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    await this.loadCollection();
  }

  async loadCollection(): Promise<void> {
    this.loading.set(true);
    try {
      const col = await firstValueFrom(this.api.getPublicCollection(this.token));
      this.collection.set(col);
      await this.loadRecords(1);
    } catch {
      this.error.set(
        'This share link is invalid, expired, or has been revoked.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  async loadRecords(page: number): Promise<void> {
    this.loadingRecords.set(true);
    try {
      const list = await firstValueFrom(
        this.api.getPublicRecords(this.token, page, this.pageSize),
      );
      this.recordList.set(list);
      this.currentPage.set(page);
    } catch {
      // non-fatal — table stays empty
    } finally {
      this.loadingRecords.set(false);
    }
  }

  onPageChange(page: number): void {
    this.loadRecords(page);
  }

  openDetail(row: PublicRecord): void {
    this.selectedRecord.set(row);
  }

  closeDetail(): void {
    this.selectedRecord.set(null);
  }

  asArray(val: unknown): string[] {
    if (Array.isArray(val)) return val.map(String);
    return [];
  }

  formatValue(field: PublicField, value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (field.type === 'boolean') return value === true ? 'Yes' : 'No';
    if (field.type === 'date' && typeof value === 'string')
      return formatDate(value);
    if (field.type === 'dateTime' && typeof value === 'string')
      return formatDateTime(value);
    if (field.type === 'multiSelect' && Array.isArray(value))
      return (value as string[]).join(', ');
    if (field.type === 'rating') return `${value} ★`;
    return String(value);
  }

  fmtDate(iso: string): string {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
      new Date(iso),
    );
  }

  fmtDateTime(iso: string): string {
    return formatDateTime(iso);
  }
}
