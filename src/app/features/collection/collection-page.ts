import { BreakpointObserver } from "@angular/cdk/layout";
import { Component, inject, input } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatTabsModule } from "@angular/material/tabs";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { firstValueFrom, map } from "rxjs";

import { CollectionsApi } from "../../core/collections-api.service";
import { bindCollectionId } from "../../core/collection-context";
import { formatDateTime } from "../../core/format";
import { httpStatus, problemMessage } from "../../core/http-errors";
import { Cover, CoverSelection } from "../../core/models";
import { Notify } from "../../core/notify.service";
import { ConfirmDialog } from "../../shared/confirm-dialog";
import { CoverPickerDialog } from "../../shared/cover-picker-dialog";
import { CoverView } from "../../shared/cover-view";

@Component({
  selector: "app-collection-page",

  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTabsModule,
    CoverView,
  ],

  template: `
    @if (ctx.detail.value(); as c) {
      <header>
        <!-- ================= COVER ================= -->
        <div class="hero">
          <app-cover-view [cover]="c.cover" [collectionId]="c.id" />
        </div>

        <!-- ================= HEADER ================= -->
        <div class="page head">
          <!-- Icon -->
          <div class="icon" aria-hidden="true">
            {{ c.icon }}
          </div>

          <!-- Title / Description / Meta -->
          <div class="titles">
            <h1>{{ c.name }}</h1>

            @if (c.description) {
              <p class="desc">
                {{ c.description }}
              </p>
            }

            <div class="meta">
              <span class="meta-item">
                <mat-icon class="meta-icon" aria-hidden="true"
                  >dataset</mat-icon
                >
                <span>
                  {{ c.recordCount }}
                  {{ c.recordCount === 1 ? "record" : "records" }}
                </span>
              </span>

              <span class="dot" aria-hidden="true">·</span>

              <span class="meta-item">
                <mat-icon class="meta-icon" aria-hidden="true"
                  >view_column</mat-icon
                >
                <span>
                  {{ c.fields.length }}
                  {{ c.fields.length === 1 ? "field" : "fields" }}
                </span>
              </span>

              @if (c.lastActivityAt) {
                <span class="dot" aria-hidden="true">·</span>

                <span class="meta-item last">
                  <mat-icon class="meta-icon" aria-hidden="true"
                    >schedule</mat-icon
                  >
                  <span>Updated {{ dateTime(c.lastActivityAt) }}</span>
                </span>
              }
            </div>
          </div>

          <!-- Actions -->
          <div class="actions">
            <a
              mat-flat-button
              class="add-desktop"
              [routerLink]="['/collections', c.id, 'records', 'new']"
              [disabled]="c.fields.length === 0"
            >
              Add record
            </a>

            <button
              mat-icon-button
              class="options-btn"
              [matMenuTriggerFor]="menu"
              aria-label="Collection options"
            >
              <mat-icon>more_vert</mat-icon>
            </button>

            <mat-menu #menu="matMenu">
              <button mat-menu-item (click)="changeCover()">
                <mat-icon>image</mat-icon>
                <span>Change cover</span>
              </button>

              <a mat-menu-item [routerLink]="['/collections', c.id, 'edit']">
                <mat-icon>tune</mat-icon>
                <span>Edit fields &amp; details</span>
              </a>

              <a mat-menu-item [routerLink]="['/collections', c.id, 'import']">
                <mat-icon>upload_file</mat-icon>
                <span>Import records</span>
              </a>

              <button mat-menu-item class="delete-item" (click)="remove()">
                <mat-icon>delete</mat-icon>
                <span>Delete tracker</span>
              </button>
            </mat-menu>
          </div>
        </div>

        <!-- ================= TABS ================= -->
        <div class="page tabs-wrap">
          <nav
            mat-tab-nav-bar
            [tabPanel]="tabPanel"
            [mat-stretch-tabs]="isCompact()"
            aria-label="Views"
          >
            <a
              mat-tab-link
              [routerLink]="['/collections', c.id]"
              routerLinkActive
              #tableLink="routerLinkActive"
              [routerLinkActiveOptions]="{
                exact: true,
              }"
              [active]="tableLink.isActive"
            >
              <mat-icon class="tab-icon">table_rows</mat-icon>
              Table
            </a>

            <a
              mat-tab-link
              [routerLink]="['/collections', c.id, 'summary']"
              routerLinkActive
              #summaryLink="routerLinkActive"
              [active]="summaryLink.isActive"
            >
              <mat-icon class="tab-icon">insights</mat-icon>
              Summary
            </a>
          </nav>
        </div>

        <div class="goBack">
          <button matButton="tonal" routerLink="/">
            <mat-icon>arrow_back</mat-icon>
            Go Back
          </button>
        </div>
      </header>

      <!-- ================= CONTENT ================= -->
      <mat-tab-nav-panel #tabPanel>
        @if (c.fields.length === 0) {
          <div class="page">
            <div class="empty-state">
              <div class="empty-icon-box" aria-hidden="true">
                <mat-icon>tune</mat-icon>
              </div>

              <h3>Add your first field</h3>

              <p>Fields define what you record — a name, a date, a rating…</p>

              <a mat-flat-button [routerLink]="['/collections', c.id, 'edit']">
                <mat-icon>add</mat-icon>
                Add fields
              </a>
            </div>
          </div>
        } @else {
          <router-outlet />
        }
      </mat-tab-nav-panel>

      <!-- ================= MOBILE FAB ================= -->
      @if (c.fields.length > 0) {
        <a
          mat-fab
          extended
          class="fab"
          [routerLink]="['/collections', c.id, 'records', 'new']"
        >
          Add record
        </a>
      }
    } @else if (ctx.detail.error()) {
      <!-- ================= ERROR ================= -->
      <div class="page">
        <div class="empty-state">
          <div class="empty-icon-box error-box" aria-hidden="true">
            <mat-icon>search_off</mat-icon>
          </div>

          <h3>
            {{
              notFound() ? "Tracker not found" : "Could not load this tracker"
            }}
          </h3>

          <p>
            We couldn't load this tracker. It may have been removed or the link
            might be broken.
          </p>

          <a mat-stroked-button routerLink="/">
            <mat-icon>arrow_back</mat-icon>
            Back to my trackers
          </a>
        </div>
      </div>
    }
  `,

  styles: `
    /* =========================================================
       HOST
       ========================================================= */

    :host {
      display: block;
    }

    /* =========================================================
       COVER
       ========================================================= */

    .hero {
      position: relative;
      height: clamp(120px, 22vw, 216px);
      overflow: hidden;
      background: var(--mat-sys-surface-container, #f3edf7);
    }

    .hero::after {
      content: "";
      position: absolute;
      inset: auto 0 0 0;
      height: 55%;
      pointer-events: none;
      background: linear-gradient(
        to bottom,
        transparent 0%,
        color-mix(in srgb, var(--mat-sys-surface, #ffffff) 65%, transparent) 65%,
        var(--mat-sys-surface, #ffffff) 100%
      );
    }

    /* =========================================================
       HEADER
       ========================================================= */

    .head {
      position: relative;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: end;
      column-gap: 20px;
      padding-top: 0;
      padding-bottom: 16px;
      margin-top: calc(clamp(60px, 8vw, 84px) / -2);
    }

    /* =========================================================
       COLLECTION ICON
       ========================================================= */

    .icon {
      width: clamp(60px, 8vw, 84px);
      height: clamp(60px, 8vw, 84px);
      border-radius: clamp(16px, 2.4vw, 24px);
      display: grid;
      place-items: center;
      flex-shrink: 0;
      font-size: clamp(1.85rem, 1.25rem + 2vw, 2.75rem);
      background: var(--mat-sys-surface, #ffffff);
      border: 3px solid var(--mat-sys-surface, #ffffff);
      box-shadow:
        0 4px 16px -2px rgba(0, 0, 0, 0.12),
        0 2px 6px -1px rgba(0, 0, 0, 0.08);
      user-select: none;
      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease;
    }

    /* =========================================================
       TITLES
       ========================================================= */

    .titles {
      min-width: 0;
      padding-bottom: 2px;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.5rem, 1.15rem + 1.6vw, 2.35rem);
      line-height: 1.18;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--mat-sys-on-surface, #1d1b20);
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .desc {
      margin: 6px 0 0;
      font-size: 0.95rem;
      line-height: 1.45;
      color: var(--mat-sys-on-surface-variant, #49454f);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* =========================================================
       META
       ========================================================= */

    .meta {
      margin: 10px 0 0;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant, #49454f);
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px 8px;
    }

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-weight: 500;
    }

    .meta-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      opacity: 0.75;
    }

    .dot {
      opacity: 0.45;
      font-weight: 700;
    }

    /* =========================================================
       ACTIONS
       ========================================================= */

    .actions {
      display: flex;
      align-items: center;
      gap: 6px;
      align-self: start;
      padding-top: calc(clamp(60px, 8vw, 84px) / 2 + 6px);
    }

    .add-desktop {
      min-height: 40px;
      padding: 0 16px;
      border-radius: 10px;
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    .options-btn {
      color: var(--mat-sys-on-surface-variant, #49454f);
      border-radius: 10px;
    }

    .delete-item {
      color: var(--mat-sys-error, #ba1a1a);
    }

    .delete-item mat-icon {
      color: var(--mat-sys-error, #ba1a1a);
    }

    /* =========================================================
       TABS
       ========================================================= */

    .tabs-wrap {
      padding-top: 0;
      padding-bottom: 0;
    }

    [mat-tab-link] {
      font-size: 0.9375rem;
      font-weight: 500;
      min-width: 120px;
      height: 48px;
      letter-spacing: 0.01em;
    }

    .tab-icon {
      margin-right: 8px;
      font-size: 20px;
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    /* =========================================================
       EMPTY & ERROR STATE
       ========================================================= */

    .empty-state {
      min-height: 280px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 48px 20px;
    }

    .empty-icon-box {
      width: 60px;
      height: 60px;
      display: grid;
      place-items: center;
      border-radius: 18px;
      background: var(--mat-sys-surface-container, #f3edf7);
      color: var(--mat-sys-on-surface-variant, #49454f);
      margin-bottom: 16px;
    }

    .empty-icon-box mat-icon {
      font-size: 30px;
      width: 30px;
      height: 30px;
    }

    .empty-icon-box.error-box {
      background: var(--mat-sys-error-container, #ffdad6);
      color: var(--mat-sys-on-error-container, #410002);
    }

    .empty-state h3 {
      margin: 0 0 8px;
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--mat-sys-on-surface, #1d1b20);
    }

    .empty-state p {
      max-width: 440px;
      margin: 0 0 20px;
      font-size: 0.925rem;
      line-height: 1.5;
      color: var(--mat-sys-on-surface-variant, #49454f);
    }

    .empty-state a {
      border-radius: 10px;
      min-height: 40px;
    }

    /* =========================================================
       MOBILE FAB
       ========================================================= */

    .fab {
      display: none;
      position: fixed;
      right: 20px;
      bottom: max(20px, calc(env(safe-area-inset-bottom) + 16px));
      z-index: 25;
      border-radius: 16px;
      box-shadow:
        0 6px 18px rgba(0, 0, 0, 0.16),
        0 2px 6px rgba(0, 0, 0, 0.08);
      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease;
    }

    .fab:active {
      transform: scale(0.97);
    }

    /* =========================================================
       RESPONSIVE (TABLETS & PHONES)
       ========================================================= */

    @media (max-width: 640px) {
      .head {
        /*
         * Responsive 2-row layout:
         * Row 1: [Icon] ... [Options Button]
         * Row 2: [Titles & Meta (100% width)]
         */
        grid-template-columns: 1fr auto;
        align-items: center;
        row-gap: 12px;
        column-gap: 12px;
        margin-top: -30px;
        padding-bottom: 14px;
      }

      .icon {
        grid-column: 1;
        grid-row: 1;
        width: 58px;
        height: 58px;
        border-radius: 16px;
        font-size: 1.8rem;
      }

      .actions {
        grid-column: 2;
        grid-row: 1;
        align-self: center;
        padding-top: 0;
      }

      .titles {
        grid-column: 1 / -1;
        padding-bottom: 0;
        padding-right: 0;
      }

      h1 {
        font-size: 1.45rem;
      }

      .desc {
        font-size: 0.875rem;
        -webkit-line-clamp: 2;
      }

      .add-desktop {
        display: none;
      }

      .fab {
        display: inline-flex;
      }

      .tabs-wrap {
        margin-bottom: 12px;
      }

      [mat-tab-link] {
        min-width: 0;
        flex: 1;
        justify-content: center;
        font-size: 0.875rem;
        height: 44px;
      }

      .tab-icon {
        margin-right: 6px;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    /* =========================================================
       VERY SMALL PHONES (<= 380px)
       ========================================================= */

    @media (max-width: 380px) {
      .head {
        margin-top: -24px;
      }

      .icon {
        width: 50px;
        height: 50px;
        border-radius: 14px;
        font-size: 1.5rem;
      }

      h1 {
        font-size: 1.25rem;
      }

      .meta {
        font-size: 0.8rem;
      }

      .meta-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .icon,
      .fab {
        transition: none;
      }
    }
  `,
})
export class CollectionPage {
  readonly id = input.required<string>();

