import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CollectionsApi } from '../../core/collections-api.service';
import { bindCollectionId } from '../../core/collection-context';
import { httpStatus, problemMessage } from '../../core/http-errors';
import { Cover, CoverSelection } from '../../core/models';
import { Notify } from '../../core/notify.service';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { CoverPickerDialog } from '../../shared/cover-picker-dialog';
import { CoverView } from '../../shared/cover-view';

@Component({
  selector: 'app-collection-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatMenuModule, CoverView],
  template: `
    @if (ctx.detail.value(); as c) {
      <header>
        <div class="hero"><app-cover-view [cover]="c.cover" [collectionId]="c.id" /></div>
        <div class="page head">
          <div class="icon" aria-hidden="true">{{ c.icon }}</div>
          <div class="titles">
            <h1>{{ c.name }}</h1>
            @if (c.description) { <p class="muted">{{ c.description }}</p> }
          </div>
          <span class="spacer"></span>
          <a mat-flat-button [routerLink]="['/collections', c.id, 'records', 'new']" [disabled]="c.fields.length === 0"><mat-icon>add</mat-icon> Add record</a>
          <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Collection options"><mat-icon>more_vert</mat-icon></button>
          <mat-menu #menu="matMenu">
            <button mat-menu-item (click)="changeCover()"><mat-icon>image</mat-icon> Change cover</button>
            <a mat-menu-item [routerLink]="['/collections', c.id, 'edit']"><mat-icon>tune</mat-icon> Edit fields &amp; details</a>
            <button mat-menu-item (click)="remove()"><mat-icon>delete</mat-icon> Delete tracker</button>
          </mat-menu>
        </div>
        <nav class="page tabs" aria-label="Views">
          <a mat-button [routerLink]="['/collections', c.id]" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"><mat-icon>table_rows</mat-icon> Table</a>
          <a mat-button [routerLink]="['/collections', c.id, 'summary']" routerLinkActive="active"><mat-icon>insights</mat-icon> Summary</a>
        </nav>
      </header>

      @if (c.fields.length === 0) {
        <div class="page">
          <div class="empty-state">
            <span class="material-icons">tune</span>
            <h3>Add your first field</h3>
            <p>Fields define what you record — a name, a date, a rating…</p>
            <a mat-flat-button [routerLink]="['/collections', c.id, 'edit']">Add fields</a>
          </div>
        </div>
      } @else {
        <router-outlet />
      }
    } @else if (ctx.detail.error()) {
      <div class="page">
        <div class="empty-state">
          <span class="material-icons">search_off</span>
          <h3>{{ notFound() ? 'Tracker not found' : 'Could not load this tracker' }}</h3>
          <a mat-stroked-button routerLink="/">Back to my trackers</a>
        </div>
      </div>
    }
  `,
  styles: `
    .hero { height: 168px; }
    .head { display: flex; align-items: flex-end; gap: 16px; padding-top: 0; padding-bottom: 8px; margin-top: -36px; position: relative; }
    .icon { width: 76px; height: 76px; border-radius: 22px; display: grid; place-items: center; font-size: 40px; background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); box-shadow: var(--mat-sys-level2); flex: none; }
    .titles { min-width: 0; padding-bottom: 4px; }
    h1 { font-size: 2.2rem; letter-spacing: -.02em; overflow-wrap: anywhere; }
    .titles p { margin: 2px 0 0; }
    .tabs { padding-top: 0; padding-bottom: 0; display: flex; gap: 4px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .tabs a { border-radius: 999px 999px 0 0; }
    .tabs a.active { background: var(--mat-sys-secondary-container); }
  `,
})
export class CollectionPage {
  readonly id = input.required<string>();
  protected readonly ctx = bindCollectionId(this.id);

  private readonly api = inject(CollectionsApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);
  private readonly router = inject(Router);

  protected notFound(): boolean { return httpStatus(this.ctx.detail.error()) === 404; }

  protected async changeCover(): Promise<void> {
    const c = this.ctx.detail.value();
    if (!c) return;
    const selection = await firstValueFrom(this.dialog
      .open<CoverPickerDialog, { cover: Cover; collectionId: string | null }, CoverSelection>(CoverPickerDialog, {
        data: { cover: c.cover, collectionId: c.id }, width: '560px',
      }).afterClosed());
    if (!selection) return;
    try {
      await this.api.applyCover(c.id, selection);
      this.ctx.detail.reload();
      this.notify.info('Cover updated.');
    } catch (err) {
      this.notify.error(problemMessage(err, 'Could not update the cover.'));
    }
  }

  protected async remove(): Promise<void> {
    const c = this.ctx.detail.value();
    if (!c) return;
    const ok = await firstValueFrom(this.dialog.open<ConfirmDialog, unknown, boolean>(ConfirmDialog, {
      data: {
        title: `Delete “${c.name}”?`,
        message: `This permanently deletes the tracker and all ${c.recordCount} of its records. This cannot be undone.`,
        confirmLabel: 'Delete tracker', destructive: true,
      },
    }).afterClosed());
    if (!ok) return;
    try {
      await this.api.remove(c.id);
      this.notify.info('Tracker deleted.');
      await this.router.navigateByUrl('/');
    } catch (err) {
      this.notify.error(problemMessage(err, 'Could not delete the tracker.'));
    }
  }
}
