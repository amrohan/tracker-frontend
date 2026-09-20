import { Component, computed, inject, input, signal } from "@angular/core";

import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSelectModule } from "@angular/material/select";

import { Router, RouterLink } from "@angular/router";

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
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
  ],

  template: `
    <div class="page-narrow wide">
      <a mat-button [routerLink]="['/collections', id()]">
        <mat-icon>arrow_back</mat-icon>
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
        <mat-progress-bar mode="indeterminate" />
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
                <mat-icon>upload_file</mat-icon>

                Choose file

                <input
                  type="file"
                  accept=".csv,.tsv,.txt,.xlsx"
                  hidden
                  (change)="onFile($event)"
                />
              </label>

              <mat-form-field
                appearance="outline"
                subscriptSizing="dynamic"
                class="enc"
              >
                <mat-label>CSV encoding</mat-label>

                <mat-select
                  [value]="encoding()"
                  (selectionChange)="setEncoding($event.value)"
                >
                  <mat-option value="UTF-8"> UTF-8 </mat-option>

                  <mat-option value="windows-1252">
                    Windows-1252 (older Excel)
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- ================================================ -->
            <!-- WORKSHEET SELECTOR                                -->
            <!-- ================================================ -->

            @if (showSheetSelector()) {
              <div class="sheet-selector">
                <mat-form-field appearance="outline" class="sheet-select">
                  <mat-label> Worksheet </mat-label>

                  <mat-select
                    [value]="selectedSheet()"
                    (selectionChange)="selectSheet($event.value)"
                  >
                    @for (s of workbook()?.sheets ?? []; track s.name) {
                      <mat-option [value]="s.name">
                        {{ s.name }}
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>
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
                  mat-flat-button
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
                      <mat-form-field
                        appearance="outline"
                        subscriptSizing="dynamic"
                        class="sel"
                      >
                        <mat-label> Field </mat-label>

                        <mat-select
                          [value]="c.fieldId"
                          (selectionChange)="
                            patch(i, {
                              fieldId: $event.value,
                            })
                          "
                        >
                          <mat-option [value]="null">
                            — Skip this column —
                          </mat-option>

                          @for (f of ctx.fields(); track f.id) {
                            <mat-option
                              [value]="f.id"
                              [disabled]="usedElsewhere(f.id, i)"
                            >
                              {{ f.name }}
                            </mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    </td>

                    <td>
                      @if (isDateLike(c)) {
                        <mat-form-field
                          appearance="outline"
                          subscriptSizing="dynamic"
                          class="fmt"
                        >
                          <mat-label> Date order </mat-label>

                          <mat-select
                            [value]="c.dateOrder"
                            (selectionChange)="
                              patch(i, {
                                dateOrder: $event.value,
                              })
                            "
                          >
                            <mat-option value="dmy">
                              Day / Month / Year
                            </mat-option>

                            <mat-option value="mdy">
                              Month / Day / Year
                            </mat-option>

                            <mat-option value="ymd">
                              Year / Month / Day
                            </mat-option>
                          </mat-select>
                        </mat-form-field>
                      }

                      @if (isNumeric(c)) {
                        <mat-checkbox
                          [checked]="c.decimalComma"
                          (change)="
                            patch(i, {
                              decimalComma: $event.checked,
                            })
                          "
                        >
                          Comma is the decimal mark (1.234,56)
                        </mat-checkbox>
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
            <button mat-button (click)="backToFile()">
              <mat-icon>arrow_back</mat-icon>
              Choose another file
            </button>

            <span class="spacer"></span>

            <button
              mat-flat-button
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
            <mat-checkbox
              [checked]="skipInvalid()"
              (change)="setSkip($event.checked)"
            >
              Skip rows with problems and import the rest
            </mat-checkbox>

            @if (hasReference()) {
              <mat-form-field
                appearance="outline"
                subscriptSizing="dynamic"
                class="sel"
              >
                <mat-label> Person / reference not found </mat-label>

                <mat-select
                  [value]="missingReference()"
                  (selectionChange)="setPolicy('ref', $event.value)"
                >
                  <mat-option value="error"> Report a problem </mat-option>

                  <mat-option value="skip"> Leave that value empty </mat-option>

                  <mat-option value="create">
                    Create the missing record
                  </mat-option>
                </mat-select>
              </mat-form-field>
            }

            @if (hasChoice()) {
              <mat-form-field
                appearance="outline"
                subscriptSizing="dynamic"
                class="sel"
              >
                <mat-label> Unknown select option </mat-label>

                <mat-select
                  [value]="missingOption()"
                  (selectionChange)="setPolicy('opt', $event.value)"
                >
                  <mat-option value="error"> Report a problem </mat-option>

                  <mat-option value="skip"> Leave that value empty </mat-option>

                  <mat-option value="create">
                    Add it to the field's options
                  </mat-option>
                </mat-select>
              </mat-form-field>
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

                <button mat-button (click)="downloadErrors(r)">
                  <mat-icon>download</mat-icon>
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
            <button mat-button (click)="step.set('map')">
              <mat-icon>arrow_back</mat-icon>
              Back to mapping
            </button>

            <span class="spacer"></span>

            <button
              mat-flat-button
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
            <span class="material-icons"> task_alt </span>

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

            <div class="row" style="justify-content:center">
              <a mat-flat-button [routerLink]="['/collections', id()]">
                View records
              </a>

              <button mat-button (click)="reset()">Import another file</button>
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
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.9rem;
    }

    .steps li.on {
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
    }

    .upload {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 18px;
      border: 1px dashed var(--mat-sys-outline);
      border-radius: 12px;
      cursor: pointer;
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
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      vertical-align: middle;
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
      background: var(--mat-sys-surface-container-low);
      border: 1px solid var(--mat-sys-outline-variant);
    }

    .tile .n {
      font-size: 1.8rem;
      font-weight: 700;
      margin-right: 6px;
    }

    .tile.ok {
      background: var(--mat-sys-primary-container);
    }

    .tile.bad {
      background: var(--mat-sys-error-container);
    }

    .options {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
    }

    .actions {
      margin-top: 16px;
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
    {
      key: "file",
      label: "1 · File",
    },
    {
      key: "map",
      label: "2 · Map columns",
    },
    {
      key: "review",
      label: "3 · Review",
    },
    {
      key: "done",
      label: "4 · Done",
    },
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

    if (!workbook) {
      return false;
    }

    if (workbook.sheets.length === 1) {
      return false;
    }

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

      // CSV/TSV/TXT or XLSX with one worksheet.
      if (sheets.length === 1) {
        this.selectedSheet.set(sheets[0].name);

        await this.selectSheet(sheets[0].name);

        return;
      }

      // Multiple Excel worksheets.
      // Stay on step 1 and let the user select one.
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
    if (!sheetName) {
      return;
    }

    const workbook = this.workbook();

    if (!workbook) {
      return;
    }

    const selected = workbook.sheets.find((s) => s.name === sheetName);

    if (!selected) {
      return;
    }

    this.selectedSheet.set(sheetName);

    // For non-Excel files, the sheet already
    // contains its parsed rows.
    if (selected.rows.length > 0 || selected.headers.length > 0) {
      this.setSelectedSheet(selected);
      return;
    }

    if (!this.lastFile) {
      return;
    }

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

    if (!name) {
      return;
    }

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
