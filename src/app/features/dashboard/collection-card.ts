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
      class="group relative flex flex-col h-full rounded-2xl border border-[var(--app-outline-variant)] bg-[var(--app-surface)] shadow-xs hover:shadow-md hover:border-[var(--app-primary)] active:scale-[0.985] transition-all duration-200 overflow-hidden text-inherit no-underline cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--app-primary)]"
      [routerLink]="['/collections', collection().id]"
      [attr.aria-label]="'Open ' + collection().name"
    >
      <!-- Top Slim Cover Banner -->
      <div class="relative h-14 w-full overflow-hidden bg-[var(--app-surface-container)]">
        <app-cover-view
          [cover]="collection().cover"
          [collectionId]="collection().id"
          class="block w-full h-full object-cover"
        />
        <div class="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--app-surface)] opacity-30"></div>
      </div>

      <!-- App Icon Squircle -->
      <div
        class="absolute top-6 left-4 w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-[var(--app-surface)] border border-[var(--app-outline-variant)] shadow-sm z-10 group-hover:scale-105 group-hover:shadow-md transition-all duration-200 select-none"
        aria-hidden="true"
      >
        {{ collection().icon }}
      </div>

      <!-- Card Body -->
      <div class="pt-7 pb-3.5 px-4 flex flex-col justify-between flex-1">
        <div>
          <div class="flex items-center gap-1.5 flex-wrap">
            <h3
              class="text-base font-bold text-[var(--app-text)] group-hover:text-[var(--app-primary)] transition-colors line-clamp-1 m-0 tracking-tight"
            >
              {{ collection().name }}
            </h3>
            @if (collection().role && collection().role !== 'owner') {
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--app-primary-container)] text-[var(--app-primary)]">
                <nz-icon [nzType]="collection().role === 'editor' ? 'edit' : 'eye'" class="text-[9px]" />
                {{ collection().role === 'editor' ? 'Editor' : 'Viewer' }}
              </span>
            }
          </div>

          <p class="text-xs text-[var(--app-text-muted)] line-clamp-1 mt-1 m-0 min-h-[16px] leading-relaxed">
            @if (collection().role && collection().role !== 'owner' && collection().ownerDisplayName) {
              <span class="text-[var(--app-primary)] font-medium">Shared by {{ collection().ownerDisplayName }}</span> ·
            }
            {{ collection().description || "No description provided" }}
          </p>
        </div>

        <!-- Footer Stats -->
        <div class="mt-3 pt-2.5 border-t border-[var(--app-outline-variant)] flex items-center justify-between text-xs text-[var(--app-text-muted)]">
          <div class="flex items-center gap-1.5 font-medium">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--app-surface-container)] text-[var(--app-text)] font-semibold">
              <nz-icon nzType="database" class="text-[11px] opacity-75" />
              {{ collection().recordCount }}
            </span>
            <span class="text-[11px]">{{ collection().recordCount === 1 ? "record" : "records" }}</span>
          </div>

          <div class="flex items-center gap-1 text-[11px] text-[var(--app-text-muted)] group-hover:text-[var(--app-primary)] transition-colors">
            <span>{{ collection().fieldCount }} fields</span>
            <nz-icon nzType="right" class="text-[10px] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </a>
  `,
})
export class CollectionCard {
  readonly collection = input.required<CollectionSummary>();
}
