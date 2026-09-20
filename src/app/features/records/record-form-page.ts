import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { bindCollectionId } from '../../core/collection-context';
import { fieldErrors, httpStatus, problemMessage } from '../../core/http-errors';
import { Notify } from '../../core/notify.service';
import { RecordDetail } from '../../core/models';
import { RecordsApi } from '../../core/records-api.service';
import { DynamicForm } from './dynamic-form';

@Component({
  selector: 'app-record-form-page',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, DynamicForm],
  template: `
    <div class="page-narrow">
      <a mat-button [routerLink]="['/collections', id()]"><mat-icon>arrow_back</mat-icon> {{ ctx.detail.value()?.name ?? 'Back' }}</a>

      @if (ready()) {
        <h1>{{ recordId() ? 'Edit record' : 'New record' }}</h1>
        <div class="surface-card form">
          <app-dynamic-form
            [fields]="ctx.fields()"
            [initial]="record.value()?.record.values ?? null"
            [references]="record.value()?.references ?? {}"
            [serverErrors]="serverErrors()"
            [saving]="saving()"
            [submitLabel]="recordId() ? 'Save changes' : 'Add record'"
            (submitted)="save($event)"
            (cancelled)="back()" />
        </div>
      } @else if (record.error() || ctx.detail.error()) {
        <div class="empty-state"><h3>Could not load this form</h3><a mat-stroked-button routerLink="/">Back to my trackers</a></div>
      } @else {
        <mat-progress-bar mode="indeterminate" />
      }
    </div>
  `,
  styles: `h1 { font-size: 2rem; margin: 8px 0 16px; } .form { padding: 24px; }`,
})
export class RecordFormPage {
  /** Collection id (route :id) and, when editing, the record id (route :recordId). */
  readonly id = input.required<string>();
  readonly recordId = input<string>();

  protected readonly ctx = bindCollectionId(this.id);
  private readonly api = inject(RecordsApi);
  private readonly notify = inject(Notify);
  private readonly router = inject(Router);

  protected readonly record = httpResource<RecordDetail>(() => {
    const r = this.recordId();
    return r ? `/api/records/${r}` : undefined;
  });
  protected readonly saving = signal(false);
  protected readonly serverErrors = signal<Record<string, string[]>>({});
  protected readonly ready = computed(() => this.ctx.detail.hasValue() && (!this.recordId() || this.record.hasValue()));

  protected back(): void {
    void this.router.navigate(['/collections', this.id()]);
  }

  protected async save(values: Record<string, unknown>): Promise<void> {
    this.saving.set(true);
    this.serverErrors.set({});
    try {
      const rid = this.recordId();
      if (rid) await this.api.update(rid, values, this.record.value()!.record.version);
      else await this.api.create(this.id(), values);
      this.notify.info(rid ? 'Record saved.' : 'Record added.');
      this.back();
    } catch (err) {
      if (httpStatus(err) === 400) this.serverErrors.set(fieldErrors(err));
      this.notify.error(problemMessage(err, 'Could not save the record.'));
    } finally {
      this.saving.set(false);
    }
  }
}
