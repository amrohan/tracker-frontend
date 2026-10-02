import { BreakpointObserver } from "@angular/cdk/layout";
import { Component, inject, input } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { map } from "rxjs";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDropdownModule } from "ng-zorro-antd/dropdown";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMenuModule } from "ng-zorro-antd/menu";
import { NzTabsModule } from "ng-zorro-antd/tabs";
import { NzModalService } from "ng-zorro-antd/modal";

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
    NzButtonModule,
    NzIconModule,
    NzDropdownModule,
    NzMenuModule,
    NzTabsModule,
    CoverView,
  ],

  template: `
    @if (ctx.detail.value(); as c) {
      <header>
        <div class="hero">
          <app-cover-view [cover]="c.cover" [collectionId]="c.id" />
        </div>

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
                <nz-icon
                  nzType="database"
                  class="meta-icon"
                  aria-hidden="true"
                />
                <span>
                  {{ c.recordCount }}
                  {{ c.recordCount === 1 ? "record" : "records" }}
                </span>
              </span>

              <span class="dot" aria-hidden="true">·</span>

              <span class="meta-item">
                <nz-icon nzType="table" class="meta-icon" aria-hidden="true" />
                <span>
                  {{ c.fields.length }}
                  {{ c.fields.length === 1 ? "field" : "fields" }}
                </span>
              </span>

              @if (c.lastActivityAt) {
                <span class="dot" aria-hidden="true">·</span>

                <span class="meta-item last">
                  <nz-icon
                    nzType="clock-circle"
                    class="meta-icon"
                    aria-hidden="true"
                  />
                  <span>Updated {{ dateTime(c.lastActivityAt) }}</span>
                </span>
              }
            </div>
          </div>

          <!-- Actions -->
          <div class="actions">
            <a
              [routerLink]="['/collections', c.id, 'records', 'new']"
              [attr.disabled]="c.fields.length === 0 ? '' : null"
            >
              <button nz-button nzType="primary" class="add-desktop">
                Add record
              </button>
            </a>

            <button
              nz-button
              nzType="text"
              nzShape="circle"
              class="options-btn"
              nz-dropdown
              [nzDropdownMenu]="optionsMenu"
              aria-label="Collection options"
            >
              <nz-icon nzType="more" />
            </button>

            <nz-dropdown-menu #optionsMenu="nzDropdownMenu">
              <ul nz-menu>
                <li nz-menu-item (click)="changeCover()">
                  <div class="flex gap-2">
                    <nz-icon nzType="picture" />
                    <span>Change cover</span>
                  </div>
                </li>
                <li nz-menu-item>
                  <a
                    class="flex gap-2"
                    [routerLink]="['/collections', c.id, 'edit']"
                  >
                    <nz-icon nzType="setting" /><span
                      >Edit fields &amp; details</span
                    >
                  </a>
                </li>
                <li nz-menu-item>
                  <a
                    class="flex gap-2"
                    [routerLink]="['/collections', c.id, 'import']"
                  >
                    <nz-icon nzType="upload" /><span>Import records</span>
                  </a>
                </li>
                <li nz-menu-divider></li>
                <li nz-menu-item nzDanger (click)="removeColl()">
                  <div class="flex gap-2">
                    <nz-icon nzType="delete" />
                    <span>Delete tracker</span>
                  </div>
                </li>
              </ul>
            </nz-dropdown-menu>
          </div>
        </div>

        <!-- ================= TABS ================= -->
        <div class="page tabs-wrap">
          <div class="tab-nav">
            <a
              class="tab-link"
              [routerLink]="['/collections', c.id]"
              routerLinkActive
              #tableLink="routerLinkActive"
              [routerLinkActiveOptions]="{ exact: true }"
              [class.active]="tableLink.isActive"
            >
              <nz-icon nzType="unordered-list" class="tab-icon" />
              Table
            </a>

            <a
              class="tab-link"
              [routerLink]="['/collections', c.id, 'summary']"
              routerLinkActive
              #summaryLink="routerLinkActive"
              [class.active]="summaryLink.isActive"
            >
              <nz-icon nzType="bar-chart" class="tab-icon" />
              Summary
            </a>
          </div>
        </div>

        <div class="goBack">
          <a nz-button nzType="text" routerLink="/">
            <nz-icon nzType="arrow-left" />
            Go Back
          </a>
        </div>
      </header>

      <!-- ================= CONTENT ================= -->
      @if (c.fields.length === 0) {
        <div class="page">
          <div class="empty-state">
            <div class="empty-icon-box" aria-hidden="true">
              <nz-icon nzType="setting" />
            </div>

            <h3>Add your first field</h3>

            <p>Fields define what you record — a name, a date, a rating…</p>

            <a
              nz-button
              nzType="primary"
              [routerLink]="['/collections', c.id, 'edit']"
            >
              <nz-icon nzType="plus" />
              Add fields
            </a>
          </div>
        </div>
      } @else {
        <router-outlet />
      }

      <!-- ================= MOBILE FAB ================= -->
      @if (c.fields.length > 0) {
        <a
          nz-button
          nzType="primary"
          nzShape="round"
          class="fab"
          [routerLink]="['/collections', c.id, 'records', 'new']"
        >
          <nz-icon nzType="plus" />
          Add record
        </a>
      }
    } @else if (ctx.detail.error()) {
      <!-- ================= ERROR ================= -->
      <div class="page">
        <div class="empty-state">
          <div class="empty-icon-box error-box" aria-hidden="true">
            <nz-icon nzType="search" />
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

          <a nz-button nzType="default" routerLink="/">
            <nz-icon nzType="arrow-left" />
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
      background: var(--app-surface-container, #f3edf7);
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
        color-mix(in srgb, var(--app-surface, #ffffff) 65%, transparent) 65%,
        var(--app-surface, #ffffff) 100%
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
      background: var(--app-surface, #ffffff);
      border: 3px solid var(--app-surface, #ffffff);
      box-shadow:
        0 4px 16px -2px rgba(0, 0, 0, 0.12),
        0 2px 6px -1px rgba(0, 0, 0, 0.08);
      user-select: none;
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
      color: var(--app-text, #1d1b20);
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .desc {
      margin: 6px 0 0;
      font-size: 0.95rem;
      line-height: 1.45;
      color: var(--app-text-muted, #49454f);
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
      color: var(--app-text-muted, #49454f);
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
    }

    .options-btn {
      color: var(--app-text-muted, #49454f);
      border-radius: 10px;
    }

    /* =========================================================
       TABS (custom nav bar)
       ========================================================= */

    .tabs-wrap {
      padding-top: 0;
      padding-bottom: 0;
    }

    .tab-nav {
      display: flex;
      border-bottom: 2px solid var(--app-outline-variant);
      gap: 0;
    }

    .tab-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 20px;
      height: 48px;
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--app-text-muted);
      text-decoration: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition:
        color 0.15s ease,
        border-color 0.15s ease;
    }

    .tab-link.active {
      color: var(--app-primary);
      border-bottom-color: var(--app-primary);
    }

    .tab-link:hover:not(.active) {
      color: var(--app-text);
      border-bottom-color: var(--app-outline);
    }

    .tab-icon {
      font-size: 20px;
      opacity: 0.85;
    }

    .goBack {
      padding: 8px 20px 0;
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
      background: var(--app-surface-container, #f3edf7);
      color: var(--app-text-muted, #49454f);
      margin-bottom: 16px;
      font-size: 30px;
    }

    .empty-icon-box.error-box {
      background: var(--app-error-container, #ffdad6);
      color: var(--app-on-error-container, #410002);
    }

    .empty-state h3 {
      margin: 0 0 8px;
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--app-text, #1d1b20);
    }

    .empty-state p {
      max-width: 440px;
      margin: 0 0 20px;
      font-size: 0.925rem;
      line-height: 1.5;
      color: var(--app-text-muted, #49454f);
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

      .add-desktop {
        display: none;
      }

      .fab {
        display: inline-flex;
      }
    }

    @media (max-width: 380px) {
      .head {
        margin-top: -24px;
      }
      h1 {
        font-size: 1.25rem;
      }
    }
  `,
})
export class CollectionPage {
  readonly id = input.required<string>();

