import { httpResource } from "@angular/common/http";
import { Component, computed, inject, input } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { Router, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";

import { CollectionContext } from "../../core/collection-context";
import { formatDateTime } from "../../core/format";
import {
  httpStatus,
  problemExtension,
  problemMessage,
} from "../../core/http-errors";
import { TYPE_ICONS } from "../../core/labels";
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
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
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
                <mat-icon class="field-icon" aria-hidden="true">{{
                  typeIcon(f.type)
                }}</mat-icon>
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
            <mat-icon aria-hidden="true">history</mat-icon> Created
            {{ dateTime(d.record.createdAt) }}
          </span>
          <span class="meta-chip">
            <mat-icon aria-hidden="true">update</mat-icon> Updated
            {{ dateTime(d.record.updatedAt) }}
          </span>
        </div>
      } @else if (record.error()) {
        <div class="state">
          <mat-icon aria-hidden="true">search_off</mat-icon>
          <p>This record was not found. It may have been deleted.</p>
          <button mat-stroked-button type="button" (click)="close()">
            Close
          </button>
        </div>
      } @else {
        <mat-progress-bar mode="indeterminate" aria-label="Loading record" />
      }

      <div drawerFooter class="foot">
        <button
          mat-stroked-button
          type="button"
          class="danger"
          (click)="remove()"
        >
          Delete
        </button>
        <span class="spacer"></span>
        <a
          mat-flat-button
          [routerLink]="['/collections', id(), 'records', recordId(), 'edit']"
        >
          Edit
        </a>
      </div>
    </app-record-drawer>
  `,
  styles: `
    /* ---------------- field list ---------------- */
    .fields {
      margin: 0;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 16px;
      overflow: hidden;
      background: var(--mat-sys-surface-container-low);
    }
    .item {
      display: grid;
      grid-template-columns: minmax(140px, 200px) minmax(0, 1fr);
      gap: 16px;
      align-items: start;
      padding: 14px 16px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .item:last-child {
      border-bottom: 0;
    }
    .item:nth-child(even) {
      background: color-mix(
        in srgb,
        var(--mat-sys-surface-container) 55%,
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
      color: var(--mat-sys-on-surface-variant);
      padding-top: 2px;
    }
    .field-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex: none;
      color: var(--mat-sys-primary);
      opacity: 0.85;
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
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.8125rem;
    }
    .meta-chip mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      opacity: 0.75;
    }

    /* ---------------- error state ---------------- */
    .state {
      display: grid;
      justify-items: center;
      gap: 8px;
      padding: 32px 0;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }
    .state mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
    }

    /* ---------------- footer ---------------- */
    .foot {
      display: flex;
      align-items: center;
      width: 100%;
      gap: 8px;
    }
    .spacer {
      flex: 1;
    }
    .danger {
      color: var(--mat-sys-error);
      border-color: color-mix(in srgb, var(--mat-sys-error) 45%, transparent);
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
      } /* keep the row compact when stacked */
      .foot a,
      .foot button {
        flex: 1;
        min-height: 46px;
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
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);
  private readonly router = inject(Router);

  protected readonly record = httpResource<RecordDetail>(
    () => `/api/records/${this.recordId()}`,
  );
  protected readonly dateTime = formatDateTime;
  protected readonly typeIcon = (type: keyof typeof TYPE_ICONS) =>
    TYPE_ICONS[type];

  protected readonly title = computed(() => {
    const d = this.record.value();
    return d ? recordLabel(d.record, this.ctx.titleField()?.key) : "Record";
  });

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
    return firstValueFrom(
      this.dialog
        .open<ConfirmDialog, unknown, boolean>(ConfirmDialog, {
          data: { title, message, confirmLabel, destructive: true },
        })
        .afterClosed(),
    ).then((v) => v === true);
  }
}
