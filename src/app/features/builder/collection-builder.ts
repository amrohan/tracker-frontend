import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  moveItemInArray,
} from "@angular/cdk/drag-drop";
import { httpResource } from "@angular/common/http";
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzModalService } from "ng-zorro-antd/modal";
import { NzSpinModule } from "ng-zorro-antd/spin";

import {
  CollectionsApi,
  CreateCollectionBody,
} from "../../core/collections-api.service";
import { coverBackground, fallbackBackground } from "../../core/cover-presets";
import { fieldErrors, problemMessage } from "../../core/http-errors";
import { EMOJIS, TYPE_LABELS, defaultConfig } from "../../core/labels";
import {
  CollectionDetail,
  CollectionSummary,
  Cover,
  CoverSelection,
  Field,
  FieldType,
} from "../../core/models";
import { Notify } from "../../core/notify.service";
import { CoverPickerDialog } from "../../shared/cover-picker-dialog";
import { CoverView } from "../../shared/cover-view";
import {
  FieldDraft,
  diffField,
  draftFromField,
  newDraft,
  toInput,
  validateDrafts,
} from "./field-draft";
import { FieldEditor } from "./field-editor";

@Component({
  selector: "app-collection-builder",
  imports: [
    CdkDropList,
    CdkDrag,
    RouterLink,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzSpinModule,
    FieldEditor,
    CoverView,
  ],
  template: `
    <div class="builder">
      <a
        nz-button
        nzType="text"
        class="back"
        [routerLink]="isEdit() ? ['/collections', id()] : ['/']"
      >
        <nz-icon nzType="arrow-left" />
        {{ isEdit() ? "Back to tracker" : "My trackers" }}
      </a>

      <header class="head">
        <h1>{{ isEdit() ? "Edit tracker" : "New tracker" }}</h1>
        <p class="lead">
          Give it a name and a look, then add the fields you want to record.
        </p>
      </header>

      @if (isEdit() && !hydrated()) {
        <div class="loading-state">
          <nz-spin nzSimple />
        </div>
      } @else {
        <!-- ============ LOOK & FEEL ============ -->
        <section class="card looks" aria-labelledby="looks-h">
          <h2 id="looks-h" class="sr-only">Cover and icon</h2>

          <div class="hero" [style.background]="coverCss()">
            @if (showExistingImage()) {
              <app-cover-view
                class="fill"
                [cover]="cover()"
                [collectionId]="id()!"
              />
            }
            <button
              type="button"
              nz-button
              nzType="primary"
              class="cover-btn"
              (click)="pickCover()"
            >
              <nz-icon nzType="picture" />
              {{ hasCover() ? "Change cover" : "Add cover" }}
            </button>
          </div>

          <div class="icon-line">
            <button
              type="button"
              class="big-icon"
              (click)="showIcons.set(!showIcons())"
              [attr.aria-expanded]="showIcons()"
              aria-label="Choose an icon"
            >
              <span aria-hidden="true">{{ icon() }}</span>
              <nz-icon nzType="edit" class="edit-badge" aria-hidden="true" />
            </button>
            <p class="muted icon-hint">Tap the icon to change it</p>
          </div>

          @if (showIcons()) {
            <div class="icon-panel">
              <div class="emojis" role="group" aria-label="Icons">
                @for (e of emojis; track e) {
                  <button
                    type="button"
                    class="emoji"
                    [class.on]="icon() === e"
                    [attr.aria-pressed]="icon() === e"
                    (click)="icon.set(e)"
                  >
                    {{ e }}
                  </button>
                }
              </div>
              <input
                nz-input
                maxlength="16"
                (input)="onCustomIcon($event)"
                placeholder="Or paste any emoji"
                class="custom-emoji"
              />
            </div>
          }
        </section>

        <!-- ============ DETAILS ============ -->
        <section class="card details-card" aria-labelledby="details-h">
          <h2 id="details-h">Details</h2>
          <div class="form-group">
            <label class="form-label">Name</label>
            <input
              nz-input
              maxlength="100"
              [value]="name()"
              (input)="name.set(text($event))"
              placeholder="e.g. Movies, Hangouts, Car maintenance"
            />
            <span class="hint align-end">{{ name().length }}/100</span>
          </div>

          <div class="form-group">
            <label class="form-label">Description (optional)</label>
            <textarea
              nz-input
              rows="2"
              maxlength="1000"
              [value]="description()"
              (input)="description.set(text($event))"
              placeholder="Brief description"
            ></textarea>
          </div>
        </section>

        <!-- ============ FIELDS ============ -->
        <section class="card" aria-labelledby="fields-h">
          <div
            class="flex justify-between bg-(--app-surface) border-b border-(--app-outline-variant) sticky top-0 z-10 h-20"
          >
            <div>
              <h2 id="fields-h">
                Fields <span class="count">{{ fields().length }}</span>
              </h2>
              <p class="muted small-text">
                Each field is one detail you record. Drag to reorder.
              </p>
            </div>
            <span class="spacer"></span>
            <button
              nz-button
              nzType="primary"
              type="button"
              class="add-top"
              (click)="addField()"
            >
              Add field
            </button>
          </div>

          <div class="quick" role="group" aria-label="Quick add a field">
            <span class="quick-label">Quick add</span>
            @for (t of quickTypes; track t) {
              <button type="button" class="chip" (click)="addField(t)">
                <nz-icon [nzType]="typeIcon(t)" /> {{ typeLabel(t) }}
              </button>
            }
          </div>

          @if (fields().length === 0) {
            <div class="empty">
              <nz-icon nzType="unordered-list" class="empty-icon" />
              <p><strong>No fields yet</strong></p>
              <p class="muted">
                Start with a Text field for the name, then add dates, ratings or
                links to other trackers.
              </p>
              <button
                nz-button
                nzType="default"
                type="button"
                (click)="addField('text')"
              >
                Add a text field
              </button>
            </div>
          }

          <div cdkDropList (cdkDropListDropped)="drop($event)">
            @for (f of fields(); track f.cid; let i = $index) {
              <div cdkDrag class="drag-row">
                <app-field-editor
                  [field]="f"
                  (fieldChange)="updateField(i, $event)"
                  [collections]="targets()"
                  [index]="i"
                  [count]="fields().length"
                  (removed)="removeField(i)"
                  (moveUp)="move(i, -1)"
                  (moveDown)="move(i, 1)"
                />
              </div>
            }
          </div>

          @if (fields().length > 2) {
            <button
              nz-button
              nzType="dashed"
              type="button"
              class="add-bottom"
              (click)="addField()"
            >
              <nz-icon nzType="plus" /> Add another field
            </button>
          }
        </section>

        @if (problems().length) {
          <div class="problems" role="alert">
            <nz-icon nzType="exclamation-circle" class="problem-icon" />
            <div>
              <strong>Please fix before saving</strong>
              <ul>
                @for (p of problems(); track p) {
                  <li>{{ p }}</li>
                }
              </ul>
            </div>
          </div>
        }

        <!-- ============ SAVE BAR ============ -->
        <div class="savebar">
          <span class="summary"
            >{{ fields().length }}
            {{ fields().length === 1 ? "field" : "fields" }}</span
          >
          <span class="spacer"></span>
          <a
            nz-button
            nzType="default"
            [routerLink]="isEdit() ? ['/collections', id()] : ['/']"
            >Cancel</a
          >
          <button
            nz-button
            nzType="primary"
            type="button"
            [nzLoading]="saving()"
            [disabled]="saving()"
            (click)="save()"
          >
            {{ isEdit() ? "Save changes" : "Create tracker" }}
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .builder {
      max-width: 860px;
      margin: 0 auto;
      padding: 12px 16px 0;
    }
    .back {
      margin-left: -8px;
      margin-bottom: 8px;
    }
    .head {
      margin: 4px 0 20px;
    }
    h1 {
      font-size: clamp(1.6rem, 1.2rem + 1.8vw, 2.4rem);
      line-height: 1.15;
      letter-spacing: -0.02em;
      margin: 0;
    }
    .lead {
      margin: 6px 0 0;
      color: var(--app-text-muted);
      font-size: 1rem;
      line-height: 1.5;
    }
    h2 {
      font-size: 1.2rem;
      margin: 0 0 12px;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    .loading-state {
      display: flex;
      justify-content: center;
      padding: 64px 0;
    }

    .card {
      border: 1px solid var(--app-outline-variant);
      border-radius: 20px;
      padding: clamp(14px, 3vw, 24px);
      margin-bottom: 16px;
    }
    .looks {
      padding: 0;
      overflow: visible;
    }
    .details-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--app-text);
    }
    .hint {
      font-size: 0.785rem;
      color: var(--app-text-muted);
    }
    .align-end {
      align-self: flex-end;
    }

    /* cover + icon */
    .hero {
      position: relative;
      height: clamp(120px, 24vw, 190px);
      border-radius: 20px 20px 0 0;
      overflow: hidden;
    }
    .fill {
      position: absolute;
      inset: 0;
    }
    .cover-btn {
      position: absolute;
      right: 12px;
      bottom: 12px;
      z-index: 1;
    }
    .icon-line {
      display: flex;
      align-items: flex-end;
      gap: 14px;
      padding: 0 clamp(14px, 3vw, 24px) 16px;
      margin-top: -36px;
      position: relative;
    }
    .big-icon {
      position: relative;
      width: clamp(64px, 12vw, 84px);
      height: clamp(64px, 12vw, 84px);
      border-radius: 22px;
      cursor: pointer;
      font-size: clamp(2rem, 1.4rem + 2.4vw, 2.8rem);
      display: grid;
      place-items: center;
      background: var(--app-surface);
      border: 1px solid var(--app-outline-variant);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    .edit-badge {
      position: absolute;
      right: -6px;
      bottom: -6px;
      width: 26px;
      height: 26px;
      font-size: 14px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: var(--app-primary);
      color: var(--app-on-primary);
    }
    .icon-hint {
      margin: 0 0 6px;
      font-size: 0.875rem;
      color: var(--app-text-muted);
    }
    .icon-panel {
      padding: 0 clamp(14px, 3vw, 24px) 18px;
      display: grid;
      gap: 12px;
    }
    .emojis {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
      gap: 6px;
    }
    .emoji {
      font-size: 1.5rem;
      height: 44px;
      border-radius: 12px;
      border: 1px solid transparent;
      background: var(--app-surface-container);
      cursor: pointer;
    }
    .emoji.on {
      border-color: var(--app-primary);
      background: var(--app-primary-container);
    }
    .custom-emoji {
      width: min(240px, 100%);
    }

    /* fields */
    .fields-head {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }
    .fields-head h2 {
      margin-bottom: 2px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .count {
      font-size: 0.8rem;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: 999px;
      background: var(--app-surface-container-high);
      color: var(--app-text);
    }
    .small-text {
      font-size: 0.875rem;
      margin: 0;
    }
    .quick {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin: 14px 0 16px;
    }
    .quick-label {
      font-size: 0.8rem;
      color: var(--app-text-muted);
      margin-right: 2px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px 6px 8px;
      border-radius: 999px;
      cursor: pointer;
      font: inherit;
      font-size: 0.875rem;
      background: var(--app-surface);
      color: var(--app-text);
      border: 1px solid var(--app-outline-variant);
      transition: all 0.15s ease;
    }
    .chip:hover {
      background: var(--app-surface-container-high);
      border-color: var(--app-primary);
      color: var(--app-primary);
    }
    .chip nz-icon {
      font-size: 15px;
      color: var(--app-primary);
    }
    .empty {
      text-align: center;
      padding: 28px 16px;
      border: 2px dashed var(--app-outline-variant);
      border-radius: 16px;
      margin-bottom: 12px;
    }
    .empty-icon {
      font-size: 36px;
      color: var(--app-text-muted);
      margin-bottom: 8px;
      opacity: 0.55;
    }
    .empty p {
      margin: 4px 0;
    }
    .drag-row {
      display: block;
    }
    .add-bottom {
      width: 100%;
      margin-top: 8px;
      height: 42px;
    }

    /* problems */
    .problems {
      display: flex;
      gap: 12px;
      padding: 14px 16px;
      margin-bottom: 16px;
      border-radius: 16px;
      background: var(--app-error-container, #ffdad6);
      color: var(--app-on-error-container, #410002);
    }
    .problem-icon {
      font-size: 20px;
      flex: none;
      margin-top: 2px;
    }
    .problems ul {
      margin: 6px 0 0;
      padding-left: 18px;
      font-size: 0.9rem;
    }

    /* sticky save bar */
    .savebar {
      position: sticky;
      bottom: 0;
      z-index: 5;
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 -16px;
      padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
      background: color-mix(in srgb, var(--app-surface) 92%, transparent);
      backdrop-filter: blur(8px);
      border-top: 1px solid var(--app-outline-variant);
    }
    .summary {
      font-size: 0.9rem;
      color: var(--app-text-muted);
    }
    .spacer {
      flex: 1;
    }

    @media (max-width: 560px) {
      .add-top {
        display: none;
      }
      .cover-btn {
        right: 8px;
        bottom: 8px;
      }
      .icon-hint {
        display: none;
      }
      .add-bottom {
        display: inline-flex;
      }
    }
    @media (min-width: 561px) {
      .add-bottom {
        display: none;
      }
    }
  `,
})
export class CollectionBuilder {
  /** Present on /collections/:id/edit, absent on /collections/new. */
  readonly id = input<string>();

