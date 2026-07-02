import { parse } from "csv-parse";
import type { EntityType, RawRecord } from "../types";

// each source file is for one entity type - keeps parser dumb, no sniffing
export async function* parseCsv(file: Buffer, entityType: EntityType): AsyncGenerator<RawRecord> {
  const parser = parse(file, { columns: true, skip_empty_lines: true, trim: true });

  let rowNumber = 0;
  for await (const record of parser) {
    rowNumber++;
    yield { rowNumber, entityType, data: record as Record<string, string> };
  }
}
