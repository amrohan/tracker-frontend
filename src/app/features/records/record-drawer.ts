import { BreakpointObserver } from "@angular/cdk/layout";
import { Component, computed, inject, signal, viewChild } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDrawerModule } from "ng-zorro-antd/drawer";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzModalService } from "ng-zorro-antd/modal";
import { NzSpinModule } from "ng-zorro-antd/spin";

import { CollectionContext } from "../../core/collection-context";
import { formatDateTime } from "../../core/format";
import {
  fieldErrors,
  httpStatus,
  problemExtension,
  problemMessage,
} from "../../core/http-errors";
import { Notify } from "../../core/notify.service";
import { RecordsApi } from "../../core/records-api.service";
import { WebShareService } from "../../core/web-share.service";
import { ConfirmDialog } from "../../shared/confirm-dialog";
import { FieldValue } from "../../shared/field-value";
import { recordLabel } from "../collection/record-list.utils";
import { DynamicForm } from "./dynamic-form";

@Component({
  selector: "app-record-drawer",
  imports: [
    NzDrawerModule,
    NzButtonModule,
    NzIconModule,
    NzSpinModule,
    FieldValue,
    DynamicForm,
  ],
  template: `
    <!-- Header Template -->
    <ng-template #titleTpl>
      <div class="drawer-title-block">
        @if (ctx.detail.value(); as col) {
          <p class="drawer-eyebrow">
            @if (col.icon) {
              <span class="drawer-eyebrow-icon" aria-hidden="true">{{ col.icon }}</span>
            }
            <span>{{ col.name }}</span>
          </p>
        }
        <span class="drawer-heading">{{ title() }}</span>
      </div>
    </ng-template>

    <!-- Unified Drawer Footer (Always at bottom) -->
    <ng-template #footerTpl>
      <div class="drawer-footer-actions">
        @if (mode() === 'view') {
          <button
            nz-button
            nzType="default"
            nzDanger
            type="button"
            (click)="remove()"
          >
            Delete
          </button>
          <span class="spacer"></span>
          <button
            nz-button
            nzType="primary"
            type="button"
            (click)="switchToEdit()"
          >
            Edit
          </button>
        } @else {
          <button
            nz-button
            nzType="default"
            type="button"
            [disabled]="saving()"
            (click)="cancelEdit()"
          >
            Cancel
          </button>
          <span class="spacer"></span>
          <button
            nz-button
            nzType="primary"
            type="button"
            [nzLoading]="saving()"
            [disabled]="saving()"
            (click)="submitForm()"
          >
            {{ saving() ? 'Saving…' : (mode() === 'edit' ? 'Save changes' : 'Add record') }}
          </button>
        }
      </div>
    </ng-template>

    <nz-drawer
      [nzVisible]="visible()"
      [nzPlacement]="isMobile() ? 'bottom' : 'right'"
      [nzWidth]="isMobile() ? '100%' : 560"
      [nzHeight]="isMobile() ? '92dvh' : '100%'"
      [nzTitle]="titleTpl"
      [nzFooter]="footerTpl"
      [nzClosable]="!saving()"
      [nzMaskClosable]="!saving()"
      [nzKeyboard]="!saving()"
      (nzOnClose)="close()"
    >
      <ng-container *nzDrawerContent>
        @if (mode() === 'view') {
          <!-- ================= VIEW MODE ================= -->
          @if (record(); as r) {
            <div class="view-content">
              <dl class="fields">
                @for (f of ctx.fields(); track f.id) {
                  <div class="item">
                    <dt>
                      <nz-icon
                        class="field-icon"
                        [nzType]="typeIcon(f.type)"
                        aria-hidden="true"
                      />
                      <span>{{ f.name }}</span>
                    </dt>
                    <dd>
                      <app-field-value
                        [field]="f"
                        [value]="r.values[f.key]"
                        [references]="references()"
                      />
                    </dd>
                  </div>
                }
              </dl>

              <div class="meta">
                <span class="meta-chip">
                  <nz-icon nzType="history" aria-hidden="true" />
                  Created {{ dateTime(r.createdAt) }}
                </span>
                <span class="meta-chip">
                  <nz-icon nzType="clock-circle" aria-hidden="true" />
                  Updated {{ dateTime(r.updatedAt) }}
                </span>
              </div>
            </div>
          }
        } @else {
          <!-- ================= CREATE / EDIT MODE ================= -->
          <div class="form-content">
            <app-dynamic-form
              [fields]="ctx.fields()"
              [initial]="mode() === 'edit' ? record()?.values ?? null : null"
              [references]="references()"
              [serverErrors]="serverErrors()"
              [saving]="saving()"
              [showActions]="false"
              [submitLabel]="mode() === 'edit' ? 'Save changes' : 'Add record'"
              (submitted)="save($event)"
              (cancelled)="cancelEdit()"
            />
          </div>
        }
      </ng-container>
    </nz-drawer>
  `,
  styles: `
    .drawer-title-block {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .drawer-eyebrow {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1.2;
      color: var(--app-text-muted);
    }

    .drawer-eyebrow-icon {
      display: inline-flex;
      align-items: center;
      font-size: 0.95rem;
      line-height: 1;
    }

    .drawer-heading {
      font-size: 1.125rem;
      font-weight: 700;
      line-height: 1.3;
      color: var(--app-text);
      overflow-wrap: anywhere;
    }

    .drawer-footer-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 4px 0;
    }

    .spacer {
      flex: 1 1 auto;
    }

    /* ---------------- View Mode Fields List ---------------- */
    .view-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .fields {
      margin: 0;
      border: 1px solid var(--app-outline-variant);
      border-radius: 12px;
      overflow: hidden;
      background: var(--app-surface-container-low);
    }

    .item {
      display: grid;
      grid-template-columns: minmax(120px, 170px) minmax(0, 1fr);
      gap: 12px;
      align-items: start;
      padding: 9px 14px;
      border-bottom: 1px solid var(--app-outline-variant);
      transition: background-color 0.12s ease;
    }

    .item:last-child {
      border-bottom: 0;
    }

    .item:nth-child(even) {
      background: color-mix(
        in srgb,
        var(--app-surface-container) 45%,
        transparent
      );
    }

    dt {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.84rem;
      font-weight: 600;
      line-height: 1.4;
      color: var(--app-text-muted);
      padding-top: 1px;
    }

    .field-icon {
      font-size: 15px;
      color: var(--app-primary);
      opacity: 0.85;
      flex: none;
    }

    dd {
      margin: 0;
      line-height: 1.5;
      font-size: 0.9375rem;
      color: var(--app-text);
      overflow-wrap: anywhere;
    }

    /* ---------------- Meta Chips ---------------- */
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 999px;
      background: var(--app-surface-container);
      color: var(--app-text-muted);
      font-size: 0.8125rem;
      font-weight: 500;
    }

    /* ---------------- Form Content ---------------- */
    .form-content {
      padding: 4px 0;
    }

    /* ---------------- Mobile Adjustments ---------------- */
    @media (max-width: 560px) {
      .item {
        grid-template-columns: 1fr;
        gap: 4px;
        padding: 11px 14px;
      }

      dt {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .field-icon {
        display: none;
      }
    }
  `,
})
export class RecordDrawer {
  protected readonly ctx = inject(CollectionContext);
  private readonly api = inject(RecordsApi);
  private readonly modal = inject(NzModalService);
  private readonly notify = inject(Notify);
  private readonly webShare = inject(WebShareService);