  private readonly api = inject(CollectionsApi);
  private readonly notify = inject(Notify);
  private readonly router = inject(Router);
  private readonly modal = inject(NzModalService);

  protected readonly emojis = EMOJIS;
  protected readonly quickTypes: FieldType[] = [
    "text",
    "date",
    "currency",
    "rating",
    "select",
    "reference",
  ];
  protected readonly isEdit = computed(() => !!this.id());
  protected readonly showIcons = signal(false);

  protected readonly existing = httpResource<CollectionDetail>(() => {
    const id = this.id();
    return id ? `/api/collections/${id}` : undefined;
  });
  private readonly all = httpResource<CollectionSummary[]>(
    () => "/api/collections",
  );
  protected readonly targets = computed(() => this.all.value() ?? []);

  protected readonly name = signal("");
  protected readonly description = signal("");
  protected readonly icon = signal("📁");
  protected readonly fields = signal<FieldDraft[]>([]);
  protected readonly cover = signal<Cover>({ type: "none" });
  protected readonly pendingCover = signal<CoverSelection | null>(null);
  private readonly pendingImageUrl = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly problems = signal<string[]>([]);
  protected readonly hydrated = signal(false);
  private original: Field[] = [];

  protected readonly hasCover = computed(() => {
    const p = this.pendingCover();
    return p ? p.type !== "none" : this.cover().type !== "none";
  });

