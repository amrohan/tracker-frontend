import { Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NzIconModule } from "ng-zorro-antd/icon";

import { CollectionSummary } from "../../core/models";
import { CoverView } from "../../shared/cover-view";

@Component({
  selector: "app-collection-card",
  imports: [RouterLink, CoverView, NzIconModule],
  template: `
    <a
      class="tracker-card group"
      [routerLink]="['/collections', collection().id]"
      [attr.aria-label]="'Open ' + collection().name"
    >
      <!-- Top Cover Banner -->
      <div class="card-cover-wrap">
        <app-cover-view
          [cover]="collection().cover"
          [collectionId]="collection().id"
          class="card-cover-view"
        />
        <div class="card-cover-overlay"></div>
      </div>

      <!-- Tracker Icon Squircle -->
      <div class="card-icon-squircle" aria-hidden="true">
        {{ collection().icon }}
      </div>

      <!-- Card Body Content -->
      <div class="card-body">
        <div class="card-title-group">
          <div class="card-title-row">
            <h3 class="card-title">
              {{ collection().name }}
            </h3>
            @if (collection().role && collection().role !== 'owner') {
              <span class="role-tag">
                <nz-icon
                  [nzType]="collection().role === 'editor' ? 'edit' : 'eye'"
                  class="role-icon"
                />
                {{ collection().role === 'editor' ? 'Editor' : 'Viewer' }}
              </span>
            }
          </div>

          <p class="card-desc">
            @if (collection().role && collection().role !== 'owner' && collection().ownerDisplayName) {
              <span class="owner-pill">Shared by {{ collection().ownerDisplayName }}</span> ·
            }
            {{ collection().description || "No description provided" }}
          </p>
        </div>

        <!-- Card Footer -->
        <div class="card-footer">
          <div class="footer-stats">
            <span class="stat-pill">
              <nz-icon nzType="database" class="stat-icon" />
              <span class="stat-value tabular-nums">{{ collection().recordCount }}</span>
              <span class="stat-label">{{ collection().recordCount === 1 ? "record" : "records" }}</span>
            </span>
          </div>

          <div class="footer-fields">
            <span>{{ collection().fieldCount }} fields</span>
            <nz-icon nzType="arrow-right" class="arrow-icon" />
          </div>
        </div>
      </div>
    </a>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .tracker-card {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
      border-radius: var(--radius-xl);
      border: 1px solid var(--app-outline);
      background: var(--app-surface);
      box-shadow: var(--app-shadow-xs);
      overflow: hidden;
      text-decoration: none;
      color: inherit;
      cursor: pointer;
      outline: none;
      transition:
        transform var(--transition-fast),
        border-color var(--transition-fast),
        box-shadow var(--transition-fast);

      &:hover {
        transform: translateY(-2px);
        border-color: var(--app-primary);
        box-shadow: var(--app-shadow-md);

        .card-title {
          color: var(--app-primary);
        }

        .arrow-icon {
          transform: translateX(3px);
          opacity: 1;
        }

        .card-icon-squircle {
          transform: scale(1.05);
          box-shadow: var(--app-shadow-sm);
        }
      }

      &:active {
        transform: translateY(0);
      }

      &:focus-visible {
        border-color: var(--app-primary);
        box-shadow: 0 0 0 2px var(--app-primary-container);
      }
    }

    .card-cover-wrap {
      position: relative;
      height: 64px;
      width: 100%;
      overflow: hidden;
      background: var(--app-surface-container);
      border-bottom: 1px solid var(--app-outline-variant);
    }

    .card-cover-view {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .card-cover-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.05));
    }

    .card-icon-squircle {
      position: absolute;
      top: 36px;
      left: 16px;
      width: 44px;
      height: 44px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.45rem;
      background: var(--app-surface);
      border: 1px solid var(--app-outline);
      box-shadow: var(--app-shadow-xs);
      z-index: 10;
      user-select: none;
      transition:
        transform var(--transition-fast),
        box-shadow var(--transition-fast);
    }

    .card-body {
      padding: 24px 16px 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      flex: 1;
    }

    .card-title-group {
      margin-bottom: 12px;
    }

    .card-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .card-title {
      font-size: 0.96875rem;
      font-weight: 600;
      letter-spacing: -0.015em;
      color: var(--app-text);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color var(--transition-fast);
    }

    .role-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 7px;
      border-radius: var(--radius-full);
      font-size: 0.6875rem;
      font-weight: 600;
      background: var(--app-primary-container);
      color: var(--app-on-primary-container);
    }

    .role-icon {
      font-size: 10px;
    }

    .card-desc {
      font-size: 0.8125rem;
      color: var(--app-text-secondary);
      margin: 4px 0 0;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 2.4em;
    }

    .owner-pill {
      color: var(--app-primary);
      font-weight: 500;
    }

    .card-footer {
      padding-top: 10px;
      border-top: 1px solid var(--app-outline-variant);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--app-text-muted);
    }

    .footer-stats {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .stat-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: var(--radius-sm);
      background: var(--app-surface-container-high);
      color: var(--app-text);
      font-weight: 500;
    }

    .stat-icon {
      font-size: 11px;
      opacity: 0.75;
    }

    .stat-value {
      font-weight: 600;
    }

    .stat-label {
      font-size: 0.6875rem;
      color: var(--app-text-muted);
    }

    .footer-fields {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
    }

    .arrow-icon {
      font-size: 11px;
      opacity: 0.5;
      transition:
        transform var(--transition-fast),
        opacity var(--transition-fast);
    }
  `,
})
export class CollectionCard {
  readonly collection = input.required<CollectionSummary>();
}
