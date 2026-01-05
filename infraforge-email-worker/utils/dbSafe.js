export function db(v) {
  if (v === undefined || v === null) return "";
  if (typeof v === "number" && Number.isNaN(v)) return 0;
  return v;
}