  protected readonly showExistingImage = computed(
    () => !this.pendingCover() && this.cover().type === "image" && !!this.id(),
  );

  protected readonly coverCss = computed(() => {
    const p = this.pendingCover();
    if (p?.type === "image")
      return `center / cover url(${this.pendingImageUrl()})`;
    if (p?.type === "gradient" || p?.type === "color")
      return coverBackground({ type: p.type, value: p.value });
    if (p?.type === "none") return fallbackBackground(this.id() ?? "new");
    const c = this.cover();
    if (c.type === "image" && this.id()) return null; // shown through <app-cover-view> instead
    return coverBackground(c) ?? fallbackBackground(this.id() ?? "new");
  });

  constructor() {
    effect(() => {
      const c = this.existing.value();
      if (!c || untracked(this.hydrated)) return;
      untracked(() => {
        this.hydrated.set(true);
        this.name.set(c.name);
        this.description.set(c.description ?? "");
        this.icon.set(c.icon);
        this.cover.set(c.cover);
        this.original = c.fields;
        this.fields.set(c.fields.map(draftFromField));
      });
    });
  }

  protected text(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }
  protected typeIcon(t: FieldType): string {
    const map: Record<FieldType, string> = {
      text: "font-size",
      longText: "file-text",
      number: "number",
      currency: "dollar",
      date: "calendar",
      dateTime: "clock-circle",
      boolean: "check-square",
      select: "down-circle",
      multiSelect: "unordered-list",
      rating: "star",
      reference: "link",
      multiReference: "share-alt",
      url: "global",
    };
    return map[t] || "file";
  }
  protected typeLabel(t: FieldType): string {
    return TYPE_LABELS[t];
  }

