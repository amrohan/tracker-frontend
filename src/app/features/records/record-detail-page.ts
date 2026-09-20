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
import { RecordDetail } from "../../core/models";
import { Notify } from "../../core/notify.service";
import { RecordsApi } from "../../core/records-api.service";
import { ConfirmDialog } from "../../shared/confirm-dialog";
import { FieldValue } from "../../shared/field-value";
import { RecordDrawer } from "../../shared/record-drawer";

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
        <dl>
          @for (f of ctx.fields(); track f.id) {
            <div class="item">
              <dt>{{ f.name }}</dt>
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
        <p class="meta">
          Created {{ dateTime(d.record.createdAt) }} · Updated
          {{ dateTime(d.record.updatedAt) }}
        </p>
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
        <button mat-button type="button" class="danger" (click)="remove()">
          <mat-icon>delete</mat-icon> Delete
        </button>
        <span class="spacer"></span>
        <a
          mat-flat-button
          [routerLink]="['/collections', id(), 'records', recordId(), 'edit']"
        >
          <mat-icon>edit</mat-icon> Edit
        </a>
      </div>
    </app-record-drawer>
  `,
  styles: `
    dl {
      margin: 0;
    }
    .item {
      display: grid;
      grid-template-columns: minmax(110px, 160px) minmax(0, 1fr);
      gap: 16px;
      padding: 12px 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .item:last-child {
      border-bottom: 0;
    }
    dt {
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.5;
      color: var(--mat-sys-on-surface-variant);
    }
    dd {
      margin: 0;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
    .meta {
      margin: 16px 0 0;
      font-size: 0.8125rem;
      color: var(--mat-sys-on-surface-variant);
    }

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
    }

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

    @media (max-width: 560px) {
      .item {
        grid-template-columns: 1fr;
        gap: 2px;
      }
      dt {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .foot a,
      .foot button {
        min-height: 46px;
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

  protected readonly title = computed(() => {
    const key = this.ctx.titleField()?.key;
    const d = this.record.value();
    const label = key && d ? d.record.values[key] : null;
    return typeof label === "string" && label ? label : "Record";
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
