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

            <p class="meta">
              <span>
                {{ c.recordCount }}
                {{ c.recordCount === 1 ? "record" : "records" }}
              </span>

              <span class="dot" aria-hidden="true">·</span>

              <span>
                {{ c.fields.length }}
                {{ c.fields.length === 1 ? "field" : "fields" }}
              </span>

              @if (c.lastActivityAt) {
                <span class="dot" aria-hidden="true">·</span>

                <span class="last">
                  Updated {{ dateTime(c.lastActivityAt) }}
                </span>
              }
            </p>
          </div>

          <!-- Actions -->
          <div class="actions">
            <a
              mat-flat-button
              class="add-desktop"
              [routerLink]="['/collections', c.id, 'records', 'new']"
              [disabled]="c.fields.length === 0"
            >
              <mat-icon>add</mat-icon>
              Add record
            </a>

            <button
              mat-icon-button
              [matMenuTriggerFor]="menu"
              aria-label="Collection options"
            >
              <mat-icon>more_vert</mat-icon>
            </button>

            <mat-menu #menu="matMenu">
              <button mat-menu-item (click)="changeCover()">
                <mat-icon>image</mat-icon>
                Change cover
              </button>

              <a mat-menu-item [routerLink]="['/collections', c.id, 'edit']">
                <mat-icon>tune</mat-icon>
                Edit fields &amp; details
              </a>

              <a mat-menu-item [routerLink]="['/collections', c.id, 'import']">
                <mat-icon>upload_file</mat-icon>
                Import records
              </a>

              <button mat-menu-item (click)="remove()">
                <mat-icon>delete</mat-icon>
                Delete tracker
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
              <mat-icon class="tab-icon"> table_rows </mat-icon>

              Table
            </a>

            <a
              mat-tab-link
              [routerLink]="['/collections', c.id, 'summary']"
              routerLinkActive
              #summaryLink="routerLinkActive"
              [active]="summaryLink.isActive"
            >
              <mat-icon class="tab-icon"> insights </mat-icon>

              Summary
            </a>
          </nav>
        </div>
      </header>

      <!-- ================= CONTENT ================= -->
      <mat-tab-nav-panel #tabPanel>
        @if (c.fields.length === 0) {
          <div class="page">
            <div class="empty-state">
              <span class="material-icons"> tune </span>

              <h3>Add your first field</h3>

              <p>Fields define what you record — a name, a date, a rating…</p>

              <a mat-flat-button [routerLink]="['/collections', c.id, 'edit']">
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
          <mat-icon>add</mat-icon>
          Add record
        </a>
      }
    } @else if (ctx.detail.error()) {
      <!-- ================= ERROR ================= -->
      <div class="page">
        <div class="empty-state">
          <span class="material-icons"> search_off </span>

          <h3>
            {{
              notFound() ? "Tracker not found" : "Could not load this tracker"
            }}
          </h3>

          <a mat-stroked-button routerLink="/"> Back to my trackers </a>
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
      height: clamp(112px, 22vw, 208px);
      overflow: hidden;
    }

    .hero::after {
      content: "";
      position: absolute;
      inset: auto 0 0 0;
      height: 45%;
      pointer-events: none;

      background: linear-gradient(
        to bottom,
        transparent,
        color-mix(in srgb, var(--mat-sys-surface) 30%, transparent)
      );
    }

    /* =========================================================
       HEADER
       ========================================================= */

    .head {
      position: relative;

      display: grid;

      grid-template-columns:
        auto
        minmax(0, 1fr)
        auto;

      align-items: end;

      column-gap: 16px;

      padding-top: 0;
      padding-bottom: 12px;

      margin-top: calc(clamp(56px, 8vw, 80px) / -2);
    }

    /* =========================================================
       COLLECTION ICON
       ========================================================= */

    .icon {
      width: clamp(56px, 8vw, 80px);
      height: clamp(56px, 8vw, 80px);

      border-radius: clamp(16px, 2.4vw, 24px);

      display: grid;
      place-items: center;

      flex-shrink: 0;

      font-size: clamp(1.75rem, 1.2rem + 2vw, 2.6rem);

      background: var(--mat-sys-surface);

      border: 1px solid var(--mat-sys-outline-variant);

      box-shadow: var(--mat-sys-level2);
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

      font-size: clamp(1.5rem, 1.15rem + 1.6vw, 2.4rem);

      line-height: 1.15;
      letter-spacing: -0.02em;

      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .desc {
      margin: 6px 0 0;

      font-size: 1rem;
      line-height: 1.45;

      color: var(--mat-sys-on-surface-variant);

      display: -webkit-box;

      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;

      overflow: hidden;
    }

    /* =========================================================
       META
       ========================================================= */

    .meta {
      margin: 8px 0 0;

      font-size: 0.875rem;

      color: var(--mat-sys-on-surface-variant);

      display: flex;

      flex-wrap: wrap;

      gap: 0 6px;
    }

    .dot {
      opacity: 0.7;
    }

    /* =========================================================
       ACTIONS
       ========================================================= */

    .actions {
      display: flex;

      align-items: center;

      gap: 4px;

      align-self: start;

      padding-top: calc(clamp(56px, 8vw, 80px) / 2 + 8px);
    }

    /* =========================================================
       TABS
       ========================================================= */

    .tabs-wrap {
      padding-top: 0;
      padding-bottom: 0;
    }

    .tab-icon {
      margin-right: 8px;

      font-size: 20px;

      width: 20px;
      height: 20px;
    }

    [mat-tab-link] {
      font-size: 0.95rem;
      min-width: 112px;
    }

    /* =========================================================
       EMPTY STATE
       ========================================================= */

    .empty-state {
      min-height: 260px;

      display: flex;

      flex-direction: column;

      align-items: center;

      justify-content: center;

      text-align: center;

      padding: 48px 20px;
    }

    .empty-state .material-icons {
      font-size: 48px;

      width: 48px;
      height: 48px;

      margin-bottom: 12px;

      color: var(--mat-sys-on-surface-variant);
    }

    .empty-state h3 {
      margin: 0 0 8px;

      font-size: 1.25rem;
    }

    .empty-state p {
      max-width: 420px;

      margin: 0 0 20px;

      color: var(--mat-sys-on-surface-variant);
    }

    /* =========================================================
       MOBILE FAB
       ========================================================= */

    .fab {
      display: none;

      position: fixed;

      right: 16px;

      bottom: max(16px, env(safe-area-inset-bottom));

      z-index: 20;
    }

    /* =========================================================
       RESPONSIVE
       ========================================================= */

    @media (max-width: 640px) {
      .head {
        /*
         * Two columns on mobile.
         *
         * Icon | Title
         *
         * Actions are positioned independently
         * so they don't squeeze the title.
         */
        grid-template-columns:
          auto
          minmax(0, 1fr);

        column-gap: 12px;

        margin-top: -28px;

        padding-bottom: 12px;
      }

      .icon {
        width: 56px;
        height: 56px;

        border-radius: 16px;

        font-size: 1.75rem;
      }

      .titles {
        padding-bottom: 0;

        /*
         * Prevent text from overflowing
         * underneath the menu button.
         */
        padding-right: 44px;
      }

      h1 {
        font-size: 1.5rem;
      }

      .desc {
        font-size: 0.9rem;

        -webkit-line-clamp: 2;
      }

      .actions {
        position: absolute;

        top: 36px;
        right: 0;

        padding-top: 0;
      }

      .add-desktop {
        display: none;
      }

      .fab {
        display: inline-flex;
      }

      .last {
        display: none;
      }

      [mat-tab-link] {
        min-width: 0;

        flex: 1;

        justify-content: center;
      }

      .tab-icon {
        margin-right: 4px;
      }
    }

    /* =========================================================
       VERY SMALL PHONES
       ========================================================= */

    @media (max-width: 380px) {
      .head {
        column-gap: 10px;
      }

      .icon {
        width: 50px;
        height: 50px;

        border-radius: 14px;

        font-size: 1.5rem;
      }

      .titles {
        padding-right: 40px;
      }

      h1 {
        font-size: 1.3rem;
      }

      .meta {
        font-size: 0.8rem;
      }

      .tab-icon {
        display: none;
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

  /**
   * Phones:
   * - tabs stretch to full width
   * - desktop Add Record button disappears
   * - mobile FAB appears
   */
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
          {
            cover: Cover;
            collectionId: string | null;
          },
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