  protected onCustomIcon(e: Event): void {
    const v = this.text(e).trim();
    if (v) this.icon.set(v);
  }

  protected addField(type: FieldType = "text"): void {
    this.fields.update((l) => [
      ...l,
      { ...newDraft(), type, config: defaultConfig(type) },
    ]);
  }
  protected removeField(i: number): void {
    this.fields.update((l) => l.filter((_, idx) => idx !== i));
  }
  protected updateField(i: number, next: FieldDraft): void {
    this.fields.update((l) => l.map((f, idx) => (idx === i ? next : f)));
  }
  protected move(i: number, delta: number): void {
    const list = [...this.fields()];
    const j = i + delta;
    if (j < 0 || j >= list.length) return;
    moveItemInArray(list, i, j);
    this.fields.set(list);
  }
  protected drop(e: CdkDragDrop<unknown>): void {
    const list = [...this.fields()];
    moveItemInArray(list, e.previousIndex, e.currentIndex);
    this.fields.set(list);
  }

  protected async pickCover(): Promise<void> {
    const selection = await new Promise<CoverSelection | undefined>(
      (resolve) => {
        const modalRef = this.modal.create<
          CoverPickerDialog,
          { cover: Cover; collectionId: string | null },
          CoverSelection
        >({
          nzContent: CoverPickerDialog,
          nzData: { cover: this.cover(), collectionId: this.id() ?? null },
          nzFooter: null,
          nzWidth: 560,
          nzStyle: { maxWidth: "95vw" },
        });
        modalRef.afterClose.subscribe((val) => resolve(val));
      },
    );

    if (!selection) return;
    const previous = this.pendingImageUrl();
    if (previous) URL.revokeObjectURL(previous);
    this.pendingImageUrl.set(
      selection.type === "image" ? URL.createObjectURL(selection.blob) : null,
    );
    this.pendingCover.set(selection);
  }

