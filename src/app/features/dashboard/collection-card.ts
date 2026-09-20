import { Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

import { CollectionSummary } from "../../core/models";
import { CoverView } from "../../shared/cover-view";

@Component({
  selector: "app-collection-card",
  imports: [RouterLink, CoverView],

  template: `
    <a
      class="card"
      [routerLink]="['/collections', collection().id]"
      [attr.aria-label]="'Open ' + collection().name"
    >
      <!-- ================= COVER ================= -->
      <div class="cover">
        <app-cover-view
          [cover]="collection().cover"
          [collectionId]="collection().id"
        />
      </div>

      <!-- ================= ICON ================= -->
      <div class="icon" aria-hidden="true">
        {{ collection().icon }}
      </div>

      <!-- ================= CONTENT ================= -->
      <div class="body">
        <h3>
          {{ collection().name }}
        </h3>

        @if (collection().description) {
          <p class="desc">
            {{ collection().description }}
          </p>
        }

        <div class="stats">
          <span>
            <strong>
              {{ collection().recordCount }}
            </strong>

            {{ collection().recordCount === 1 ? "record" : "records" }}
          </span>

          <span class="dot" aria-hidden="true"> · </span>

          <span>
            {{ collection().fieldCount }}

            {{ collection().fieldCount === 1 ? "field" : "fields" }}
          </span>
        </div>
      </div>
    </a>
  `,

  styles: `
    /* =========================================================
       CARD
       ========================================================= */

    .card {
      position: relative;

      display: block;

      height: 100%;

      overflow: hidden;

      color: inherit;

      text-decoration: none;

      border-radius: 20px;

      background: var(--mat-sys-surface-container-low);

      border: 1px solid var(--mat-sys-outline-variant);

      transition:
        transform 180ms ease,
        box-shadow 180ms ease,
        border-color 180ms ease;

      /*
       * Makes the entire card keyboard accessible
       * while preserving the visual design.
       */
      outline: none;
    }

    /* =========================================================
       HOVER / FOCUS
       ========================================================= */

    .card:hover {
      transform: translateY(-3px);

      box-shadow: var(--mat-sys-level3);
    }

    .card:focus-visible {
      outline: 3px solid var(--mat-sys-primary);

      outline-offset: 3px;
    }

    /* =========================================================
       COVER
       ========================================================= */

    .cover {
      position: relative;

      height: 112px;

      overflow: hidden;

      background: var(--mat-sys-surface-container);
    }

    /*
     * Prevent the cover from affecting the card layout.
     */
    .cover app-cover-view {
      display: block;

      width: 100%;
      height: 100%;
    }

    /* =========================================================
       COLLECTION ICON
       ========================================================= */

    .icon {
      position: absolute;

      top: 80px;
      left: 18px;

      width: 54px;
      height: 54px;

      display: grid;

      place-items: center;

      border-radius: 16px;

      font-size: 28px;

      line-height: 1;

      background: var(--mat-sys-surface);

      border: 1px solid var(--mat-sys-outline-variant);

      box-shadow: var(--mat-sys-level1);

      z-index: 2;
    }

    /* =========================================================
       BODY
       ========================================================= */

    .body {
      min-width: 0;

      padding: 36px 18px 18px;
    }

    /* =========================================================
       TITLE
       ========================================================= */

    h3 {
      min-width: 0;

      margin: 0;

      font-size: clamp(1.1rem, 1rem + 0.35vw, 1.25rem);

      line-height: 1.25;

      font-weight: 650;

      letter-spacing: -0.01em;

      overflow-wrap: anywhere;

      word-break: break-word;

      display: -webkit-box;

      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;

      overflow: hidden;
    }

    /* =========================================================
       DESCRIPTION
       ========================================================= */

    .desc {
      min-width: 0;

      margin: 6px 0 0;

      font-size: 0.9rem;

      line-height: 1.45;

      color: var(--mat-sys-on-surface-variant);

      display: -webkit-box;

      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;

      overflow: hidden;

      overflow-wrap: anywhere;
    }

    /* =========================================================
       STATS
       ========================================================= */

    .stats {
      display: flex;

      align-items: center;

      flex-wrap: wrap;

      gap: 0;

      margin: 14px 0 0;

      font-size: 0.875rem;

      line-height: 1.4;

      color: var(--mat-sys-on-surface-variant);
    }

    .stats strong {
      color: var(--mat-sys-on-surface);

      font-weight: 650;
    }

    .dot {
      margin: 0 6px;

      opacity: 0.65;
    }

    /* =========================================================
       TABLET
       ========================================================= */

    @media (max-width: 768px) {
      .card {
        border-radius: 18px;
      }

      .cover {
        height: 108px;
      }

      .icon {
        top: 76px;
        left: 16px;

        width: 52px;
        height: 52px;

        border-radius: 15px;

        font-size: 26px;
      }

      .body {
        padding: 34px 16px 16px;
      }
    }

    /* =========================================================
       MOBILE
       ========================================================= */

    @media (max-width: 640px) {
      .card {
        border-radius: 16px;
      }

      .cover {
        height: 100px;
      }

      .icon {
        top: 68px;
        left: 14px;

        width: 50px;
        height: 50px;

        border-radius: 14px;

        font-size: 24px;
      }

      .body {
        padding: 32px 14px 15px;
      }

      h3 {
        font-size: 1.1rem;
      }

      .desc {
        font-size: 0.875rem;
      }

      .stats {
        margin-top: 12px;

        font-size: 0.825rem;
      }
    }

    /* =========================================================
       VERY SMALL PHONES
       ========================================================= */

    @media (max-width: 380px) {
      .cover {
        height: 92px;
      }

      .icon {
        top: 62px;

        width: 46px;
        height: 46px;

        font-size: 22px;
      }

      .body {
        padding: 30px 13px 14px;
      }

      h3 {
        font-size: 1rem;
      }

      .desc {
        font-size: 0.825rem;
      }
    }

    /* =========================================================
       REDUCED MOTION
       ========================================================= */

    @media (prefers-reduced-motion: reduce) {
      .card {
        transition: none;
      }

      .card:hover {
        transform: none;

        box-shadow: none;
      }
    }
  `,
})
export class CollectionCard {
  readonly collection = input.required<CollectionSummary>();
}
