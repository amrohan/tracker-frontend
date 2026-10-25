import { httpResource } from "@angular/common/http";
import {
  Service,
  Signal,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from "@angular/core";
import { CollectionDetail, Field, RecordReference, TrackerRecord } from "./models";
import { HttpCacheService } from "./http-cache.service";

export type RecordDrawerMode = "view" | "edit" | "create";

export interface RecordDrawerState {
  mode: RecordDrawerMode;
  record?: TrackerRecord;
  references?: Record<string, RecordReference>;
}

/**
 * Per-route state for one collection. `autoProvided: false` means it is created by the route's
 * `providers` array and destroyed with the route, so no stale data leaks between collections.
 */
@Service({ autoProvided: false })
export class CollectionContext {
  private readonly cache = inject(HttpCacheService);
  readonly id = signal<string | null>(null);

  readonly detail = httpResource<CollectionDetail>(() => {
    const id = this.id();
    return id ? `/api/collections/${id}` : undefined;
  });

  readonly fields = computed<Field[]>(() => this.detail.value()?.fields ?? []);
  readonly fieldsById = computed(
    () => new Map(this.fields().map((f) => [f.id, f] as const)),
  );
  readonly titleField = computed(
    () =>
      this.fields().find((f) => f.isTitle) ??
      this.fields().find((f) => f.type === "text") ??
      this.fields()[0],
  );

  readonly role = computed(() => this.detail.value()?.role ?? "owner");
  readonly isOwner = computed(() => this.role() === "owner");
  readonly canEdit = computed(() => this.role() === "owner" || this.role() === "editor");
  readonly isViewer = computed(() => this.role() === "viewer");

  readonly recordsVersion = signal(0);
  readonly drawerState = signal<RecordDrawerState | null>(null);

  openCreate(): void {
    this.drawerState.set({ mode: "create" });
  }

  openEdit(record: TrackerRecord, references?: Record<string, RecordReference>): void {
    this.drawerState.set({ mode: "edit", record, references });
  }

  openView(record: TrackerRecord, references?: Record<string, RecordReference>): void {
    this.drawerState.set({ mode: "view", record, references });
  }

  closeDrawer(): void {
    this.drawerState.set(null);
  }

  recordsChanged(): void {
    const id = this.id();
    if (id) {
      this.cache.invalidateCollection(id);
    }
    this.recordsVersion.update((v) => v + 1);
    this.detail.reload(); // keeps the record count fresh
  }
}

/** Call from a component field initializer: keeps the context in sync with the route's :id. */
export function bindCollectionId(id: Signal<string>): CollectionContext {
  const ctx = inject(CollectionContext);
  let first = true;
  effect(() => {
    const value = id();
    untracked(() => {
      const changed = ctx.id() !== value;
      if (changed) ctx.id.set(value);
      if (first || changed) ctx.detail.reload();
    });
    first = false;
  });
  return ctx;
}