  protected readonly isMobile = toSignal(
    inject(BreakpointObserver)
      .observe("(max-width: 640px)")
      .pipe(map((s) => s.matches)),
    { initialValue: false },
  );

  protected readonly dynamicForm = viewChild(DynamicForm);

  protected readonly dateTime = formatDateTime;

  protected readonly state = computed(() => this.ctx.drawerState());
  protected readonly visible = computed(() => !!this.state());
  protected readonly mode = computed(() => this.state()?.mode ?? "view");
  protected readonly record = computed(() => this.state()?.record);
  protected readonly references = computed(() => this.state()?.references ?? {});

  protected readonly saving = signal(false);
  protected readonly serverErrors = signal<Record<string, string[]>>({});

  protected readonly title = computed(() => {
    const m = this.mode();
    const r = this.record();
    const titleKey = this.ctx.titleField()?.key;

    if (m === "create") return "New record";
    if (m === "edit") {
      const name = r ? recordLabel(r, titleKey, "record") : "record";
      return `Edit ${name}`;
    }
    return r ? recordLabel(r, titleKey, "Record") : "Record";
  });

  protected typeIcon(type: string): string {
    const map: Record<string, string> = {
      text: "font-size",
      longText: "file-text",
      number: "number",
      currency: "dollar",
      date: "calendar",
      dateTime: "clock-circle",
      boolean: "check-square",
      select: "down-circle",
      multiSelect: "unordered-list",
      rating: "star",
      reference: "link",
      multiReference: "share-alt",
      url: "global",
    };
    return map[type] || "file";
  }