  protected readonly ctx = bindCollectionId(this.id);

  private readonly api = inject(CollectionsApi);
  private readonly modal = inject(NzModalService);
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
    if (!c) return;

    const selection = await new Promise<CoverSelection | undefined>(
      (resolve) => {
        const modalRef = this.modal.create<
          CoverPickerDialog,
          { cover: Cover; collectionId: string | null },
          CoverSelection
        >({
          nzContent: CoverPickerDialog,
          nzData: { cover: c.cover, collectionId: c.id },
          nzFooter: null,
          nzWidth: 560,
          nzStyle: { maxWidth: "95vw" },
        });
        modalRef.afterClose.subscribe((value) => resolve(value));
      },
    );

    if (!selection) return;

    try {
      await this.api.applyCover(c.id, selection);
      this.ctx.detail.reload();
      this.notify.info("Cover updated.");
    } catch (err) {
      this.notify.error(problemMessage(err, "Could not update the cover."));
    }
  }

  protected async removeColl(): Promise<void> {
    const c = this.ctx.detail.value();
    if (!c) return;

    const ok = await new Promise<boolean>((resolve) => {
      const modalRef = this.modal.create<ConfirmDialog, unknown, boolean>({
        nzContent: ConfirmDialog,
        nzData: {
          title: `Delete "${c.name}"?`,
          message:
            `This permanently deletes the tracker ` +
            `and all ${c.recordCount} of its records. ` +
            `This cannot be undone.`,
          confirmLabel: "Delete tracker",
          destructive: true,
        },
        nzFooter: null,
        nzWidth: 420,
      });
      modalRef.afterClose.subscribe((value) => resolve(value === true));
    });

    if (!ok) return;

    try {
      await this.api.remove(c.id);
      this.notify.info("Tracker deleted.");
      await this.router.navigateByUrl("/");
    } catch (err) {
      this.notify.error(problemMessage(err, "Could not delete the tracker."));
    }
  }
}
