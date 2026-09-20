import { httpResource } from '@angular/common/http';
import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { CollectionSummary } from '../../core/models';
import { CollectionCard } from './collection-card';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatButtonToggleModule, MatProgressBarModule, CollectionCard],
  template: `
    <div class="page">
      <div class="row head">
        <div>
          <h1>My trackers</h1>
          <p class="muted">Anything you want to remember, in one place.</p>
        </div>
        <span class="spacer"></span>
        <a mat-flat-button routerLink="/collections/new"><mat-icon>add</mat-icon> New tracker</a>
      </div>

      @if (collections.isLoading() && !collections.hasValue()) { <mat-progress-bar mode="indeterminate" /> }

      @if (collections.error()) {
        <div class="empty-state">
          <span class="material-icons">cloud_off</span>
          <h3>Could not load your trackers</h3>
          <button mat-stroked-button (click)="collections.reload()">Try again</button>
        </div>
      } @else if (all().length === 0 && collections.hasValue()) {
        <div class="empty-state">
          <span class="material-icons">library_add</span>
          <h3>Create your first tracker</h3>
          <p>A tracker can hold anything — people, movies, expenses, trips. You choose the fields.</p>
          <a mat-flat-button routerLink="/collections/new">Create a tracker</a>
        </div>
      } @else if (all().length > 0) {
        <div class="row tools">
          <mat-form-field appearance="outline" class="search" subscriptSizing="dynamic">
            <mat-label>Search trackers</mat-label>
            <input matInput [value]="query()" (input)="onQuery($event)" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <mat-button-toggle-group [value]="sort()" (change)="sort.set($event.value)" aria-label="Sort trackers">
            <mat-button-toggle value="recent">Recent</mat-button-toggle>
            <mat-button-toggle value="name">Name</mat-button-toggle>
          </mat-button-toggle-group>
        </div>

        @if (visible().length === 0) {
          <p class="muted">No trackers match “{{ query() }}”.</p>
        }
        <div class="grid">
          @for (c of visible(); track c.id) { <app-collection-card [collection]="c" /> }
        </div>
      }
    </div>
  `,
  styles: `
    .head { margin-bottom: 20px; }
    h1 { font-size: 2.4rem; letter-spacing: -.02em; }
    .head p { margin: 4px 0 0; }
    .tools { margin: 8px 0 20px; }
    .search { width: min(360px, 100%); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
  `,
})
export class DashboardPage {
  protected readonly collections = httpResource<CollectionSummary[]>(() => '/api/collections');
  protected readonly query = signal('');
  protected readonly sort = signal<'recent' | 'name'>('recent');

  protected readonly all = computed(() => this.collections.value() ?? []);
  protected readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.all().filter((c) => !q || c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q));
    if (this.sort() === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    const stamp = (c: CollectionSummary) => Date.parse(c.lastActivityAt ?? c.updatedAt);
    return [...list].sort((a, b) => stamp(b) - stamp(a));
  });

  protected onQuery(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
  }
}
