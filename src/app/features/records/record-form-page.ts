import { httpResource } from "@angular/common/http";
import {
  Component,
  computed,
  HostListener,
  inject,
  input,
  signal,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { Router, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { bindCollectionId } from "../../core/collection-context";
import { formatDateTime } from "../../core/format";
import {
  fieldErrors,
  httpStatus,
  problemExtension,
  problemMessage,
} from "../../core/http-errors";
import { RecordDetail } from "../../core/models";
import { Notify } from "../../core/notify.service";
import { RecordsApi } from "../../core/records-api.service";
import { ConfirmDialog } from "../../shared/confirm-dialog";
import { DynamicForm } from "./dynamic-form";

@Component({
  selector: "app-record-form-page",
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    DynamicForm,
  ],
  template: `
    <!-- Overlay Backdrop -->
    <div
      class="drawer-backdrop"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="recordId() ? 'Edit record' : 'New record'"
      (click)="onBackdropClick($event)"
    >
      <!-- Drawer Panel (Right slide-in on desktop, Bottom-sheet on mobile) -->
      <div class="drawer-panel surface-card" (click)="$event.stopPropagation()">
        <!-- Mobile Bottom Sheet Drag Handle -->
        <div class="mobile-drag-handle" aria-hidden="true"></div>

        <!-- 1. CONTEXTUAL FIXED TOP HEADER -->
        <header class="drawer-header">
          <div class="header-titles">
            <div class="header-tags">
              @if (ctx.detail.value(); as c) {
                <div class="collection-pill">
                  @if (c.icon) {
                    <span class="collection-icon">{{ c.icon }}</span>
                  }
                  <span class="collection-name">{{ c.name }}</span>
                </div>
              }

              <span class="mode-pill" [class.edit]="recordId()">
                {{ recordId() ? "Editing" : "New entry" }}
              </span>
            </div>

            <h2 class="form-title">
              {{ recordId() ? "Edit “" + recordTitle() + "”" : "New record" }}
            </h2>

            @if (recordId() && record.value(); as d) {
              <p class="meta-sub">
                <span>Updated {{ dateTime(d.record.updatedAt) }}</span>
                <span class="meta-dot">·</span>
                <span>v{{ d.record.version }}</span>
              </p>
            }
          </div>

          <div class="header-actions">
            @if (recordId()) {
              <a
                mat-icon-button
                class="header-icon-btn"
                [routerLink]="['/collections', id(), 'records', recordId()]"
                title="View record"
                aria-label="View record"
              >
                <mat-icon>visibility</mat-icon>
              </a>
            }

            <button
              mat-icon-button
              type="button"
              class="close-button"
              (click)="back()"
              aria-label="Close drawer"
              title="Close (Esc)"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </header>

        <!-- 2. SCROLLABLE MIDDLE BODY -->
        <div class="drawer-body">
          @if (ready()) {
            <div class="form-content-wrap">
              <app-dynamic-form
                [fields]="ctx.fields()"
                [initial]="record.value()?.record.values ?? null"
                [references]="record.value()?.references ?? {}"
                [serverErrors]="serverErrors()"
                [saving]="saving()"
                [submitLabel]="recordId() ? 'Save changes' : 'Add record'"
                (submitted)="save($event)"
                (cancelled)="back()"
              />
            </div>
          } @else if (record.error() || ctx.detail.error()) {
            <div class="drawer-error">
              <div class="error-icon-box" aria-hidden="true">
                <mat-icon>error_outline</mat-icon>
              </div>

              <h3>Could not load form</h3>
              <p>We encountered an issue loading this record or tracker.</p>

              <button mat-stroked-button type="button" (click)="back()">
                <mat-icon>arrow_back</mat-icon>
                <span>Go back</span>
              </button>
            </div>
          } @else {
            <div class="drawer-loading">
              <mat-progress-bar
                mode="indeterminate"
                aria-label="Loading record form"
              />
            </div>
          }
        </div>

        <!-- 3. PINNED BOTTOM FOOTER (WITH DELETE ON EDIT) -->
        @if (ready()) {
          <footer class="drawer-footer">
            @if (recordId()) {
              <button
                mat-button
                type="button"
                class="footer-btn delete-btn"
                [disabled]="saving()"
                (click)="deleteRecord()"
              >
                <mat-icon>delete</mat-icon>
                <span class="btn-text">Delete</span>
              </button>
            }

            <div class="footer-right">
              <button
                mat-button
                type="button"
                class="footer-btn cancel-btn"
                [disabled]="saving()"
                (click)="back()"
              >
                Cancel
              </button>

              <button
                mat-flat-button
                type="button"
                class="footer-btn save-btn"
                [disabled]="saving()"
                (click)="submitForm()"
              >
                <mat-icon>{{ saving() ? "sync" : "check" }}</mat-icon>
                <span>
                  {{
                    saving()
                      ? "Saving…"
                      : recordId()
                        ? "Save changes"
                        : "Add record"
                  }}
                </span>
              </button>
            </div>
          </footer>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    /* =========================================================
       BACKDROP
       ========================================================= */

    .drawer-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(15, 18, 24, 0.45);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      display: flex;
      justify-content: flex-end;
      overscroll-behavior: contain;
      animation: fadeIn 200ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* =========================================================
       DRAWER PANEL (3-Tier Fixed Architecture)
       ========================================================= */

    .drawer-panel {
      position: relative;
      width: min(580px, 100vw);
      height: 100%;
      background: var(--mat-sys-surface, #ffffff);
      border-left: 1px solid var(--mat-sys-outline-variant, #e0e2ec);
      box-shadow: -10px 0 32px -4px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      animation: slideInRight 260ms cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    }

    .mobile-drag-handle {
      display: none;
    }

    /* =========================================================
       1. FIXED DRAWER HEADER
       ========================================================= */

    .drawer-header {
      flex: 0 0 auto;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 24px 16px;
      border-bottom: 1px solid var(--mat-sys-outline-variant, #e0e2ec);
      background: var(--mat-sys-surface, #ffffff);
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 0;
    }

    .header-tags {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .collection-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 6px;
      background: var(--mat-sys-surface-container-high, #ece6f0);
      color: var(--mat-sys-on-surface-variant, #49454f);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .collection-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .collection-icon {
      font-size: 0.95rem;
      line-height: 1;
    }

    .mode-pill {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 6px;
      background: var(--mat-sys-surface-container, #f3edf7);
      color: var(--mat-sys-on-surface-variant, #49454f);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .mode-pill.edit {
      background: var(--mat-sys-primary-container, #eaddff);
      color: var(--mat-sys-on-primary-container, #21005d);
    }

    .form-title {
      margin: 2px 0 0;
      font-size: 1.35rem;
      line-height: 1.25;
      font-weight: 700;
      letter-spacing: -0.015em;
      color: var(--mat-sys-on-surface, #1d1b20);
      overflow-wrap: anywhere;
    }

    .meta-sub {
      margin: 0;
      font-size: 0.78rem;
      color: var(--mat-sys-on-surface-variant, #49454f);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .meta-dot {
      opacity: 0.5;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: -4px;
      margin-right: -4px;
      flex-shrink: 0;
    }

    .header-icon-btn,
    .close-button {
      color: var(--mat-sys-on-surface-variant, #49454f);
    }

    /* =========================================================
       2. SCROLLABLE DRAWER BODY
       ========================================================= */

    .drawer-body {
      flex: 1 1 auto;
      overflow-y: auto;
      overscroll-behavior-y: contain;
      -webkit-overflow-scrolling: touch;
      padding: 20px 24px 28px;
    }

    /* Hide internal redundant actions in DynamicForm so they live in pinned drawer-footer */
    .form-content-wrap ::ng-deep .actions {
      display: none !important;
    }

    /* =========================================================
       3. PINNED DRAWER FOOTER (STAYS AT BOTTOM)
       ========================================================= */

    .drawer-footer {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 24px;
      border-top: 1px solid var(--mat-sys-outline-variant, #e0e2ec);
      background: var(--mat-sys-surface, #ffffff);
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.05);
      z-index: 10;
    }

    .footer-right {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-left: auto;
    }

    .footer-btn {
      min-height: 40px;
      padding: 0 18px;
      border-radius: 10px;
      font-weight: 600;
    }

    .delete-btn {
      color: var(--mat-sys-error, #ba1a1a);
    }

    .delete-btn:hover:not([disabled]) {
      background: var(--mat-sys-error-container, #ffdad6);
    }

    .cancel-btn {
      color: var(--mat-sys-on-surface-variant, #49454f);
    }

    .save-btn {
      min-width: 140px;
    }

    /* =========================================================
       LOADING & ERROR STATES
       ========================================================= */

    .drawer-loading {
      padding: 48px 24px;
    }

    .drawer-loading mat-progress-bar {
      border-radius: 999px;
      height: 4px;
    }

    .drawer-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 48px 20px;
    }

    .error-icon-box {
      width: 56px;
      height: 56px;
      display: grid;
      place-items: center;
      border-radius: 16px;
      background: var(--mat-sys-error-container, #ffdad6);
      color: var(--mat-sys-on-error-container, #410002);
      margin-bottom: 14px;
    }

    .error-icon-box mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .drawer-error h3 {
      margin: 0 0 6px;
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--mat-sys-on-surface, #1d1b20);
    }

    .drawer-error p {
      max-width: 380px;
      margin: 0 0 20px;
      font-size: 0.9rem;
      line-height: 1.45;
      color: var(--mat-sys-on-surface-variant, #49454f);
    }

    /* =========================================================
       MOBILE (Bottom Sheet Drawer <= 640px)
       ========================================================= */

    @media (max-width: 640px) {
      .drawer-backdrop {
        align-items: flex-end;
        justify-content: center;
      }

      .drawer-panel {
        width: 100%;
        /* 92dvh resizes dynamically when virtual keyboard appears */
        height: 92dvh;
        max-height: 92dvh;
        border-left: none;
        border-top: 1px solid var(--mat-sys-outline-variant, #e0e2ec);
        border-radius: 22px 22px 0 0;
        box-shadow: 0 -10px 32px rgba(0, 0, 0, 0.22);
        animation: slideUpMobile 280ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      .mobile-drag-handle {
        display: block;
        width: 40px;
        height: 4.5px;
        border-radius: 999px;
        background: var(--mat-sys-outline-variant, #cac4d0);
        margin: 10px auto 4px;
        flex-shrink: 0;
      }

      .drawer-header {
        padding: 10px 16px 12px;
      }

      .form-title {
        font-size: 1.2rem;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .header-icon-btn,
      .close-button {
        width: 40px;
        height: 40px;
      }

      .drawer-body {
        padding: 12px 16px 20px;
      }

      /* Mobile action bar ergonomics */
      .drawer-footer {
        padding: 10px 16px max(14px, env(safe-area-inset-bottom));
        gap: 8px;
      }

      .footer-btn {
        min-height: 46px; /* Accessible touch target */
      }

      .delete-btn {
        flex: 0 0 auto;
        padding: 0 12px;
      }

      .delete-btn .btn-text {
        display: none; /* Icon-only on mobile to save horizontal space */
      }

      .footer-right {
        flex: 1 1 auto;
        display: flex;
        gap: 8px;
      }

      .cancel-btn {
        flex: 1 1 40%;
        width: 100%;
        justify-content: center;
      }

      .save-btn {
        flex: 1 1 60%;
        width: 100%;
        min-width: 0;
        justify-content: center;
      }
    }

    /* Small Phones (<= 380px) */
    @media (max-width: 380px) {
      .drawer-panel {
        height: 94dvh;
        max-height: 94dvh;
      }

      .form-title {
        font-size: 1.1rem;
      }

      .drawer-footer {
        padding: 8px 12px max(12px, env(safe-area-inset-bottom));
        gap: 6px;
      }

      .footer-btn {
        font-size: 0.875rem;
      }
    }

    /* =========================================================
       ANIMATIONS
       ========================================================= */

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideInRight {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }

    @keyframes slideUpMobile {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .drawer-backdrop,
      .drawer-panel {
        animation: none;
      }
    }
  `,
})
export class RecordFormPage {
  readonly id = input.required<string>();
  readonly recordId = input<string>();

  protected readonly ctx = bindCollectionId(this.id);
  private readonly api = inject(RecordsApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);
  private readonly router = inject(Router);

  protected readonly dateTime = formatDateTime;

  protected readonly record = httpResource<RecordDetail>(() => {
    const r = this.recordId();
    return r ? `/api/records/${r}` : undefined;
  });

  protected readonly saving = signal(false);
  protected readonly serverErrors = signal<Record<string, string[]>>({});
  protected readonly ready = computed(
    () =>
      this.ctx.detail.hasValue() &&
      (!this.recordId() || this.record.hasValue()),
  );

  /** Resolves the display title of the record when in edit mode */
  protected readonly recordTitle = computed(() => {
    const key = this.ctx.titleField()?.key;
    const d = this.record.value();
    const label = key && d ? d.record.values[key] : null;
    return typeof label === "string" && label ? label : "Record";
  });

  /** Close on Escape key press (unless actively saving) */
  @HostListener("document:keydown.escape")
  protected onEscape(): void {
    if (!this.saving()) {
      this.back();
    }
  }

  /** Close if clicking outside on the backdrop */
  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.saving()) {
      this.back();
    }
  }

  protected back(): void {
    void this.router.navigate(["/collections", this.id()]);
  }

  /** Triggers HTML form submission from the pinned footer button */
  protected submitForm(): void {
    const form = document.querySelector(
      ".drawer-body form",
    ) as HTMLFormElement | null;
    if (form) {
      form.requestSubmit();
    }
  }

  protected async save(values: Record<string, unknown>): Promise<void> {
    this.saving.set(true);
    this.serverErrors.set({});
    try {
      const rid = this.recordId();
      if (rid) {
        await this.api.update(rid, values, this.record.value()!.record.version);
      } else {
        await this.api.create(this.id(), values);
      }
      this.notify.info(rid ? "Record saved." : "Record added.");
      this.back();
    } catch (err) {
      if (httpStatus(err) === 400) {
        this.serverErrors.set(fieldErrors(err));
      }
      this.notify.error(problemMessage(err, "Could not save the record."));
    } finally {
      this.saving.set(false);
    }
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
    ).then((v) => v === true);
  }

  protected async deleteRecord(): Promise<void> {
    const rid = this.recordId();
    if (!rid) return;

    const name = this.recordTitle();
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
      await this.api.remove(rid, false);
    } catch (err) {
      if (httpStatus(err) !== 409) {
        return this.notify.error(problemMessage(err));
      }
      const n = problemExtension<number>(err, "referenceCount") ?? 0;
      if (
        !(await this.confirm(
          "This record is referenced elsewhere",
          `${n} other record(s) point to “${name}”. Deleting it will clear those references.`,
          "Delete anyway",
        ))
      ) {
        return;
      }
      try {
        await this.api.remove(rid, true);
      } catch (e2) {
        return this.notify.error(problemMessage(e2));
      }
    }

    this.notify.info("Record deleted.");
    this.ctx.detail.reload();
    this.back();
  }
}
