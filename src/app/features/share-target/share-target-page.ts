import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzTagModule } from "ng-zorro-antd/tag";

import { HeaderService } from "../../core/header.service";
import { fieldErrors, problemMessage } from "../../core/http-errors";
import { CollectionDetail, CollectionSummary, Field } from "../../core/models";
import { Notify } from "../../core/notify.service";
import { RecordsApi } from "../../core/records-api.service";
import { WebShareService } from "../../core/web-share.service";
import { DynamicForm } from "../records/dynamic-form";

@Component({
  selector: "app-share-target-page",
  imports: [
    RouterLink,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzSpinModule,
    NzTagModule,
    DynamicForm,
  ],
  template: `
    <div class="share-page-container">
      <!-- Top Eyebrow & Hero Header -->
      <div class="hero-section">
        <div class="hero-badge">
          <nz-icon nzType="share-alt" class="text-sm" />
          <span>Web Share Target</span>
        </div>
        <h1 class="hero-title">Add Shared Content to Tracker</h1>
        <p class="hero-desc">
          Capture links, notes, or snippets into your trackers. Pick where to
          add this record and review the fields below.
        </p>
      </div>

      <!-- Shared Incoming Content Preview Card -->
      <div class="content-preview-card">
        <div class="preview-header">
          <div class="flex items-center gap-2">
            <span class="preview-dot"></span>
            <span class="preview-title">Shared Content</span>
          </div>
          @if (sharedUrl()) {
            <a
              [href]="sharedUrl()"
              target="_blank"
              rel="noopener noreferrer"
              class="preview-link-btn"
              title="Open shared URL in new tab"
            >
              <nz-icon nzType="link" />
              <span>Visit link</span>
            </a>
          }
        </div>

        <div class="preview-body">
          <div class="preview-field">
            <label class="preview-label" for="shared-title-input">Title</label>
            <input
              id="shared-title-input"
              nz-input
              [(ngModel)]="sharedTitle"
              placeholder="Shared title..."
              (ngModelChange)="onSharedContentChanged()"
              class="rounded-lg!"
            />
          </div>

          <div class="preview-field">
            <label class="preview-label" for="shared-url-input"
              >URL / Link</label
            >
            <input
              id="shared-url-input"
              nz-input
              [(ngModel)]="sharedUrl"
              placeholder="https://example.com/..."
              (ngModelChange)="onSharedContentChanged()"
              class="rounded-lg!"
            />
          </div>

          <div class="preview-field">
            <label class="preview-label" for="shared-text-input"
              >Notes / Text</label
            >
            <textarea
              id="shared-text-input"
              nz-input
              rows="2"
              [(ngModel)]="sharedText"
              placeholder="Optional notes or text snippet..."
              (ngModelChange)="onSharedContentChanged()"
              class="rounded-lg!"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Tracker Selection Section -->
      <div class="tracker-picker-section">
        <div class="section-heading-row">
          <div>
            <h2 class="section-title">Select Tracker</h2>
            <p class="section-subtitle">
              Choose which tracker should store this entry.
            </p>
          </div>
          <div class="tracker-search-wrap">
            <nz-input-wrapper class="w-full sm:w-64">
              <input
                nz-input
                placeholder="Search trackers..."
                [(ngModel)]="trackerSearchQuery"
                class="rounded-lg!"
              />
              <nz-icon nzType="search" class="search-suffix" />
            </nz-input-wrapper>
          </div>
        </div>

        <!-- Collections / Trackers List -->
        @if (loadingCollections()) {
          <div class="loading-state">
            <nz-spin nzSimple nzTip="Loading your trackers..." />
          </div>
        } @else if (filteredCollections().length === 0) {
          <div class="empty-state">
            <div class="empty-icon-wrap">
              <nz-icon
                nzType="inbox"
                class="text-3xl text-(--app-text-muted)"
              />
            </div>
            <p class="font-semibold text-(--app-text)">No trackers found</p>
            <p class="text-xs text-(--app-text-muted) mb-3">
              {{
                trackerSearchQuery()
                  ? "No tracker matches your search."
                  : "You have not created any trackers yet."
              }}
            </p>
            <button nz-button nzType="primary" routerLink="/collections/new">
              <nz-icon nzType="plus" />
              <span>Create New Tracker</span>
            </button>
          </div>
        } @else {
          <div
            class="trackers-grid"
            role="radiogroup"
            aria-label="Available Trackers"
          >
            @for (col of filteredCollections(); track col.id) {
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="selectedTrackerId() === col.id"
                class="tracker-chip-btn"
                [class.selected]="selectedTrackerId() === col.id"
                (click)="selectTracker(col.id)"
              >
                <!-- Squircle Icon -->
                <div class="chip-icon" aria-hidden="true">
                  {{ col.icon || "📁" }}
                </div>

                <div class="chip-info">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="chip-name">{{ col.name }}</span>
                    @if (recentTrackerId() === col.id) {
                      <span class="recent-pill">Recent</span>
                    }
                  </div>
                  <span class="chip-meta">
                    {{ col.recordCount }}
                    {{ col.recordCount === 1 ? "record" : "records" }} ·
                    {{ col.fieldCount }} fields
                  </span>
                </div>

                <div class="chip-check" aria-hidden="true">
                  @if (selectedTrackerId() === col.id) {
                    <nz-icon
                      nzType="check-circle"
                      class="text-lg text-(--app-primary)"
                    />
                  } @else {
                    <div class="chip-radio-circle"></div>
                  }
                </div>
              </button>
            }
          </div>
        }
      </div>

      <!-- Tracker Form & Necessary Fields Section -->
      @if (selectedCollection(); as currentTracker) {
        <div class="fields-section">
          <div class="fields-header">
            <div class="flex items-center gap-3">
              <div class="selected-tracker-icon" aria-hidden="true">
                {{ currentTracker.icon || "📝" }}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span
                    class="text-xs font-semibold uppercase tracking-wider text-(--app-primary)"
                    >Target Tracker</span
                  >
                  <span class="fields-count-badge"
                    >{{ currentTracker.fields.length }} fields</span
                  >
                </div>
                <h3 class="tracker-active-name">{{ currentTracker.name }}</h3>
              </div>
            </div>
            @if (currentTracker.description) {
              <p
                class="text-xs text-(--app-text-muted) max-w-md hidden sm:block"
              >
                {{ currentTracker.description }}
              </p>
            }
          </div>

          @if (loadingTrackerDetail()) {
            <div class="loading-state py-12">
              <nz-spin nzSimple nzTip="Preparing fields..." />
            </div>
          } @else if (currentTracker.fields.length === 0) {
            <div class="empty-state py-8">
              <p class="text-sm text-(--app-text-muted)">
                This tracker has no fields configured yet.
              </p>
              <button
                nz-button
                nzType="default"
                [routerLink]="['/collections', currentTracker.id, 'edit']"
              >
                Add Fields
              </button>
            </div>
          } @else {
            <div class="form-wrapper">
              <app-dynamic-form
                [fields]="currentTracker.fields"
                [initial]="initialFormValues()"
                [serverErrors]="serverErrors()"
                [saving]="saving()"
                [submitLabel]="'Add Record to ' + currentTracker.name"
                [showActions]="true"
                (submitted)="saveRecord($event)"
                (cancelled)="onCancel()"
              />
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .share-page-container {
      max-width: 52rem;
      margin: 0 auto;
      padding: 1.5rem 1rem 5rem 1rem;
    }

    /* Hero Section */
    .hero-section {
      text-align: left;
      margin-bottom: 2rem;
    }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--app-primary);
      background: var(--app-primary-container);
      margin-bottom: 0.75rem;
    }
    .hero-title {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      color: var(--app-text);
      margin: 0 0 0.5rem 0;
      line-height: 1.25;
    }
    .hero-desc {
      font-size: 0.9375rem;
      color: var(--app-text-muted);
      margin: 0;
      line-height: 1.5;
    }

    /* Preview Card */
    .content-preview-card {
      border-radius: 1rem;
      border: 1px solid var(--app-outline-variant);
      background: var(--app-surface);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      margin-bottom: 2rem;
      overflow: hidden;
    }
    .preview-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.25rem;
      border-bottom: 1px solid var(--app-outline-variant);
      background: var(--app-surface-container);
    }
    .preview-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 9999px;
      background: var(--app-primary);
    }
    .preview-title {
      font-size: 0.8125rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text);
    }
    .preview-link-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--app-primary);
      text-decoration: none;
      transition: opacity 0.15s;
    }
    .preview-link-btn:hover {
      opacity: 0.8;
      text-decoration: underline;
    }
    .preview-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .preview-field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .preview-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--app-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Tracker Selection */
    .tracker-picker-section {
      margin-bottom: 2rem;
    }
    .section-heading-row {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    @media (min-width: 640px) {
      .section-heading-row {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
      }
    }
    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--app-text);
      margin: 0;
    }
    .section-subtitle {
      font-size: 0.8125rem;
      color: var(--app-text-muted);
      margin: 0.25rem 0 0 0;
    }
    .trackers-grid {
      display: grid;
      grid-template-columns: repeat(1, minmax(0, 1fr));
      gap: 0.75rem;
    }
    @media (min-width: 640px) {
      .trackers-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    .tracker-chip-btn {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.875rem 1rem;
      border-radius: 1rem;
      border: 1.5px solid var(--app-outline-variant);
      background: var(--app-surface);
      cursor: pointer;
      text-align: left;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      width: 100%;
    }
    .tracker-chip-btn:hover {
      border-color: var(--app-primary);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .tracker-chip-btn.selected {
      border-color: var(--app-primary);
      background: var(--app-surface-container);
      box-shadow:
        0 0 0 2px var(--app-primary-container),
        0 4px 12px rgba(0, 0, 0, 0.06);
    }
    .chip-icon {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.375rem;
      background: var(--app-surface);
      border: 1px solid var(--app-outline-variant);
      flex-shrink: 0;
    }
    .chip-info {
      flex: 1;
      min-width: 0;
    }
    .chip-name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--app-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
    }
    .recent-pill {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      color: var(--app-primary);
      background: var(--app-primary-container);
      flex-shrink: 0;
    }
    .chip-meta {
      font-size: 0.75rem;
      color: var(--app-text-muted);
      display: block;
      margin-top: 0.125rem;
    }
    .chip-check {
      margin-left: auto;
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }
    .chip-radio-circle {
      width: 1.125rem;
      height: 1.125rem;
      border-radius: 9999px;
      border: 2px solid var(--app-outline);
    }

    /* Necessary Fields Section */
    .fields-section {
      border-radius: 1.25rem;
      border: 1px solid var(--app-outline-variant);
      background: var(--app-surface);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }
    .fields-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--app-outline-variant);
      background: var(--app-surface-container);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .selected-tracker-icon {
      font-size: 2rem;
      line-height: 1;
    }
    .fields-count-badge {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      background: var(--app-surface-container-high);
      color: var(--app-text-muted);
    }
    .tracker-active-name {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--app-text);
      margin: 0;
    }
    .form-wrapper {
      padding: 1.5rem;
    }

    /* Loading & Empty states */
    .loading-state {
      display: flex;
      justify-content: center;
      padding: 3rem 1rem;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 2.5rem 1rem;
      background: var(--app-surface);
      border-radius: 1rem;
      border: 1px dashed var(--app-outline);
    }
    .empty-icon-wrap {
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 1rem;
      background: var(--app-surface-container-high);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.75rem;
    }
  `,
})
export class ShareTargetPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly recordsApi = inject(RecordsApi);
  private readonly webShare = inject(WebShareService);
  private readonly notify = inject(Notify);
  private readonly header = inject(HeaderService);

  // Incoming shared state
  readonly sharedTitle = signal("");
  readonly sharedUrl = signal("");
  readonly sharedText = signal("");

  // Collections state
  readonly collections = signal<CollectionSummary[]>([]);
  readonly loadingCollections = signal(true);
  readonly trackerSearchQuery = signal("");
  readonly selectedTrackerId = signal<string | null>(null);
  readonly recentTrackerId = signal<string | null>(null);

  // Selected collection detail (with full fields list)
  readonly selectedCollection = signal<CollectionDetail | null>(null);
  readonly loadingTrackerDetail = signal(false);

  // Saving state & server validation errors
  readonly saving = signal(false);
  readonly serverErrors = signal<Record<string, string[]>>({});

  // Computed filtered list of collections
  readonly filteredCollections = computed(() => {
    const list = this.collections();
    const q = this.trackerSearchQuery().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)),
    );
  });

  // Computed initial form values mapping from shared content into tracker's fields
  readonly initialFormValues = computed<Record<string, unknown>>(() => {
    const col = this.selectedCollection();
    if (!col || !col.fields) return {};

    const values: Record<string, unknown> = {};
    const titleVal = this.sharedTitle().trim();
    const urlVal = this.sharedUrl().trim();
    const textVal = this.sharedText().trim();

    for (const f of col.fields) {
      // 1. URL fields get the shared URL
      if (f.type === "url" && urlVal) {
        values[f.key] = urlVal;
        continue;
      }

      // 2. Title field (or name contains title/name) gets the shared title
      if (
        (f.isTitle ||
          f.key.toLowerCase().includes("title") ||
          f.name.toLowerCase().includes("title")) &&
        (titleVal || textVal)
      ) {
        values[f.key] = titleVal || textVal;
        continue;
      }

      // 3. Long text or description/notes fields get the shared text or combination
      if (
        f.type === "longText" ||
        f.key.toLowerCase().includes("note") ||
        f.key.toLowerCase().includes("desc") ||
        f.key.toLowerCase().includes("detail") ||
        f.name.toLowerCase().includes("note") ||
        f.name.toLowerCase().includes("description")
      ) {
        const parts: string[] = [];
        if (textVal) parts.push(textVal);
        if (urlVal && !col.fields.some((other) => other.type === "url")) {
          parts.push(urlVal);
        }
        values[f.key] = parts.join("\n\n");
        continue;
      }

      // Default value for booleans
      if (f.type === "boolean") {
        values[f.key] = false;
      }
    }

    return values;
  });

  async ngOnInit(): Promise<void> {
    this.header.set({
      title: "Share to Tracker",
      icon: "🔗",
      backLink: "/",
    });

    // 1. Extract query params from Web Share Target API or internal navigation
    const qp = this.route.snapshot.queryParamMap;
    const raw = {
      title: qp.get("title"),
      text: qp.get("text"),
      url: qp.get("url"),
    };

    const parsed = this.webShare.parseIncomingShare(raw);
    this.sharedTitle.set(parsed.title);
    this.sharedText.set(parsed.text);
    this.sharedUrl.set(parsed.url);

    // 2. Load collections and select the recently added tracker
    await this.loadCollections();
  }

  async loadCollections(): Promise<void> {
    this.loadingCollections.set(true);
    try {
      const list = await firstValueFrom(
        this.http.get<CollectionSummary[]>("/api/collections"),
      );
      this.collections.set(list || []);

      // Determine the "recently added tracker by user"
      const rememberedRecentId = this.webShare.getRecentTrackerId();
      let targetId: string | null = null;

      if (rememberedRecentId && list.some((c) => c.id === rememberedRecentId)) {
        targetId = rememberedRecentId;
        this.recentTrackerId.set(rememberedRecentId);
      } else if (list.length > 0) {
        // Sort by createdAt descending to always find the most recently created tracker,
        // or last activity if available.
        const sorted = [...list].sort((a, b) => {
          const ta = Date.parse(a.createdAt || a.updatedAt || "") || 0;
          const tb = Date.parse(b.createdAt || b.updatedAt || "") || 0;
          return tb - ta;
        });
        targetId = sorted[0].id;
        this.recentTrackerId.set(targetId);
      }

      if (targetId) {
        await this.selectTracker(targetId);
      }
    } catch {
      this.notify.error("Failed to load trackers.");
    } finally {
      this.loadingCollections.set(false);
    }
  }

  async selectTracker(id: string): Promise<void> {
    this.selectedTrackerId.set(id);
    this.loadingTrackerDetail.set(true);
    this.serverErrors.set({});

    try {
      const detail = await firstValueFrom(
        this.http.get<CollectionDetail>(`/api/collections/${id}`),
      );
      this.selectedCollection.set(detail);
    } catch {
      this.notify.error("Failed to load tracker details.");
    } finally {
      this.loadingTrackerDetail.set(false);
    }
  }

  onSharedContentChanged(): void {
    // Recompute initial values trigger when user edits the preview card
    if (this.selectedTrackerId()) {
      // triggers signal re-evaluation
      const current = this.selectedCollection();
      if (current) {
        this.selectedCollection.set({ ...current });
      }
    }
  }

  async saveRecord(values: Record<string, unknown>): Promise<void> {
    const colId = this.selectedTrackerId();
    const col = this.selectedCollection();
    if (!colId || !col) return;

    this.saving.set(true);
    this.serverErrors.set({});

    try {
      await this.recordsApi.create(colId, values);
      this.webShare.setRecentTrackerId(colId);
      this.notify.success(`Record successfully added to ${col.name}!`);
      // Navigate to the collection page so the user can see their newly added item
      this.router.navigate(["/collections", colId]);
    } catch (err: unknown) {
      const errors = fieldErrors(err);
      if (errors) {
        this.serverErrors.set(errors);
      }
      this.notify.error(
        problemMessage(err) || "Failed to save record to tracker.",
      );
    } finally {
      this.saving.set(false);
    }
  }

  onCancel(): void {
    this.router.navigate(["/"]);
  }
}
