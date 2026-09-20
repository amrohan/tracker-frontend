import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { bindCollectionId } from '../../core/collection-context';
import { formatDateTime } from '../../core/format';
import { httpStatus, problemExtension, problemMessage } from '../../core/http-errors';
import { RecordDetail } from '../../core/models';
import { Notify } from '../../core/notify.service';
import { RecordsApi } from '../../core/records-api.service';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { FieldValue } from '../../shared/field-value';

@Component({
  selector: 'app-record-detail-page',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, FieldValue],
  template: `
    <div class="page-narrow">
      <a mat-button [routerLink]="['/collections', id()]"><mat-icon>arrow_back</mat-icon> {{ ctx.detail.value()?.name ?? 'Back' }}</a>

      @if (record.value(); as d) {
        <div class="row head">
          <h1>{{ title() }}</h1>
          <span class="spacer"></span>
          <a mat-stroked-button [routerLink]="['/collections', id(), 'records', recordId(), 'edit']"><mat-icon>edit</mat-icon> Edit</a>
          <button mat-button class="danger" (click)="remove()"><mat-icon>delete</mat-icon> Delete</button>
        </div>

        <dl class="surface-card">
          @for (f of ctx.fields(); track f.id) {
            <div class="item">
              <dt>{{ f.name }}</dt>
              <dd><app-field-value [field]="f" [value]="d.record.values[f.key]" [references]="d.references" /></dd>
            </div>
          }
        </dl>
        <p class="muted meta">Added {{ dateTime(d.record.createdAt) }} · Updated {{ dateTime(d.record.updatedAt) }}</p>
      } @else if (record.error()) {
        <div class="empty-state"><h3>Record not found</h3><a mat-stroked-button [routerLink]="['/collections', id()]">Back</a></div>
      } @else {
        <mat-progress-bar mode="indeterminate" />
      }
    </div>
  `,
  styles: `
    h1 { font-size: 2rem; overflow-wrap: anywhere; }
    .head { margin: 8px 0 16px; }
    dl { margin: 0; display: grid; gap: 4px; }
    .item { display: grid; grid-template-columns: minmax(120px, 200px) 1fr; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .item:last-child { border-bottom: 0; }
    dt { color: var(--mat-sys-on-surface-variant); font-weight: 600; }
    dd { margin: 0; overflow-wrap: anywhere; }
    .danger { color: var(--mat-sys-error); }
    .meta { font-size: .85rem; margin-top: 12px; }
    @media (max-width: 560px) { .item { grid-template-columns: 1fr; gap: 2px; } }
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

  protected readonly record = httpResource<RecordDetail>(() => `/api/records/${this.recordId()}`);
  protected readonly dateTime = formatDateTime;

  protected readonly title = computed(() => {
    const key = this.ctx.titleField()?.key;
    const d = this.record.value();
    const label = key && d ? d.record.values[key] : null;
    return typeof label === 'string' && label ? label : 'Record';
  });

  private confirm(title: string, message: string, confirmLabel: string): Promise<boolean> {
    return firstValueFrom(this.dialog.open<ConfirmDialog, unknown, boolean>(ConfirmDialog, {
      data: { title, message, confirmLabel, destructive: true },
    }).afterClosed()).then((v) => v === true);
  }

  protected async remove(): Promise<void> {
    if (!(await this.confirm('Delete record?', 'This record will be permanently deleted.', 'Delete'))) return;
    try {
      await this.api.remove(this.recordId(), false);
    } catch (err) {
      if (httpStatus(err) !== 409) return this.notify.error(problemMessage(err));
      const n = problemExtension<number>(err, 'referenceCount') ?? 0;
      if (!(await this.confirm('This record is referenced elsewhere',
        `${n} other record(s) point to it. Deleting it will clear those references.`, 'Delete anyway'))) return;
      try { await this.api.remove(this.recordId(), true); } catch (e2) { return this.notify.error(problemMessage(e2)); }
    }
    this.notify.info('Record deleted.');
    await this.router.navigate(['/collections', this.id()]);
  }
}
