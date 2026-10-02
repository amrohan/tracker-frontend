import { httpResource } from "@angular/common/http";
import { Component, computed, inject, input, signal } from "@angular/core";
import { Router } from "@angular/router";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzSpinModule } from "ng-zorro-antd/spin";

import { CollectionContext } from "../../core/collection-context";
import {
  fieldErrors,
  httpStatus,
  problemMessage,
} from "../../core/http-errors";
import { RecordDetail } from "../../core/models";
import { Notify } from "../../core/notify.service";
import { RecordsApi } from "../../core/records-api.service";
import { RecordDrawer } from "../../shared/record-drawer";
import { recordLabel } from "../collection/record-list.utils";
import { DynamicForm } from "./dynamic-form";
import { NzDateAdapter } from "ng-zorro-antd/core/time";

@Component({
  selector: "app-record-form-page",
  imports: [
    RecordDrawer,
    DynamicForm,
    NzButtonModule,
    NzIconModule,
    NzSpinModule,
  ],
  template: `
    <app-record-drawer
      [heading]="recordId() ? 'Edit ' + recordTitle() : 'New record'"
      [eyebrow]="ctx.detail.value()?.name ?? ''"
      [eyebrowIcon]="ctx.detail.value()?.icon ?? ''"
      [busy]="saving()"
      [closeOnBackdrop]="false"
      (closed)="cancel()"
    >
      @if (ready()) {
        <app-dynamic-form
          [fields]="ctx.fields()"
          [initial]="record.value()?.record.values ?? null"
          [references]="record.value()?.references ?? {}"
          [serverErrors]="serverErrors()"
          [saving]="saving()"
          [submitLabel]="recordId() ? 'Save changes' : 'Add record'"
          (submitted)="save($event)"
          (cancelled)="cancel()"
        />
      } @else if (record.error()) {
        <div class="state">
          <nz-icon
            nzType="exclamation-circle"
            class="state-icon"
            aria-hidden="true"
          />
          <p>Could not load this record. It may have been deleted.</p>
          <button nz-button nzType="default" type="button" (click)="cancel()">
            Close
          </button>
        </div>
      } @else {
        <div class="loading-state">
          <nz-spin nzSimple />
        </div>
      }
    </app-record-drawer>
  `,
  styles: `
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
  `,
})
export class RecordFormPage {
  /** Collection id (route :id) and, when editing, the record id (route :recordId). */
  readonly id = input.required<string>();
  readonly recordId = input<string>();

  protected readonly ctx = inject(CollectionContext);
  private readonly api = inject(RecordsApi);
  private readonly notify = inject(Notify);
  private readonly router = inject(Router);

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

  protected readonly recordTitle = computed(() => {
    const d = this.record.value();
    return d
      ? recordLabel(d.record, this.ctx.titleField()?.key, "record")
      : "record";
  });

  /** Cancel always returns to the table behind the drawer. */
  protected cancel(): void {
    void this.router.navigate(["/collections", this.id()]);
  }

  protected async save(values: Record<string, unknown>): Promise<void> {
    this.saving.set(true);
    this.serverErrors.set({});
    try {
      const rid = this.recordId();
      if (rid)
        await this.api.update(rid, values, this.record.value()!.record.version);
      else await this.api.create(this.id(), values);

      this.notify.info(rid ? "Record saved." : "Record added.");
      this.ctx.recordsChanged(); // the table behind the drawer refreshes
      this.cancel();
    } catch (err) {
      if (httpStatus(err) === 400) this.serverErrors.set(fieldErrors(err));
      this.notify.error(problemMessage(err, "Could not save the record."));
    } finally {
      this.saving.set(false);
    }
  }
}
