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
import { Router } from "@angular/router";
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
import { FieldValue } from "../../shared/field-value";
import { DynamicForm } from "./dynamic-form";

@Component({
  selector: "app-record-detail-page",
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    FieldValue,
    DynamicForm,
  ],
  template: `
    <!-- Overlay Backdrop -->
    <div
      class="drawer-backdrop"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="isEditing() ? 'Edit record' : title()"
      (click)="onBackdropClick($event)"
    >
      <!-- Drawer Panel -->
      <div class="drawer-panel surface-card" (click)="$event.stopPropagation()">
        <!-- Mobile drag indicator bar -->
        <div class="mobile-drag-handle" aria-hidden="true"></div>

        <!-- 1. FIXED TOP HEADER -->
        <header class="drawer-header">
          <div class="header-titles">
            @if (ctx.detail.value(); as c) {
              <div class="collection-pill">
                @if (c.icon) {
                  <span class="collection-icon">{{ c.icon }}</span>
                }
                <span class="collection-name">{{ c.name }}</span>
              </div>
            }

            <h2>{{ isEditing() ? "Edit record" : title() }}</h2>
          </div>

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
        </header>

        <!-- 2. SCROLLABLE MIDDLE BODY -->
        <div class="drawer-body">
          @if (record.value(); as d) {
            @if (isEditing()) {
              <!-- EDIT MODE FORM -->
              <div class="edit-form-wrap">
                <app-dynamic-form
                  [fields]="ctx.fields()"
                  [initial]="d.record.values"
                  [references]="d.references"
                  [serverErrors]="serverErrors()"
                  [saving]="saving()"
                  (submitted)="save($event)"
                  (cancelled)="cancelEdit()"
                />
              </div>
            } @else {
              <!-- VIEW MODE PROPERTIES -->
              <dl class="properties-list">
                @for (f of ctx.fields(); track f.id) {
                  <div class="property-row">
                    <dt class="property-label">
                      <span class="label-text">{{ f.name }}</span>
                    </dt>
                    <dd class="property-value">
                      <app-field-value
                        [field]="f"
                        [value]="d.record.values[f.key]"
                        [references]="d.references"
                      />
                    </dd>
                  </div>
                }
              </dl>

              <!-- Timestamps -->
              <footer class="drawer-meta">
                <span class="meta-item">
                  <mat-icon class="meta-icon" aria-hidden="true">
                    add_circle_outline
                  </mat-icon>
                  <span>Created {{ dateTime(d.record.createdAt) }}</span>
                </span>

                <span class="meta-dot" aria-hidden="true">·</span>

                <span class="meta-item">
                  <mat-icon class="meta-icon" aria-hidden="true">
                    update
                  </mat-icon>
                  <span>Updated {{ dateTime(d.record.updatedAt) }}</span>
                </span>
              </footer>
            }
          } @else if (record.error()) {
            <!-- Error State -->
            <div class="drawer-error">
              <div class="error-icon-box" aria-hidden="true">
                <mat-icon>search_off</mat-icon>
              </div>

              <h3>Record not found</h3>
              <p>
                The record you are looking for may have been deleted or does not
                exist.
              </p>

              <button mat-stroked-button type="button" (click)="back()">
                <mat-icon>arrow_back</mat-icon>
                <span>Back to tracker</span>
              </button>
            </div>
          } @else {
            <!-- Loading State -->
            <div class="drawer-loading">
              <mat-progress-bar
                mode="indeterminate"
                aria-label="Loading record details"
              />
            </div>
          }
        </div>

        <!-- 3. PERMANENTLY PINNED BOTTOM FOOTER -->
        @if (record.value()) {
          <footer class="drawer-footer">
            @if (isEditing()) {
              <!-- EDIT MODE ACTIONS -->
              <button
                mat-button
                type="button"
                class="footer-btn cancel-btn"
                [disabled]="saving()"
                (click)="cancelEdit()"
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
                <span>{{ saving() ? "Saving…" : "Save changes" }}</span>
              </button>
            } @else {
              <!-- VIEW MODE ACTIONS -->
              <button
                mat-button
                type="button"
                class="footer-btn delete-btn"
                (click)="remove()"
              >
                <mat-icon>delete</mat-icon>
                <span>Delete</span>
              </button>

              <div class="footer-right">
                <button
                  mat-flat-button
                  type="button"
                  class="footer-btn edit-btn"
                  (click)="startEdit()"
                >
                  <mat-icon>edit</mat-icon>
                  <span>Edit record</span>
                </button>
              </div>
            }
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
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--mat-sys-outline-variant, #e0e2ec);
      background: var(--mat-sys-surface, #ffffff);
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }

    .collection-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      width: fit-content;
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

    .drawer-header h2 {
      margin: 0;
      font-size: 1.35rem;
      line-height: 1.25;
      font-weight: 700;
      letter-spacing: -0.015em;
      color: var(--mat-sys-on-surface, #1d1b20);
      overflow-wrap: anywhere;
    }

    .close-button {
      color: var(--mat-sys-on-surface-variant, #49454f);
      margin-top: -4px;
      margin-right: -4px;
      flex-shrink: 0;
    }

    /* =========================================================
       2. SCROLLABLE DRAWER BODY
       ========================================================= */

    .drawer-body {
      flex: 1 1 auto;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 20px 24px 28px;
    }

    /* Hide internal redundant actions in DynamicForm so they live in drawer-footer */
    .edit-form-wrap ::ng-deep .actions {
      display: none !important;
    }

    .properties-list {
      margin: 0;
      display: flex;
      flex-direction: column;
    }

    .property-row {
      display: grid;
      grid-template-columns: minmax(110px, 160px) 1fr;
      align-items: baseline;
      gap: 16px;
      padding: 14px 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant, #e0e2ec);
    }

    .property-row:last-child {
      border-bottom: 0;
    }

    dt.property-label {
      color: var(--mat-sys-on-surface-variant, #49454f);
      font-size: 0.84rem;
      font-weight: 600;
      line-height: 1.4;
      letter-spacing: 0.01em;
    }

    dd.property-value {
      margin: 0;
      color: var(--mat-sys-on-surface, #1d1b20);
      font-size: 0.9375rem;
      line-height: 1.5;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .drawer-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px 10px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--mat-sys-outline-variant, #e0e2ec);
      font-size: 0.8125rem;
      color: var(--mat-sys-on-surface-variant, #49454f);
    }

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .meta-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      opacity: 0.7;
    }

    .meta-dot {
      opacity: 0.45;
      font-weight: 700;
    }

    /* =========================================================
       3. PINNED DRAWER FOOTER (SAVE & CANCEL PINNED AT BOTTOM)
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
      gap: 8px;
    }

    .footer-btn {
      min-height: 40px;
      padding: 0 16px;
      border-radius: 10px;
      font-weight: 600;
    }

    .delete-btn {
      color: var(--mat-sys-error, #ba1a1a);
    }

    .delete-btn:hover {
      background: var(--mat-sys-error-container, #ffdad6);
    }

    .cancel-btn {
      color: var(--mat-sys-on-surface-variant, #49454f);
    }

    .save-btn {
      min-width: 130px;
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
        height: 90vh;
        max-height: 90vh;
        border-left: none;
        border-top: 1px solid var(--mat-sys-outline-variant, #e0e2ec);
        border-radius: 22px 22px 0 0;
        box-shadow: 0 -10px 32px rgba(0, 0, 0, 0.22);
        animation: slideUp 280ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      .mobile-drag-handle {
        display: block;
        width: 36px;
        height: 4px;
        border-radius: 999px;
        background: var(--mat-sys-outline-variant, #cac4d0);
        margin: 10px auto 2px;
        flex-shrink: 0;
      }

      .drawer-header {
        padding: 12px 18px 14px;
      }

      .drawer-header h2 {
        font-size: 1.2rem;
      }

      .drawer-body {
        padding: 12px 18px 20px;
      }

      .drawer-footer {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        padding: 12px 16px max(14px, env(safe-area-inset-bottom));
      }

      .footer-right {
        display: contents;
      }

      .footer-btn {
        width: 100%;
        min-height: 44px;
        justify-content: center;
      }

      .property-row {
        grid-template-columns: 1fr;
        gap: 4px;
        padding: 12px 0;
      }

      dt.property-label {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      dd.property-value {
        font-size: 0.95rem;
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

    @keyframes slideUp {
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
export class RecordDetailPage {
  readonly id = input.required<string>();
  readonly recordId = input.required<string>();

  protected readonly ctx = bindCollectionId(this.id);
  private readonly api = inject(RecordsApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);
  private readonly router = inject(Router);

  protected readonly record = httpResource<RecordDetail>(
    () => `/api/records/${this.recordId()}`,
  );
  protected readonly dateTime = formatDateTime;

  /** Opens straight to edit mode if URL ends with '/edit' */
  protected readonly isEditing = signal(this.router.url.includes("/edit"));
  protected readonly saving = signal(false);
  protected readonly serverErrors = signal<Record<string, string[]>>({});

  protected readonly title = computed(() => {
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

  /** Close on backdrop click */
  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.saving()) {
      this.back();
    }
  }

  protected back(): void {
    void this.router.navigate(["/collections", this.id()]);
  }

  protected startEdit(): void {
    this.serverErrors.set({});
    this.isEditing.set(true);
  }

  protected cancelEdit(): void {
    this.serverErrors.set({});
    this.isEditing.set(false);
  }

  /** Triggers form submission from the pinned footer button */
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
      const version = this.record.value()?.record.version;
      if (version === undefined) return;
      await this.api.update(this.recordId(), values, version);
      this.notify.info("Record saved.");
      this.record.reload();
      this.ctx.detail.reload();
      this.isEditing.set(false);
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

  protected async remove(): Promise<void> {
    if (
      !(await this.confirm(
        "Delete record?",
        "This record will be permanently deleted.",
        "Delete",
      ))
    )
      return;
    try {
      await this.api.remove(this.recordId(), false);
    } catch (err) {
      if (httpStatus(err) !== 409)
        return this.notify.error(problemMessage(err));
      const n = problemExtension<number>(err, "referenceCount") ?? 0;
      if (
        !(await this.confirm(
          "This record is referenced elsewhere",
          `${n} other record(s) point to it. Deleting it will clear those references.`,
          "Delete anyway",
        ))
      )
        return;
      try {
        await this.api.remove(this.recordId(), true);
      } catch (e2) {
        return this.notify.error(problemMessage(e2));
      }
    }
    this.notify.info("Record deleted.");
    this.back();
  }
}
