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
import { CollectionDetail, Field } from "./models";

/**
 * Per-route state for one collection. `autoProvided: false` means it is created by the route's
 * `providers` array and destroyed with the route, so no stale data leaks between collections.
 */
@Service({ autoProvided: false })
export class CollectionContext {
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

  readonly recordsVersion = signal(0);

  recordsChanged(): void {
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
      if (ctx.id() !== value) ctx.id.set(value);
      if (first) ctx.detail.reload();
    });
    first = false;
  });
  return ctx;
}
