import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { CollectionsApi, CreateCollectionBody } from '../../core/collections-api.service';
import { coverBackground, fallbackBackground } from '../../core/cover-presets';
import { EMOJIS } from '../../core/labels';
import { fieldErrors, problemMessage } from '../../core/http-errors';
import { CollectionDetail, CollectionSummary, Cover, CoverSelection, Field } from '../../core/models';
import { Notify } from '../../core/notify.service';
import { CoverPickerDialog } from '../../shared/cover-picker-dialog';
import { CoverView } from '../../shared/cover-view';
import { FieldDraft, diffField, draftFromField, newDraft, toInput, validateDrafts } from './field-draft';
import { FieldEditor } from './field-editor';

@Component({
  selector: 'app-collection-builder',
  imports: [CdkDropList, CdkDrag, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, RouterLink, FieldEditor, CoverView],
  template: `
    <div class="page-narrow">
      <h1>{{ isEdit() ? 'Edit tracker' : 'New tracker' }}</h1>
      <p class="muted lead">Describe what you want to track. Add fields for the details you care about.</p>

      @if (isEdit() && existing.isLoading() && !hydrated()) {
        <p class="muted">Loading…</p>
      } @else {
        <!-- cover + icon -->
        <div class="hero" [style.background]="coverCss()">
          @if (showExistingImage()) { <app-cover-view class="fill" [cover]="cover()" [collectionId]="id()!" /> }
          <button type="button" mat-flat-button class="cover-btn" (click)="pickCover()">
            <mat-icon>image</mat-icon> {{ hasCover() ? 'Change cover' : 'Add cover' }}
          </button>
        </div>
        <div class="icon-row">
          <div class="big-icon" aria-hidden="true">{{ icon() }}</div>
          <div class="emojis" role="group" aria-label="Choose an icon">
            @for (e of emojis; track e) {
              <button type="button" class="emoji" [class.on]="icon() === e" [attr.aria-pressed]="icon() === e" (click)="icon.set(e)">{{ e }}</button>
            }
          </div>
          <mat-form-field appearance="outline" class="custom-emoji" subscriptSizing="dynamic">
            <mat-label>Or paste one</mat-label>
            <input matInput maxlength="16" (input)="onCustomIcon($event)" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Name</mat-label>
          <input matInput maxlength="100" [value]="name()" (input)="name.set(text($event))" placeholder="e.g. Movies, Hangouts, Car maintenance" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Description (optional)</mat-label>
          <textarea matInput rows="2" maxlength="1000" [value]="description()" (input)="description.set(text($event))"></textarea>
        </mat-form-field>

        <div class="row fields-head">
          <h2>Fields</h2>
          <span class="spacer"></span>
          <button mat-stroked-button type="button" (click)="addField()"><mat-icon>add</mat-icon> Add field</button>
        </div>

        @if (fields().length === 0) {
          <div class="empty-state small">
            <p>No fields yet. Add the details you want to record, like a date, a rating or a person.</p>
          </div>
        }

        <div cdkDropList (cdkDropListDropped)="drop($event)">
          @for (f of fields(); track f.cid; let i = $index) {
            <div cdkDrag class="drag-row">
              <app-field-editor [field]="f" (fieldChange)="updateField(i, $event)" [collections]="targets()" [index]="i" [count]="fields().length"
                                (removed)="removeField(i)" (moveUp)="move(i, -1)" (moveDown)="move(i, 1)" />
            </div>
          }
        </div>

        @if (problems().length) {
          <div class="problems" role="alert">
            <strong>Please fix:</strong>
            <ul>@for (p of problems(); track p) { <li>{{ p }}</li> }</ul>
          </div>
        }

        <div class="row actions">
          <a mat-button [routerLink]="isEdit() ? ['/collections', id()] : ['/']">Cancel</a>
          <span class="spacer"></span>
          <button mat-flat-button type="button" [disabled]="saving()" (click)="save()">
            {{ saving() ? 'Saving…' : isEdit() ? 'Save changes' : 'Create tracker' }}
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    h1 { font-size: 2.1rem; }
    .lead { margin: 4px 0 20px; }
    .hero { position: relative; height: 150px; border-radius: 20px; border: 1px solid var(--mat-sys-outline-variant); }
    .fill { position: absolute; inset: 0; border-radius: inherit; overflow: hidden; }
    .cover-btn { z-index: 1; position: absolute; right: 12px; bottom: 12px; }
    .icon-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin: -28px 0 20px 16px; }
    .big-icon { width: 68px; height: 68px; border-radius: 18px; display: grid; place-items: center; font-size: 36px; background: var(--mat-sys-surface); border: 1px solid var(--mat-sys-outline-variant); box-shadow: var(--mat-sys-level1); }
    .emojis { display: flex; flex-wrap: wrap; gap: 4px; max-width: 480px; margin-top: 30px; }
    .emoji { font-size: 20px; width: 38px; height: 38px; border-radius: 10px; border: 1px solid transparent; background: none; cursor: pointer; }
    .emoji.on { border-color: var(--mat-sys-primary); background: var(--mat-sys-primary-container); }
    .custom-emoji { width: 130px; margin-top: 30px; }
    .fields-head { margin: 16px 0 8px; }
    .drag-row { display: block; }
    .cdk-drag-preview { box-shadow: var(--mat-sys-level4); border-radius: 12px; }
    .cdk-drag-placeholder { opacity: .3; }
    .small { padding: 24px; }
    .problems { margin: 16px 0; padding: 12px 16px; border-radius: 12px; background: var(--mat-sys-error-container); color: var(--mat-sys-on-error-container); }
    .problems ul { margin: 6px 0 0; padding-left: 20px; }
    .actions { margin-top: 24px; }
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
  protected readonly isEdit = computed(() => !!this.id());

  protected readonly existing = httpResource<CollectionDetail>(() => {
    const id = this.id();
    return id ? `/api/collections/${id}` : undefined;
  });
  private readonly all = httpResource<CollectionSummary[]>(() => '/api/collections');
  protected readonly targets = computed(() => this.all.value() ?? []);

  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly icon = signal('📁');
  protected readonly fields = signal<FieldDraft[]>([]);
  protected readonly cover = signal<Cover>({ type: 'none' });
  protected readonly pendingCover = signal<CoverSelection | null>(null);
  private readonly pendingImageUrl = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly problems = signal<string[]>([]);
  protected readonly hydrated = signal(false);
  private original: Field[] = [];

  protected readonly hasCover = computed(() => {
    const p = this.pendingCover();
    return p ? p.type !== 'none' : this.cover().type !== 'none';
  });

  protected readonly showExistingImage = computed(() => !this.pendingCover() && this.cover().type === 'image' && !!this.id());

  protected readonly coverCss = computed(() => {
    const p = this.pendingCover();
    if (p?.type === 'image') return `center / cover url(${this.pendingImageUrl()})`;
    if (p?.type === 'gradient' || p?.type === 'color') return coverBackground({ type: p.type, value: p.value });
    if (p?.type === 'none') return fallbackBackground(this.id() ?? 'new');
    const c = this.cover();
    if (c.type === 'image' && this.id()) return null; // shown through the picker preview instead
    return coverBackground(c) ?? fallbackBackground(this.id() ?? 'new');
  });

  constructor() {
    effect(() => {
      const c = this.existing.value();
      if (!c || untracked(this.hydrated)) return;
      untracked(() => {
        this.hydrated.set(true);
        this.name.set(c.name);
        this.description.set(c.description ?? '');
        this.icon.set(c.icon);
        this.cover.set(c.cover);
        this.original = c.fields;
        this.fields.set(c.fields.map(draftFromField));
      });
    });
  }

  protected text(e: Event): string { return (e.target as HTMLInputElement).value; }

  protected onCustomIcon(e: Event): void {
    const v = this.text(e).trim();
    if (v) this.icon.set(v);
  }

  protected addField(): void { this.fields.update((l) => [...l, newDraft()]); }
  protected removeField(i: number): void { this.fields.update((l) => l.filter((_, idx) => idx !== i)); }
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
      .open<CoverPickerDialog, { cover: Cover; collectionId: string | null }, CoverSelection>(CoverPickerDialog, {
        data: { cover: this.cover(), collectionId: this.id() ?? null },
        width: '560px',
      })
      .afterClosed()
      .subscribe((selection) => {
        if (!selection) return;
        const previous = this.pendingImageUrl();
        if (previous) URL.revokeObjectURL(previous);
        this.pendingImageUrl.set(selection.type === 'image' ? URL.createObjectURL(selection.blob) : null);
        this.pendingCover.set(selection);
      });
  }

  protected async save(): Promise<void> {
    const problems: string[] = [];
    if (!this.name().trim()) problems.push('Give your tracker a name.');
    problems.push(...validateDrafts(this.fields()));
    this.problems.set(problems);
    if (problems.length) return;

    this.saving.set(true);
    try {
      const id = this.id();
      const target = id ? await this.saveExisting(id) : await this.saveNew();
      this.notify.info(id ? 'Changes saved.' : 'Tracker created.');
      await this.router.navigate(['/collections', target]);
    } catch (err) {
      const errors = fieldErrors(err);
      const list = Object.entries(errors).flatMap(([key, msgs]) => msgs.map((m) => `${key.replace(/^fields\[(\d+)\]\./, (_, n) => `Field ${Number(n) + 1}: `)} ${m}`));
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
      cover: p && p.type !== 'image' ? (p.type === 'none' ? null : { type: p.type, value: p.value }) : null,
      fields: this.fields().map(toInput),
    };
    const created = await this.api.create(body);
    if (p?.type === 'image') {
      try { await this.api.applyCover(created.id, p); } catch { this.notify.error('Tracker created, but the cover image could not be uploaded.'); }
    }
    return created.id;
  }

  private async saveExisting(id: string): Promise<string> {
    await this.api.update(id, { name: this.name().trim(), description: this.description().trim(), icon: this.icon() });

    const drafts = this.fields();
    const kept = new Set(drafts.filter((d) => d.id).map((d) => d.id));
    for (const f of this.original) if (!kept.has(f.id)) await this.api.removeField(f.id);

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