  protected async save(): Promise<void> {
    const problems: string[] = [];
    if (!this.name().trim()) problems.push("Give your tracker a name.");
    problems.push(...validateDrafts(this.fields()));
    this.problems.set(problems);
    if (problems.length) return;

    this.saving.set(true);
    try {
      const id = this.id();
      const target = id ? await this.saveExisting(id) : await this.saveNew();
      this.notify.info(id ? "Changes saved." : "Tracker created.");
      await this.router.navigate(["/collections", target]);
    } catch (err) {
      const errors = fieldErrors(err);
      const list = Object.entries(errors).flatMap(([key, msgs]) =>
        msgs.map(
          (m) =>
            `${key.replace(/^fields\[(\d+)\]\./, (_, n) => `Field ${Number(n) + 1}: `)} ${m}`,
        ),
      );
      this.problems.set(list.length ? list : [problemMessage(err)]);
    } finally {
      this.saving.set(false);
    }
  }

  private async saveNew(): Promise<string> {
    const p = this.pendingCover();
    const body: CreateCollectionBody = {
      name: this.name().trim(),
      description: this.description().trim() || null,
      icon: this.icon(),
      cover:
        p && p.type !== "image"
          ? p.type === "none"
            ? null
            : { type: p.type, value: p.value }
          : null,
      fields: this.fields().map(toInput),
    };
    const created = await this.api.create(body);
    if (p?.type === "image") {
      try {
        await this.api.applyCover(created.id, p);
      } catch {
        this.notify.error(
          "Tracker created, but the cover image could not be uploaded.",
        );
      }
    }
    return created.id;
  }

  private async saveExisting(id: string): Promise<string> {
    await this.api.update(id, {
      name: this.name().trim(),
      description: this.description().trim(),
      icon: this.icon(),
    });

    const drafts = this.fields();
    const kept = new Set(drafts.filter((d) => d.id).map((d) => d.id));
    for (const f of this.original)
      if (!kept.has(f.id)) await this.api.removeField(f.id);

    const finalOrder: string[] = [];
    for (const d of drafts) {
      if (!d.id) {
        finalOrder.push((await this.api.addField(id, toInput(d))).id);
        continue;
      }
      const original = this.original.find((f) => f.id === d.id);
      const patch = original ? diffField(original, d) : null;
      if (patch) await this.api.updateField(d.id, patch);
      finalOrder.push(d.id);
    }
    if (finalOrder.length > 1) await this.api.reorderFields(id, finalOrder);

    const cover = this.pendingCover();
    if (cover) await this.api.applyCover(id, cover);
    return id;
  }
}