  protected readonly ctx = bindCollectionId(this.id);

  private readonly api = inject(CollectionsApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);
  private readonly router = inject(Router);

  protected readonly isCompact = toSignal(
    inject(BreakpointObserver)
      .observe("(max-width: 640px)")
      .pipe(map((state) => state.matches)),
    {
      initialValue: false,
    },
  );

  protected readonly dateTime = formatDateTime;

  protected notFound(): boolean {
    return httpStatus(this.ctx.detail.error()) === 404;
  }

  protected async changeCover(): Promise<void> {
    const c = this.ctx.detail.value();

    if (!c) {
      return;
    }

    const selection = await firstValueFrom(
      this.dialog
        .open<
          CoverPickerDialog,
          { cover: Cover; collectionId: string | null },
          CoverSelection
        >(CoverPickerDialog, {
          data: {
            cover: c.cover,
            collectionId: c.id,
          },

          width: "560px",

          maxWidth: "95vw",
        })
        .afterClosed(),
    );

    if (!selection) {
      return;
    }

    try {
      await this.api.applyCover(c.id, selection);

      this.ctx.detail.reload();

      this.notify.info("Cover updated.");
    } catch (err) {
      this.notify.error(problemMessage(err, "Could not update the cover."));
    }
  }

  protected async remove(): Promise<void> {
    const c = this.ctx.detail.value();

    if (!c) {
      return;
    }

    const ok = await firstValueFrom(
      this.dialog
        .open<ConfirmDialog, unknown, boolean>(ConfirmDialog, {
          data: {
            title: `Delete “${c.name}”?`,

            message:
              `This permanently deletes the tracker ` +
              `and all ${c.recordCount} of its records. ` +
              `This cannot be undone.`,

            confirmLabel: "Delete tracker",

            destructive: true,
          },
        })
        .afterClosed(),
    );

    if (!ok) {
      return;
    }

    try {
      await this.api.remove(c.id);

      this.notify.info("Tracker deleted.");

      await this.router.navigateByUrl("/");
    } catch (err) {
      this.notify.error(problemMessage(err, "Could not delete the tracker."));
    }
  }
}
