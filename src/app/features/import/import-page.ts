import { Component, computed, inject, input, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCheckboxModule } from "ng-zorro-antd/checkbox";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzSelectModule } from "ng-zorro-antd/select";
import { NzSpinModule } from "ng-zorro-antd/spin";

import { bindCollectionId } from "../../core/collection-context";
import { FieldTypeCatalog } from "../../core/field-types.service";
import { problemMessage } from "../../core/http-errors";
import { ImportApi } from "../../core/import-api.service";
import {
  Field,
  ImportRequest,
  ImportResult,
  MissingPolicy,
} from "../../core/models";
import { Notify } from "../../core/notify.service";
import {
  DateOrder,
  guessDateOrder,
  guessDecimalComma,
  suggestMapping,
} from "./mapping";
import {
  MAX_ROWS,
  Sheet,
  Workbook,
  parseFile,
  readExcelSheet,
} from "./parse-file";

type Step = "file" | "map" | "review" | "done";

interface ColumnMap {
  index: number;
  header: string;
  samples: string[];
  fieldId: string | null;
  dateOrder: DateOrder;
  decimalComma: boolean;
}

@Component({
  selector: "app-import-page",
  imports: [
    FormsModule,
    RouterLink,
    NzButtonModule,
    NzCheckboxModule,
    NzIconModule,
    NzSelectModule,
    NzSpinModule,
  ],
  template: `
    <div class="page-narrow wide">
      <a nz-button nzType="text" class="back" [routerLink]="['/collections', id()]">
        <nz-icon nzType="arrow-left" />
        {{ ctx.detail.value()?.name ?? "Back" }}
      </a>

      <h1>Import records</h1>

      <ol class="steps" aria-label="Import steps">
        @for (s of stepList; track s.key) {
          <li
            [class.on]="step() === s.key"
            [attr.aria-current]="step() === s.key ? 'step' : null"
          >
            {{ s.label }}
          </li>
        }
      </ol>

      @if (busy()) {
        <div class="loading-state">
          <nz-spin nzSimple />
        </div>
      }

      @if (ctx.detail.hasValue()) {
        <!-- ===================================================== -->
        <!-- 1. FILE                                               -->
        <!-- ===================================================== -->

        @if (step() === "file") {
          <div class="surface-card">
            <p>
              Choose a
              <strong>.csv</strong>, <strong>.tsv</strong>,
              <strong>.txt</strong>
              or
              <strong>.xlsx</strong>
              file. The first row must contain column names. Up to
              {{ maxRows }} rows per import.
            </p>

            <div class="row">
              <label class="upload">
                <nz-icon nzType="upload" />
                <span>Choose file</span>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,.xlsx"
                  hidden
                  (change)="onFile($event)"
                />
              </label>

              <div class="enc-wrap">
                <label class="field-label">CSV encoding</label>
                <nz-select
                  [ngModel]="encoding()"
                  (ngModelChange)="setEncoding($event)"
                  class="enc"
                >
                  <nz-option nzValue="UTF-8" nzLabel="UTF-8" />
                  <nz-option
                    nzValue="windows-1252"
                    nzLabel="Windows-1252 (older Excel)"
                  />
                </nz-select>
              </div>
            </div>

            <!-- ================================================ -->
            <!-- WORKSHEET SELECTOR                                -->
            <!-- ================================================ -->

            @if (showSheetSelector()) {
              <div class="sheet-selector">
                <label class="field-label">Worksheet</label>
                <nz-select
                  [ngModel]="selectedSheet()"
                  (ngModelChange)="selectSheet($event)"
                  class="sheet-select"
                >
                  @for (s of workbook()?.sheets ?? []; track s.name) {
                    <nz-option [nzValue]="s.name" [nzLabel]="s.name" />
                  }
                </nz-select>
              </div>
            }

            @if (parseError(); as msg) {
              <p class="field-error" role="alert">
                {{ msg }}
              </p>
            }

            @if (canSelectSheet()) {
              <div class="row actions">
                <span class="muted">
                  {{ workbook()?.sheets?.length }}
                  worksheets found.
                </span>

                <span class="spacer"></span>

                <button
                  nz-button
                  nzType="primary"
                  [disabled]="busy()"
                  (click)="continueWithSelectedSheet()"
                >
                  Continue
                </button>
              </div>
            }
          </div>
        }

        <!-- ===================================================== -->
        <!-- 2. MAP                                                -->
        <!-- ===================================================== -->

        @if (step() === "map") {
          <p class="muted">
            {{ fileName() }}

            @if (sheet()?.name) {
              · {{ sheet()?.name }}
            }

            · {{ sheet()?.rows?.length }} rows. Match each column to a field, or
            skip it.
          </p>

          <div class="surface-card scroll">
            <table>
              <thead>
                <tr>
                  <th>Column in file</th>
                  <th>Example values</th>
                  <th>Import into</th>
                  <th>Format</th>
                </tr>
              </thead>

              <tbody>
                @for (c of columns(); track c.index; let i = $index) {
                  <tr>
                    <td>
                      <strong>
                        {{ c.header }}
                      </strong>
                    </td>

                    <td class="muted samples">
                      {{ c.samples.join(" · ") }}
                    </td>

                    <td>
                      <nz-select
                        [ngModel]="c.fieldId"
                        (ngModelChange)="
                          patch(i, {
                            fieldId: $event,
                          })
                        "
                        class="sel"
                        nzPlaceHolder="— Skip this column —"
                      >
                        <nz-option
                          [nzValue]="null"
                          nzLabel="— Skip this column —"
                        />

                        @for (f of ctx.fields(); track f.id) {
                          <nz-option
                            [nzValue]="f.id"
                            [nzLabel]="f.name"
                            [nzDisabled]="usedElsewhere(f.id, i)"
                          />
                        }
                      </nz-select>
                    </td>

                    <td>
                      @if (isDateLike(c)) {
                        <nz-select
                          [ngModel]="c.dateOrder"
                          (ngModelChange)="
                            patch(i, {
                              dateOrder: $event,
                            })
                          "
                          class="fmt"
                        >
                          <nz-option
                            nzValue="dmy"
                            nzLabel="Day / Month / Year"
                          />
                          <nz-option
                            nzValue="mdy"
                            nzLabel="Month / Day / Year"
                          />
                          <nz-option
                            nzValue="ymd"
                            nzLabel="Year / Month / Day"
                          />
                        </nz-select>
                      }

                      @if (isNumeric(c)) {
                        <label
                          nz-checkbox
                          [ngModel]="c.decimalComma"
                          (ngModelChange)="
                            patch(i, {
                              decimalComma: $event,
                            })
                          "
                        >
                          Comma is decimal mark (1.234,56)
                        </label>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (missingRequired().length) {
            <p class="field-error" role="alert">
              Required fields not mapped yet:
              {{ names(missingRequired()) }}.
            </p>
          }

          <div class="row actions">
            <button nz-button nzType="default" (click)="backToFile()">
              <nz-icon nzType="arrow-left" />
              Choose another file
            </button>

            <span class="spacer"></span>

            <button
              nz-button
              nzType="primary"
              [disabled]="!canContinue()"
              (click)="toReview()"
            >
              Check my data
            </button>
          </div>
        }

        <!-- ===================================================== -->
        <!-- 3. REVIEW                                             -->
        <!-- ===================================================== -->

        @if (step() === "review") {
          @if (result(); as r) {
            <div class="tiles">
              <div class="tile ok">
                <span class="n">
                  {{ r.valid }}
                </span>
                ready to import
              </div>

              <div class="tile" [class.bad]="r.errorCount > 0">
                <span class="n">
                  {{ r.errorCount }}
                </span>
                problems
              </div>

              <div class="tile">
                <span class="n">
                  {{ r.total }}
                </span>
                rows in file
              </div>
            </div>
          }

          <div class="surface-card options">
            <label
              nz-checkbox
              [ngModel]="skipInvalid()"
              (ngModelChange)="setSkip($event)"
            >
              Skip rows with problems and import the rest
            </label>

            @if (hasReference()) {
              <div class="policy-group">
                <label class="field-label">Person / reference not found</label>
                <nz-select
                  [ngModel]="missingReference()"
                  (ngModelChange)="setPolicy('ref', $event)"
                  class="sel"
                >
                  <nz-option nzValue="error" nzLabel="Report a problem" />
                  <nz-option nzValue="skip" nzLabel="Leave that value empty" />
                  <nz-option nzValue="create" nzLabel="Create the missing record" />
                </nz-select>
              </div>
            }

            @if (hasChoice()) {
              <div class="policy-group">
                <label class="field-label">Unknown select option</label>
                <nz-select
                  [ngModel]="missingOption()"
                  (ngModelChange)="setPolicy('opt', $event)"
                  class="sel"
                >
                  <nz-option nzValue="error" nzLabel="Report a problem" />
                  <nz-option nzValue="skip" nzLabel="Leave that value empty" />
                  <nz-option
                    nzValue="create"
                    nzLabel="Add it to the field's options"
                  />
                </nz-select>
              </div>
            }
          </div>

          @if (result(); as r) {
            @if (r.errors.length) {
              <div class="surface-card scroll errors">
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Field</th>
                      <th>Problem</th>
                    </tr>
                  </thead>

                  <tbody>
                    @for (e of r.errors; track $index) {
                      <tr>
                        <td>{{ e.row + 1 }}</td>
                        <td>{{ e.field }}</td>
                        <td>{{ e.message }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <p class="muted">
                Row numbers match the row in your file (row 1 is the header).

                @if (r.errorCount > r.errors.length) {
                  Showing the first
                  {{ r.errors.length }}
                  of
                  {{ r.errorCount }}.
                }

                <button nz-button nzType="text" (click)="downloadErrors(r)">
                  <nz-icon nzType="download" />
                  Download problem list
                </button>
              </p>
            }

            @if (r.errorCount > 0 && !skipInvalid()) {
              <p class="field-error" role="alert">
                Fix the file, or tick “Skip rows with problems”, to import.
              </p>
            }
          }

          <div class="row actions">
            <button nz-button nzType="default" (click)="step.set('map')">
              <nz-icon nzType="arrow-left" />
              Back to mapping
            </button>

            <span class="spacer"></span>

            <button
              nz-button
              nzType="primary"
              [disabled]="!canImport() || busy()"
              (click)="runImport()"
            >
              Import
              {{ result()?.valid ?? 0 }}
              records
            </button>
          </div>
        }

        <!-- ===================================================== -->
        <!-- 4. DONE                                               -->
        <!-- ===================================================== -->

        @if (step() === "done") {
          <div class="empty-state">
            <nz-icon nzType="check-circle" class="done-icon" />

            <h3>
              Imported
              {{ result()?.imported }}
              records
            </h3>

            @if (result()?.errorCount) {
              <p>
                {{ result()?.errorCount }}
                rows were skipped.
              </p>
            }

            <div class="row done-actions">
              <a nz-button nzType="primary" [routerLink]="['/collections', id()]">
                View records
              </a>

              <button nz-button nzType="default" (click)="reset()">
                Import another file
              </button>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .wide {
      max-width: 1000px;
    }

    .back {
      margin-left: -8px;
      margin-bottom: 8px;
    }

    h1 {
      font-size: 2rem;
      margin: 8px 0 12px;
    }

    .steps {
      display: flex;
      gap: 8px;
      list-style: none;
      padding: 0;
      margin: 0 0 16px;
      flex-wrap: wrap;
    }

    .steps li {
      padding: 4px 14px;
      border-radius: 999px;
      background: var(--app-surface-container);
      color: var(--app-text-muted);
      font-size: 0.9rem;
    }

    .steps li.on {
      background: var(--app-primary);
      color: var(--app-on-primary);
    }

    .loading-state {
      display: flex;
      justify-content: center;
      padding: 24px 0;
    }

    .row {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .upload {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 18px;
      border: 1px dashed var(--app-outline);
      border-radius: 12px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.15s ease;
    }
    .upload:hover {
      border-color: var(--app-primary);
      color: var(--app-primary);
    }

    .field-label {
      display: block;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--app-text-muted);
      margin-bottom: 4px;
    }

    .enc-wrap {
      display: flex;
      flex-direction: column;
    }

    .enc {
      width: 240px;
    }

    .sheet-selector {
      margin-top: 20px;
    }

    .sheet-select {
      width: 320px;
    }

    .sel {
      width: 240px;
    }

    .fmt {
      width: 220px;
    }

    .scroll {
      overflow: auto;
      padding: 0;
      margin: 12px 0;
      border-radius: 14px;
      border: 1px solid var(--app-outline-variant);
      background: var(--app-surface);
    }

    .errors {
      max-height: 300px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      text-align: left;
      padding: 10px 14px;
      border-bottom: 1px solid var(--app-outline-variant);
      vertical-align: middle;
      font-size: 0.9rem;
    }

    th {
      background: var(--app-surface-container);
      font-weight: 600;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .samples {
      max-width: 240px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tiles {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .tile {
      padding: 14px 20px;
      border-radius: 16px;
      background: var(--app-surface-container-low);
      border: 1px solid var(--app-outline-variant);
    }

    .tile .n {
      font-size: 1.8rem;
      font-weight: 700;
      margin-right: 6px;
    }

    .tile.ok {
      background: var(--app-primary-container);
      color: var(--app-on-primary-container);
    }

    .tile.bad {
      background: var(--app-error-container);
      color: var(--app-on-error-container);
    }

    .options {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 16px;
      padding: 16px;
      border-radius: 14px;
      border: 1px solid var(--app-outline-variant);
      background: var(--app-surface);
      margin-bottom: 16px;
    }

    .policy-group {
      display: flex;
      flex-direction: column;
    }

    .actions {
      margin-top: 16px;
    }

    .spacer {
      flex: 1;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 16px;
      text-align: center;
    }

    .done-icon {
      font-size: 48px;
      color: var(--app-primary);
      margin-bottom: 12px;
    }

    .done-actions {
      margin-top: 20px;
      justify-content: center;
    }
  `,
})
export class ImportPage {
  readonly id = input.required<string>();

