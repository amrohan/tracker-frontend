import { Field } from "../../core/models";

export type DateOrder = "dmy" | "mdy" | "ymd";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Suggests a field for each header (exact name first, then partial). Each field is used at most once. */
export function suggestMapping(
  headers: string[],
  fields: Field[],
): (string | null)[] {
  const used = new Set<string>();
  return headers.map((h) => {
    const n = norm(h);
    const hit =
      fields.find(
        (f) => !used.has(f.id) && (norm(f.name) === n || norm(f.key) === n),
      ) ??
      fields.find(
        (f) =>
          !used.has(f.id) &&
          n.length > 2 &&
          (norm(f.name).includes(n) || n.includes(norm(f.name))),
      );
    if (hit) used.add(hit.id);
    return hit?.id ?? null;
  });
}

export function guessDateOrder(samples: string[]): DateOrder {
  let dmy = 0;
  let mdy = 0;
  for (const raw of samples) {
    const s = raw.trim();
    if (/^\d{4}[/.-]/.test(s)) return "ymd";
    const m = /^(\d{1,2})[/.-](\d{1,2})[/.-]\d{2,4}/.exec(s);
    if (m) {
      if (+m[1] > 12) dmy++;
      else if (+m[2] > 12) mdy++;
    }
  }
  return mdy > dmy ? "mdy" : "dmy"; // ambiguous files default to day-first
}

export function guessDecimalComma(samples: string[]): boolean {
  return samples.some((s) =>
    /^\D*\d{1,3}(\.\d{3})*,\d{1,2}\D*$/.test(s.trim()),
  );
}
