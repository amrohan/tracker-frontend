import { httpResource } from "@angular/common/http";
import { Component, computed, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzRadioModule } from "ng-zorro-antd/radio";
import { NzSpinModule } from "ng-zorro-antd/spin";

import { CollectionSummary } from "../../core/models";
import { CollectionCard } from "./collection-card";

@Component({
  selector: "app-dashboard-page",
  imports: [
    RouterLink,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzRadioModule,
    NzSpinModule,
    CollectionCard,
  ],
  template: `
    <div
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-12"
    >
      <!-- ================= APP QUICK STATS STRIP ================= -->
      @if (all().length > 0) {
        <section
          class="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4"
          aria-label="Overview statistics"
        >
          <div
            class="p-3 sm:p-3.5 rounded-xl border border-(--app-outline-variant) bg-(--app-surface) shadow-2xs flex items-center gap-3"
          >
            <div
              class="w-9 h-9 rounded-lg bg-(--app-primary-container) text-(--app-primary) flex items-center justify-center text-lg flex-none"
            >
              <nz-icon nzType="appstore" />
            </div>
            <div class="min-w-0">
              <span
                class="block text-[11px] font-semibold uppercase tracking-wider text-(--app-text-muted) truncate"
                >Collections</span
              >
              <span
                class="block text-base sm:text-lg font-bold text-(--app-text) leading-tight"
                >{{ all().length }}</span
              >
            </div>
          </div>

          <div
            class="p-3 sm:p-3.5 rounded-xl border border-(--app-outline-variant) bg-(--app-surface) shadow-2xs flex items-center gap-3"
          >
            <div
              class="w-9 h-9 rounded-lg bg-(--app-surface-container-high) text-(--app-text) flex items-center justify-center text-lg flex-none"
            >
              <nz-icon nzType="database" />
            </div>
            <div class="min-w-0">
              <span
                class="block text-[11px] font-semibold uppercase tracking-wider text-(--app-text-muted) truncate"
                >Total Records</span
              >
              <span
                class="block text-base sm:text-lg font-bold text-(--app-text) leading-tight"
                >{{ totalRecords() }}</span
              >
            </div>
          </div>

          <div
            class="col-span-2 sm:col-span-1 p-3 sm:p-3.5 rounded-xl border border-(--app-outline-variant) bg-(--app-surface) shadow-2xs flex items-center gap-3"
          >
            <div
              class="w-9 h-9 rounded-lg bg-(--app-surface-container) text-(--app-text-muted) flex items-center justify-center text-lg flex-none"
            >
              <nz-icon nzType="clock-circle" />
            </div>
            <div class="min-w-0">
              <span
                class="block text-[11px] font-semibold uppercase tracking-wider text-(--app-text-muted) truncate"
                >Recent Activity</span
              >
              <span
                class="block text-xs sm:text-sm font-semibold text-(--app-text)ing-tight truncate"
              >
                {{ recentTrackerName() }}
              </span>
            </div>
          </div>
        </section>
      }

      <!-- Refresh indicator -->
      @if (isRefreshing()) {
        <div
          class="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-(--app-surface-container)-[var(--app-text-muted)] text-xs mb-3 w-fit"
        >
          <nz-spin nzSimple nzSize="small" />
          <span>Syncing trackers…</span>
        </div>
      }

      <!-- ================= SEARCH & SORT TOOLBAR ================= -->
      @if (all().length > 0) {
        <section
          class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4"
        >
          <div class="w-full sm:max-w-xs relative">
            <nz-input-wrapper class="w-full">
              <input
                nz-input
                [value]="query()"
                (input)="onQuery($event)"
                (keydown.escape)="clearQuery()"
                placeholder="Search trackers…"
                autocomplete="off"
                class="rounded-xl!"
              />
              <span nzInputPrefix class="text-(--app-text-muted)"
                ><nz-icon nzType="search"
              /></span>
              @if (query()) {
                <span nzInputSuffix>
                  <nz-icon
                    nzType="close-circle"
                    (click)="clearQuery()"
                    class="cursor-pointer text-(--app-text-muted) hover:text-(--app-text)"
                  />
                </span>
              }
            </nz-input-wrapper>
          </div>

          <div class="flex items-center justify-between sm:justify-end gap-2">
            <nz-radio-group
              [ngModel]="sort()"
              (ngModelChange)="sort.set($event)"
              nzButtonStyle="solid"
              class="w-full sm:w-auto"
              nzSize="small"
              aria-label="Sort trackers"
            >
              <label nz-radio-button nzValue="recent">
                <span class="inline-flex items-center gap-1.5">
                  <nz-icon nzType="history" />
                  <span>Recent</span>
                </span>
              </label>
              <label nz-radio-button nzValue="name">
                <span class="inline-flex items-center gap-1.5">
                  <nz-icon nzType="sort-ascending" />
                  <span>Name</span>
                </span>
              </label>
              <label nz-radio-button nzValue="records">
                <span class="inline-flex items-center gap-1.5">
                  <nz-icon nzType="database" />
                  <span>Records</span>
                </span>
              </label>
            </nz-radio-group>
          </div>
        </section>
      }

      <!-- ================= CONTENT GRID / STATES ================= -->
      @if (isInitialLoading()) {
        <!-- App Skeleton Placeholders -->
        <div
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          aria-hidden="true"
        >
          @for (item of skeletonPlaceholders; track $index) {
            <div
              class="h-44 p-4 rounded-2xl bg-(--app-surface-container)er border-(--app-outline-variant) animate-pulse flex flex-col justify-between"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-xl bg-(--app-surface-container-high)"
                ></div>
                <div class="flex-1 space-y-2">
                  <div
                    class="h-4 w-3/4 bg-(--app-surface-container-high) rounded"
                  ></div>
                  <div
                    class="h-3 w-1/2 bg-(--app-surface-container-high)ded"
                  ></div>
                </div>
              </div>
              <div
                class="h-3 w-2/3 bg-(--app-surface-container-high) rounded"
              ></div>
            </div>
          }
        </div>
      } @else if (collections.error()) {
        <!-- Error State -->
        <div
          class="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-(--app-error) bg-(--app-error-container) my-6 max-w-lg mx-auto"
        >
          <div
            class="w-12 h-12 rounded-2xl bg-(--app-error) text-white flex items-center justify-center text-xl mx-auto mb-3"
          >
            <nz-icon nzType="disconnect" />
          </div>
          <h3 class="text-base font-bold text-(--app-text) m-0 mb-1">
            Could not load trackers
          </h3>
          <p class="text-xs text-(--app-text-muted) m-0 mb-4">
            Something went wrong while connecting to the server.
          </p>
          <button nz-button nzType="default" (click)="collections.reload()">
            <nz-icon nzType="reload" /> Try again
          </button>
        </div>
      } @else if (all().length === 0 && collections.hasValue()) {
        <!-- Empty Workspace State -->
        <div
          class="p-8 sm:p-14 text-center rounded-2xl border border-dashed border-(--app-outline-variant) bg-(--app-surface) my-6 max-w-md mx-auto shadow-2xs"
        >
          <div
            class="w-14 h-14 rounded-2xl bg-(--app-primary-container) text-(--app-primary) flex items-center justify-center text-2xl mx-auto mb-4"
          >
            <nz-icon nzType="inbox" />
          </div>
          <h3 class="text-lg font-bold text-(--app-text) m-0 mb-1.5">
            No trackers yet
          </h3>
          <p class="text-xs text-(--app-text-muted) m-0 mb-5 leading-relaxed">
            Create your first tracker to organize projects, finances, habits, or
            inventory.
          </p>
          <a nz-button nzType="primary" routerLink="/collections/new">
            <nz-icon nzType="plus" />
            <span>Create tracker</span>
          </a>
        </div>
      } @else if (visible().length === 0) {
        <!-- Search No Results -->
        <div
          class="p-8 text-center rounded-2xl border border-dashed border-(--app-outline-variant) bg-(--app-surface) my-6 max-w-sm mx-auto"
        >
          <nz-icon
            nzType="search"
            class="text-2xl text-(--app-text-muted) mb-2"
          />
          <h3 class="text-sm font-bold text-(--app-text) m-0 mb-1">
            No matching trackers
          </h3>
          <p class="text-xs text-(--app-text-muted) m-0 mb-3">
            No trackers matched "{{ query() }}".
          </p>
          <button
            nz-button
            nzType="default"
            nzSize="small"
            (click)="clearQuery()"
          >
            Clear search
          </button>
        </div>
      } @else {
        <!-- App Launcher Grid -->
        <div
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4.5"
        >
          @for (c of visible(); track c.id) {
            <app-collection-card [collection]="c" />
          }
        </div>
      }

      <!-- Floating Action Buttons -->
      <div class="fixed right-6 bottom-6 flex flex-col gap-2.5 items-end z-20">
        <a
          nz-button
          nzType="default"
          nzShape="circle"
          nzSize="large"
          routerLink="/share-target"
          aria-label="Share or quick add content"
          title="Share content to tracker"
          class="grid! place-content-center! shadow-md! border-(--app-outline)! bg-(--app-surface)!"
        >
          <nz-icon nzType="share-alt" />
        </a>
        <button
          nz-button
          nzType="primary"
          nzShape="circle"
          nzSize="large"
          routerLink="/collections/new"
          aria-label="Create tracker"
          class="shadow-lg!"
        >
          <nz-icon nzType="plus" />
        </button>
      </div>
    </div>
  `,
})
export class DashboardPage {
  protected readonly collections = httpResource<CollectionSummary[]>(
    () => "/api/collections",
  );

