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
import { MatButtonModule } from "@angular/material/button";
import { MatDialog } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { Router, RouterLink } from "@angular/router";
import {
  CollectionsApi,
  CreateCollectionBody,
} from "../../core/collections-api.service";
import { coverBackground, fallbackBackground } from "../../core/cover-presets";
import {
  EMOJIS,
  TYPE_ICONS,
  TYPE_LABELS,
  defaultConfig,
} from "../../core/labels";
import { fieldErrors, problemMessage } from "../../core/http-errors";
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
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    RouterLink,
    FieldEditor,
    CoverView,
  ],
  template: `
    <div class="builder">
      <a
        mat-button
        class="back"
        [routerLink]="isEdit() ? ['/collections', id()] : ['/']"
      >
        <mat-icon>arrow_back</mat-icon>
        {{ isEdit() ? "Back to tracker" : "My trackers" }}
      </a>

      <header class="head">
        <h1>{{ isEdit() ? "Edit tracker" : "New tracker" }}</h1>
        <p class="lead">
          Give it a name and a look, then add the fields you want to record.
        </p>
      </header>

      @if (isEdit() && !hydrated()) {
        <mat-progress-bar mode="indeterminate" />
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
              mat-flat-button
              class="cover-btn"
              (click)="pickCover()"
            >
              <mat-icon>image</mat-icon>
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
              <mat-icon class="edit-badge" aria-hidden="true">edit</mat-icon>
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
              <mat-form-field
                appearance="outline"
                class="custom-emoji"
                subscriptSizing="dynamic"
              >
                <mat-label>Or paste any emoji</mat-label>
                <input matInput maxlength="16" (input)="onCustomIcon($event)" />
              </mat-form-field>
            </div>
          }
        </section>

        <!-- ============ DETAILS ============ -->
        <section class="card" aria-labelledby="details-h">
          <h2 id="details-h">Details</h2>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Name</mat-label>
            <input
              matInput
              maxlength="100"
              [value]="name()"
              (input)="name.set(text($event))"
              placeholder="e.g. Movies, Hangouts, Car maintenance"
            />
            <mat-hint align="end">{{ name().length }}/100</mat-hint>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Description (optional)</mat-label>
            <textarea
              matInput
              rows="2"
              maxlength="1000"
              [value]="description()"
              (input)="description.set(text($event))"
            ></textarea>
          </mat-form-field>
        </section>

        <!-- ============ FIELDS ============ -->
        <section class="card" aria-labelledby="fields-h">
          <div class="fields-head">
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
              mat-flat-button
              type="button"
              class="add-top"
              (click)="addField()"
            >
              <mat-icon>add</mat-icon> Add field
            </button>
          </div>

          <div class="quick" role="group" aria-label="Quick add a field">
            <span class="quick-label">Quick add</span>
            @for (t of quickTypes; track t) {
              <button type="button" class="chip" (click)="addField(t)">
                <mat-icon>{{ typeIcon(t) }}</mat-icon> {{ typeLabel(t) }}
              </button>
            }
          </div>

          @if (fields().length === 0) {
            <div class="empty">
              <mat-icon>view_list</mat-icon>
              <p><strong>No fields yet</strong></p>
              <p class="muted">
                Start with a Text field for the name, then add dates, ratings or
                links to other trackers.
              </p>
              <button
                mat-stroked-button
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
              mat-stroked-button
              type="button"
              class="add-bottom"
              (click)="addField()"
            >
              <mat-icon>add</mat-icon> Add another field
            </button>
          }
        </section>

        @if (problems().length) {
          <div class="problems" role="alert">
            <mat-icon>error_outline</mat-icon>
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
          <a mat-button [routerLink]="isEdit() ? ['/collections', id()] : ['/']"
            >Cancel</a
          >
          <button
            mat-flat-button
            type="button"
            [disabled]="saving()"
            (click)="save()"
          >
            @if (saving()) {
              Saving…
            } @else {
              {{ isEdit() ? "Save changes" : "Create tracker" }}
            }
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
      margin-left: -12px;
    }
    .head {
      margin: 4px 0 20px;
    }
    h1 {
      font-size: clamp(1.6rem, 1.2rem + 1.8vw, 2.4rem);
      line-height: 1.15;
      letter-spacing: -0.02em;
    }
    .lead {
      margin: 6px 0 0;
      color: var(--mat-sys-on-surface-variant);
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

    .card {
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 20px;
      padding: clamp(14px, 3vw, 24px);
      margin-bottom: 16px;
    }
    .looks {
      padding: 0;
      overflow: visible;
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
      background: var(--mat-sys-surface);
      border: 1px solid var(--mat-sys-outline-variant);
      box-shadow: var(--mat-sys-level2);
    }
    .edit-badge {
      position: absolute;
      right: -6px;
      bottom: -6px;
      width: 26px;
      height: 26px;
      font-size: 16px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
    }
    .icon-hint {
      margin: 0 0 6px;
      font-size: 0.875rem;
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
      background: var(--mat-sys-surface-container);
      cursor: pointer;
    }
    .emoji.on {
      border-color: var(--mat-sys-primary);
      background: var(--mat-sys-primary-container);
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
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
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
      color: var(--mat-sys-on-surface-variant);
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
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .chip:hover {
      background: var(--mat-sys-secondary-container);
    }
    .chip mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--mat-sys-primary);
    }
    .empty {
      text-align: center;
      padding: 28px 16px;
      border: 2px dashed var(--mat-sys-outline-variant);
      border-radius: 16px;
      margin-bottom: 12px;
    }
    .empty mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
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
      border-style: dashed;
    }
    .cdk-drag-preview {
      box-shadow: var(--mat-sys-level4);
      border-radius: 12px;
    }
    .cdk-drag-placeholder {
      opacity: 0.3;
    }

    /* problems */
    .problems {
      display: flex;
      gap: 12px;
      padding: 14px 16px;
      margin-bottom: 16px;
      border-radius: 16px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
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
      background: color-mix(in srgb, var(--mat-sys-surface) 92%, transparent);
      backdrop-filter: blur(8px);
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .summary {
      font-size: 0.9rem;
      color: var(--mat-sys-on-surface-variant);
    }

    @media (max-width: 560px) {
      .add-top {
        display: none;
      } /* the quick-add chips and bottom button cover this on phones */
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
  private readonly dialog = inject(MatDialog);

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
    return TYPE_ICONS[t];
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

  protected pickCover(): void {
    this.dialog
      .open<
        CoverPickerDialog,
        { cover: Cover; collectionId: string | null },
        CoverSelection
      >(CoverPickerDialog, {
        data: { cover: this.cover(), collectionId: this.id() ?? null },
        width: "560px",
        maxWidth: "95vw",
      })
      .afterClosed()
      .subscribe((selection) => {
        if (!selection) return;
        const previous = this.pendingImageUrl();
        if (previous) URL.revokeObjectURL(previous);
        this.pendingImageUrl.set(
          selection.type === "image"
            ? URL.createObjectURL(selection.blob)
            : null,
        );
        this.pendingCover.set(selection);
      });
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