  protected readonly ctx = bindCollectionId(this.id);
  private readonly api = inject(ImportApi);
  private readonly catalog = inject(FieldTypeCatalog);
  private readonly notify = inject(Notify);
  private readonly router = inject(Router);

  protected readonly maxRows = MAX_ROWS;

  protected readonly stepList: {
    key: Step;
    label: string;
  }[] = [
    { key: "file", label: "1 · File" },
    { key: "map", label: "2 · Map columns" },
    { key: "review", label: "3 · Review" },
    { key: "done", label: "4 · Done" },
  ];

  protected readonly step = signal<Step>("file");
  protected readonly busy = signal(false);
  protected readonly encoding = signal("UTF-8");
  protected readonly fileName = signal("");
  protected readonly parseError = signal<string | null>(null);
  protected readonly workbook = signal<Workbook | null>(null);
  protected readonly sheet = signal<Sheet | null>(null);
  protected readonly selectedSheet = signal("");
  protected readonly columns = signal<ColumnMap[]>([]);
  protected readonly skipInvalid = signal(false);
  protected readonly missingReference = signal<MissingPolicy>("error");
  protected readonly missingOption = signal<MissingPolicy>("error");
  protected readonly result = signal<ImportResult | null>(null);
  private lastFile: File | null = null;

