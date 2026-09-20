import { httpResource } from "@angular/common/http";
import { Component, computed, inject, input, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { Router } from "@angular/router";

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
import { DynamicForm } from "./dynamic-form";

@Component({
  selector: "app-record-form-page",
  imports: [
    RecordDrawer,
    DynamicForm,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
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
          <mat-icon aria-hidden="true">error_outline</mat-icon>
          <p>Could not load this record.</p>
          <button mat-stroked-button type="button" (click)="cancel()">
            Close
          </button>
        </div>
      } @else {
        <mat-progress-bar mode="indeterminate" aria-label="Loading form" />
      }
    </app-record-drawer>
  `,
  styles: `
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
    const key = this.ctx.titleField()?.key;
    const d = this.record.value();
    const label = key && d ? d.record.values[key] : null;
    return typeof label === "string" && label ? label : "record";
  });

  /** Cancel returns to the record when editing, otherwise to the table. */
  protected cancel(): void {
    const rid = this.recordId();
    void this.router.navigate(
      rid
        ? ["/collections", this.id(), "records", rid]
        : ["/collections", this.id()],
    );
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
