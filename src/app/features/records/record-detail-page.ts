import { httpResource } from "@angular/common/http";
import { Component, computed, inject, input } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzModalService } from "ng-zorro-antd/modal";
import { NzSpinModule } from "ng-zorro-antd/spin";

import { CollectionContext } from "../../core/collection-context";
import { formatDateTime } from "../../core/format";
import {
  httpStatus,
  problemExtension,
  problemMessage,
} from "../../core/http-errors";
import { RecordDetail } from "../../core/models";
import { Notify } from "../../core/notify.service";
import { RecordsApi } from "../../core/records-api.service";
import { ConfirmDialog } from "../../shared/confirm-dialog";
import { FieldValue } from "../../shared/field-value";
import { RecordDrawer } from "../../shared/record-drawer";
import { recordLabel } from "../collection/record-list.utils";

@Component({
  selector: "app-record-detail-page",
  imports: [
    RouterLink,
    NzButtonModule,
    NzIconModule,
    NzSpinModule,
    FieldValue,
    RecordDrawer,
  ],
  template: `
    <app-record-drawer
      [heading]="title()"
      [eyebrow]="ctx.detail.value()?.name ?? ''"
      [eyebrowIcon]="ctx.detail.value()?.icon ?? ''"
      [footer]="!!record.value()"
      (closed)="close()"
    >
      @if (record.value(); as d) {
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
                  [value]="d.record.values[f.key]"
                  [references]="d.references"
                />
              </dd>
            </div>
          }
        </dl>

        <div class="meta">
          <span class="meta-chip">
            <nz-icon nzType="history" aria-hidden="true" /> Created
            {{ dateTime(d.record.createdAt) }}
          </span>
          <span class="meta-chip">
            <nz-icon nzType="clock-circle" aria-hidden="true" /> Updated
            {{ dateTime(d.record.updatedAt) }}
          </span>
        </div>
      } @else if (record.error()) {
        <div class="state">
          <nz-icon nzType="frown" class="state-icon" aria-hidden="true" />
          <p>This record was not found. It may have been deleted.</p>
          <button nz-button nzType="default" type="button" (click)="close()">
            Close
          </button>
        </div>
      } @else {
        <div class="loading-state">
          <nz-spin nzSimple />
        </div>
      }

      <div drawerFooter class="flex justify-between">
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
        <a [routerLink]="['/collections', id(), 'records', recordId(), 'edit']">
          <button nz-button nzType="primary">Edit</button>
        </a>
      </div>
    </app-record-drawer>
  `,
  styles: `
    /* ---------------- field list ---------------- */
    .fields {
      margin: 0;
      border: 1px solid var(--app-outline-variant);
      border-radius: 16px;
      overflow: hidden;
      background: var(--app-surface-container-low);
    }
    .item {
      display: grid;
      grid-template-columns: minmax(140px, 200px) minmax(0, 1fr);
      gap: 16px;
      align-items: start;
      padding: 14px 16px;
      border-bottom: 1px solid var(--app-outline-variant);
    }
    .item:last-child {
      border-bottom: 0;
    }
    .item:nth-child(even) {
      background: color-mix(
        in srgb,
        var(--app-surface-container) 55%,
        transparent
      );
    }

    dt {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.4;
      color: var(--app-text-muted);
      padding-top: 2px;
    }
    .field-icon {
      font-size: 16px;
      color: var(--app-primary);
      opacity: 0.85;
      flex: none;
    }

    dd {
      margin: 0;
      line-height: 1.5;
      font-size: 0.9375rem;
      overflow-wrap: anywhere;
    }

    /* ---------------- meta chips ---------------- */
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }
    .meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--app-surface-container);
      color: var(--app-text-muted);
      font-size: 0.8125rem;
    }

    /* ---------------- error state ---------------- */
    .state {
      display: grid;
      justify-items: center;
      gap: 12px;
      padding: 32px 0;
      text-align: center;
      color: var(--app-text-muted);
    }
    .state-icon {
      font-size: 40px;
      color: var(--app-error);
    }
    .loading-state {
      display: flex;
      justify-content: center;
      padding: 48px 0;
    }

    /* ---------------- phones ---------------- */
    @media (max-width: 560px) {
      .item {
        grid-template-columns: 1fr;
        gap: 4px;
        padding: 12px 14px;
      }
      dt {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .field-icon {
        display: none;
      }
      .foot a,
      .foot button {
        flex: 1;
        min-height: 44px;
        justify-content: center;
      }
    }
  `,
})
export class RecordDetailPage {
  readonly id = input.required<string>();
  readonly recordId = input.required<string>();

  protected readonly ctx = inject(CollectionContext);
  private readonly api = inject(RecordsApi);
  private readonly modal = inject(NzModalService);
  private readonly notify = inject(Notify);
  private readonly router = inject(Router);

  protected readonly record = httpResource<RecordDetail>(
    () => `/api/records/${this.recordId()}`,
  );
  protected readonly dateTime = formatDateTime;

  protected readonly title = computed(() => {
    const d = this.record.value();
    return d ? recordLabel(d.record, this.ctx.titleField()?.key) : "Record";
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
    void this.router.navigate(["/collections", this.id()]);
  }

  protected async remove(): Promise<void> {
    const name = this.title();
    if (
      !(await this.confirm(
        "Delete record?",
        `“${name}” will be permanently deleted.`,
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
      const again = await this.confirm(
        "This record is referenced elsewhere",
        `${n} other record(s) point to “${name}”. Deleting it will clear those references.`,
        "Delete anyway",
      );
      if (!again) return;
      try {
        await this.api.remove(this.recordId(), true);
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