  protected readonly showSheetSelector = computed(
    () => (this.workbook()?.sheets.length ?? 0) > 1,
  );

  protected readonly canSelectSheet = computed(() => {
    const workbook = this.workbook();
    if (!workbook) return false;
    if (workbook.sheets.length === 1) return false;
    return !!this.selectedSheet();
  });

  private readonly mappedIds = computed(
    () =>
      new Set(
        this.columns()
          .map((c) => c.fieldId)
          .filter((x): x is string => !!x),
      ),
  );

  private readonly mappedFields = computed(() =>
    [...this.mappedIds()]
      .map((id) => this.ctx.fieldsById().get(id))
      .filter((f): f is Field => !!f),
  );

  protected readonly missingRequired = computed(() =>
    this.ctx
      .fields()
      .filter(
        (f) =>
          f.required && f.type !== "boolean" && !this.mappedIds().has(f.id),
      ),
  );

  protected readonly canContinue = computed(
    () => this.mappedIds().size > 0 && this.missingRequired().length === 0,
  );

  protected readonly hasReference = computed(() =>
    this.mappedFields().some(
      (f) => f.type === "reference" || f.type === "multiReference",
    ),
  );

  protected readonly hasChoice = computed(() =>
    this.mappedFields().some(
      (f) => f.type === "select" || f.type === "multiSelect",
    ),
  );

