import { supabaseAdmin } from "@/supabase/supabaseAdmin";

const cache = new Map(); // table -> Set(columns) | null

export async function getPublicTableColumns(tableName) {
  const key = String(tableName || "").trim();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);

  try {
    const { data, error } = await supabaseAdmin
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_schema", "public")
      .eq("table_name", key);

    if (error) {
      cache.set(key, null);
      return null;
    }

    const cols = new Set((data || []).map((r) => r.column_name).filter(Boolean));
    cache.set(key, cols);
    return cols;
  } catch {
    cache.set(key, null);
    return null;
  }
}

export function filterToKnownColumns(row, cols) {
  if (!row || typeof row !== "object") return row;
  if (!cols || !(cols instanceof Set) || cols.size === 0) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (cols.has(k)) out[k] = v;
  }
  return out;
}

