import { Field, TrackerRecord } from "../../core/models";

/** True when a record has a non-empty value for this field (cards skip empty ones to stay compact). */
export function hasVisibleValue(record: TrackerRecord, field: Field): boolean {
  const v = record.values[field.key];
  return !(
    v === null ||
    v === undefined ||
    v === "" ||
    (Array.isArray(v) && v.length === 0)
  );
}

/** Short label used in the desktop table's aggregate footer ("Total", "Avg", ...). */
export function aggregationShortLabel(
  aggregation: "count" | "sum" | "average" | "min" | "max" | "none",
): string {
  return {
    count: "Count",
    sum: "Total",
    average: "Avg",
    min: "Min",
    max: "Max",
    none: "",
  }[aggregation];
}

/** A record's display label from its title field, with a safe fallback for menus and confirm dialogs. */
export function recordLabel(
  record: TrackerRecord,
  titleFieldKey: string | undefined,
  fallback = "this record",
): string {
  const value = titleFieldKey ? record.values[titleFieldKey] : null;
  return typeof value === "string" && value ? value : fallback;
}