  protected readonly canImport = computed(() => {
    const r = this.result();
    return !!r && r.valid > 0 && (r.errorCount === 0 || this.skipInvalid());
  });

  // ============================================================
  // STEP 1
  // ============================================================

  protected async onFile(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (file) {
      await this.load(file);
    }
  }

  protected async setEncoding(value: string): Promise<void> {
    this.encoding.set(value);
    if (this.lastFile) {
      await this.load(this.lastFile);
    }
  }

  private async load(file: File): Promise<void> {
    this.lastFile = file;
    this.busy.set(true);
    this.parseError.set(null);
    this.workbook.set(null);
    this.sheet.set(null);
    this.selectedSheet.set("");
    this.columns.set([]);

    try {
      const workbook = await parseFile(file, this.encoding());
      this.workbook.set(workbook);
      this.fileName.set(file.name);

      const sheets = workbook.sheets;
      if (!sheets.length) {
        throw new Error("The file does not contain any worksheets.");
      }

      if (sheets.length === 1) {
        this.selectedSheet.set(sheets[0].name);
        await this.selectSheet(sheets[0].name);
        return;
      }

      this.step.set("file");
    } catch (err) {
      this.parseError.set(
        err instanceof Error ? err.message : "Could not read the file.",
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async selectSheet(sheetName: string): Promise<void> {
    if (!sheetName) return;

    const workbook = this.workbook();
    if (!workbook) return;

    const selected = workbook.sheets.find((s) => s.name === sheetName);
    if (!selected) return;

    this.selectedSheet.set(sheetName);

    if (selected.rows.length > 0 || selected.headers.length > 0) {
      this.setSelectedSheet(selected);
      return;
    }

    if (!this.lastFile) return;

    this.busy.set(true);
    this.parseError.set(null);

    try {
      const sheet = await readExcelSheet(this.lastFile, sheetName);
      if (sheet.rows.length > MAX_ROWS) {
        throw new Error(
          `This worksheet has ${sheet.rows.length} rows. Split it into files of ${MAX_ROWS} rows or fewer.`,
        );
      }
      this.setSelectedSheet(sheet);
    } catch (err) {
      this.parseError.set(
        err instanceof Error ? err.message : "Could not read the worksheet.",
      );
    } finally {
      this.busy.set(false);
    }
  }

  private setSelectedSheet(sheet: Sheet): void {
    this.sheet.set(sheet);
    this.selectedSheet.set(sheet.name);
    this.columns.set(this.buildColumns(sheet));
    this.step.set("map");
  }

  protected async continueWithSelectedSheet(): Promise<void> {
    const name = this.selectedSheet();
    if (!name) return;
    await this.selectSheet(name);
  }

  protected backToFile(): void {
    this.step.set("file");
  }

  // ============================================================
  // STEP 2
  // ============================================================

  private buildColumns(sheet: Sheet): ColumnMap[] {
    const suggested = suggestMapping(sheet.headers, this.ctx.fields());

    return sheet.headers.map((header, index) => {
      const values = sheet.rows
        .slice(0, 50)
        .map((r) => r[index])
        .filter((v): v is string => !!v);

      return {
        index,
        header,
        samples: values.slice(0, 3),
        fieldId: suggested[index],
        dateOrder: guessDateOrder(values),
        decimalComma: guessDecimalComma(values),
      };
    });
  }

  protected reset(): void {
    this.sheet.set(null);
    this.workbook.set(null);
    this.selectedSheet.set("");
    this.columns.set([]);
    this.result.set(null);
    this.lastFile = null;
    this.fileName.set("");
    this.parseError.set(null);
    this.step.set("file");
  }

  private fieldOf(c: ColumnMap): Field | undefined {
    return c.fieldId ? this.ctx.fieldsById().get(c.fieldId) : undefined;
  }

  protected isDateLike(c: ColumnMap): boolean {
    const f = this.fieldOf(c);
    const kind = f ? this.catalog.kind(f.type) : undefined;
    return kind === "date" || kind === "dateTime";
  }

  protected isNumeric(c: ColumnMap): boolean {
    const t = this.fieldOf(c)?.type;
    return t === "number" || t === "currency";
  }

  protected usedElsewhere(fieldId: string, index: number): boolean {
    return this.columns().some((c, i) => i !== index && c.fieldId === fieldId);
  }

  protected names(fields: Field[]): string {
    return fields.map((f) => f.name).join(", ");
  }

  protected patch(i: number, p: Partial<ColumnMap>): void {
    this.columns.update((list) =>
      list.map((c, idx) => (idx === i ? { ...c, ...p } : c)),
    );
  }

  // ============================================================
  // STEP 3
  // ============================================================

  protected async toReview(): Promise<void> {
    this.step.set("review");
    await this.check();
  }

  protected setSkip(v: boolean): void {
    this.skipInvalid.set(v);
  }

  protected setPolicy(which: "ref" | "opt", v: MissingPolicy): void {
    (which === "ref" ? this.missingReference : this.missingOption).set(v);
    void this.check();
  }

  private body(dryRun: boolean): ImportRequest {
    return {
      mappings: this.columns()
        .filter((c) => c.fieldId)
        .map((c) => ({
          column: c.index,
          fieldId: c.fieldId as string,
          dateOrder: c.dateOrder,
          decimalComma: c.decimalComma,
        })),
      rows: this.sheet()?.rows ?? [],
      options: {
        skipInvalidRows: this.skipInvalid(),
        missingReference: this.missingReference(),
        missingOption: this.missingOption(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      dryRun,
    };
  }

  protected async check(): Promise<void> {
    this.busy.set(true);
    try {
      this.result.set(await this.api.run(this.id(), this.body(true)));
    } catch (err) {
      this.notify.error(problemMessage(err, "Could not check the file."));
      this.step.set("map");
    } finally {
      this.busy.set(false);
    }
  }

  protected async runImport(): Promise<void> {
    this.busy.set(true);
    try {
      const r = await this.api.run(this.id(), this.body(false));
      this.result.set(r);
      if (r.committed) {
        this.step.set("done");
        this.ctx.detail.reload();
      } else {
        this.notify.error("Nothing was imported. Check the problems listed.");
      }
    } catch (err) {
      this.notify.error(
        problemMessage(err, "Import failed. Nothing was saved."),
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected downloadErrors(r: ImportResult): void {
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = [
      "Row,Field,Problem",
      ...r.errors.map((e) => `${e.row + 1},${q(e.field)},${q(e.message)}`),
    ].join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-problems.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
}