  protected close(): void {
    if (!this.saving()) {
      this.serverErrors.set({});
      this.ctx.closeDrawer();
    }
  }

  protected submitForm(): void {
    this.dynamicForm()?.submit();
  }

  protected switchToEdit(): void {
    const current = this.state();
    if (current && current.record) {
      this.serverErrors.set({});
      this.ctx.openEdit(current.record, current.references);
    }
  }

  protected cancelEdit(): void {
    const current = this.state();
    if (current?.record) {
      // Return to view mode for the existing record
      this.serverErrors.set({});
      this.ctx.openView(current.record, current.references);
    } else {
      this.close();
    }
  }

  protected async save(values: Record<string, unknown>): Promise<void> {
    const current = this.state();
    if (!current) return;

    this.saving.set(true);
    this.serverErrors.set({});

    try {
      if (current.mode === "edit" && current.record) {
        const res = await this.api.update(
          current.record.id,
          values,
          current.record.version,
        );
        this.notify.info("Record saved.");
        this.ctx.recordsChanged();

        // Switch smoothly back to view mode with updated record
        if (res?.record) {
          const mergedRefs = {
            ...current.references,
            ...(res.references ?? {}),
          };
          this.ctx.openView(res.record, mergedRefs);
        } else {
          this.close();
        }
      } else {
        const collectionId = this.ctx.id();
        if (!collectionId) return;
        await this.api.create(collectionId, values);
        this.webShare.setRecentTrackerId(collectionId);
        this.notify.info("Record added.");
        this.ctx.recordsChanged();
        this.close();
      }
    } catch (err) {
      if (httpStatus(err) === 400) {
        this.serverErrors.set(fieldErrors(err));
      }
      this.notify.error(problemMessage(err, "Could not save the record."));
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const r = this.record();
    if (!r) return;

    const name = recordLabel(r, this.ctx.titleField()?.key, "record");
    const ok = await this.confirm(
      "Delete record?",
      `"${name}" will be permanently deleted.`,
      "Delete",
    );
    if (!ok) return;

    try {
      await this.api.remove(r.id, false);
    } catch (err) {
      if (httpStatus(err) !== 409) {
        return this.notify.error(problemMessage(err));
      }

      const count = problemExtension<number>(err, "referenceCount") ?? 0;
      const again = await this.confirm(
        "This record is referenced elsewhere",
        `${count} other record(s) point to "${name}". Deleting it will clear those references.`,
        "Delete anyway",
      );
      if (!again) return;

      try {
        await this.api.remove(r.id, true);
      } catch (e2) {
        return this.notify.error(problemMessage(e2));
      }
    }

    this.notify.info("Record deleted.");
    this.ctx.recordsChanged();
    this.close();
  }

  private confirm(
    title: string,
    message: string,
    confirmLabel: string,
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const modalRef = this.modal.create<ConfirmDialog, unknown, boolean>({
        nzContent: ConfirmDialog,
        nzData: { title, message, confirmLabel, destructive: true },
        nzFooter: null,
        nzWidth: 420,
      });
      modalRef.afterClose.subscribe((val) => resolve(val === true));
    });
  }
}
