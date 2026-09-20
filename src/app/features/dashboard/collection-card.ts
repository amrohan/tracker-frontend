import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CollectionSummary } from '../../core/models';
import { CoverView } from '../../shared/cover-view';

@Component({
  selector: 'app-collection-card',
  imports: [RouterLink, CoverView],
  template: `
    <a class="card" [routerLink]="['/collections', collection().id]">
      <div class="cover"><app-cover-view [cover]="collection().cover" [collectionId]="collection().id" /></div>
      <div class="icon" aria-hidden="true">{{ collection().icon }}</div>
      <div class="body">
        <h3>{{ collection().name }}</h3>
        @if (collection().description) { <p class="muted desc">{{ collection().description }}</p> }
        <p class="stats">
          <strong>{{ collection().recordCount }}</strong> {{ collection().recordCount === 1 ? 'record' : 'records' }}
          <span class="dot">·</span> {{ collection().fieldCount }} {{ collection().fieldCount === 1 ? 'field' : 'fields' }}
        </p>
      </div>
    </a>
  `,
  styles: `
    .card { display: block; position: relative; text-decoration: none; color: inherit; border-radius: 20px; overflow: hidden;
            background: var(--mat-sys-surface-container-low); border: 1px solid var(--mat-sys-outline-variant);
            transition: transform .18s ease, box-shadow .18s ease; height: 100%; }
    .card:hover { transform: translateY(-3px); box-shadow: var(--mat-sys-level3); }
    .cover { height: 112px; }
    .icon { position: absolute; top: 80px; left: 18px; width: 54px; height: 54px; border-radius: 16px; display: grid; place-items: center;
            font-size: 28px; background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); box-shadow: var(--mat-sys-level1); }
    .body { padding: 36px 18px 18px; }
    h3 { font-size: 1.25rem; }
    .desc { margin: 4px 0 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: .92rem; }
    .stats { margin: 12px 0 0; font-size: .9rem; color: var(--mat-sys-on-surface-variant); }
    .dot { margin: 0 4px; }
    @media (prefers-reduced-motion: reduce) { .card:hover { transform: none; } }
  `,
})
export class CollectionCard {
  readonly collection = input.required<CollectionSummary>();
}