  protected readonly skeletonPlaceholders = Array(8).fill(null);
  protected readonly query = signal("");
  protected readonly sort = signal<"recent" | "name" | "records">("recent");

  protected readonly all = computed(() => this.collections.value() ?? []);

  protected readonly totalRecords = computed(() =>
    this.all().reduce((sum, c) => sum + (c.recordCount ?? 0), 0),
  );

  protected readonly recentTrackerName = computed(() => {
    const list = this.all();
    if (!list.length) return "None";
    const sorted = [...list].sort((a, b) => {
      const ta = Date.parse(a.lastActivityAt ?? a.updatedAt) || 0;
      const tb = Date.parse(b.lastActivityAt ?? b.updatedAt) || 0;
      return tb - ta;
    });
    return sorted[0]?.name ?? "None";
  });

  protected readonly isInitialLoading = computed(
    () => this.collections.isLoading() && !this.collections.hasValue(),
  );

  protected readonly isRefreshing = computed(
    () => this.collections.isLoading() && this.collections.hasValue(),
  );

  protected readonly visible = computed(() => {
    const rawQuery = this.query().trim().toLowerCase();
    const tokens = rawQuery ? rawQuery.split(/\s+/) : [];

    const list = this.all().filter((c) => {
      if (!tokens.length) return true;
      const searchable = `${c.name} ${c.description ?? ""}`.toLowerCase();
      return tokens.every((token) => searchable.includes(token));
    });

    if (this.sort() === "name") {
      return [...list].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
    }

    if (this.sort() === "records") {
      return [...list].sort(
        (a, b) => (b.recordCount ?? 0) - (a.recordCount ?? 0),
      );
    }

    const toTimestamp = (c: CollectionSummary) => {
      const raw = c.lastActivityAt ?? c.updatedAt;
      return raw ? Date.parse(raw) || 0 : 0;
    };

    return [...list].sort((a, b) => toTimestamp(b) - toTimestamp(a));
  });

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected clearQuery(): void {
    this.query.set("");
  }
}
