import { db } from "../db/knexfile";
import type { StagingRow } from "../types";

export async function detectConflicts(jobId: string, schoolId: string): Promise<void> {
  await detectIntraBatchDuplicates(jobId);
  await detectClassDuplicates(jobId);
  await detectProdCollisions(jobId, schoolId);
  await detectClassProdCollisions(jobId, schoolId);
}

async function detectClassDuplicates(jobId: string): Promise<void> {
  const rows: StagingRow[] = await db("import_staging_rows").where({
    job_id: jobId,
    entity_type: "class",
    status: "valid",
  });

  const seen = new Map<string, number>(); // class_code -> first row id

  for (const row of rows) {
    const code = (row.edited_data ?? row.raw_data).class_code;
    if (seen.has(code)) {
      await flagConflict(row.id, "intra_batch_duplicate");
      await flagConflict(seen.get(code)!, "intra_batch_duplicate");
    } else {
      seen.set(code, row.id);
    }
  }
}

async function detectIntraBatchDuplicates(jobId: string): Promise<void> {
  const rows: StagingRow[] = await db("import_staging_rows").where({
    job_id: jobId,
    entity_type: "student",
    status: "valid",
  });

  const seen = new Map<string, number>(); // email -> first row id

  for (const row of rows) {
    const email = (row.edited_data ?? row.raw_data).email;
    if (seen.has(email)) {
      // flag both the first and the repeat
      await flagConflict(row.id, "intra_batch_duplicate");
      await flagConflict(seen.get(email)!, "intra_batch_duplicate");
    } else {
      seen.set(email, row.id);
    }
  }
}

async function detectProdCollisions(jobId: string, schoolId: string): Promise<void> {
  const rows: StagingRow[] = await db("import_staging_rows").where({
    job_id: jobId,
    entity_type: "student",
    status: "valid",
  });

  for (const row of rows) {
    const existing = await db("students")
      .where({ school_id: schoolId, email: (row.edited_data ?? row.raw_data).email })
      .first();

    if (existing) {
      await db("import_staging_rows")
        .where({ id: row.id })
        .update({ conflict_type: "prod_collision", matched_entity_id: existing.id, status: "conflict" });
    }
  }
}

async function flagConflict(rowId: number, type: "intra_batch_duplicate"): Promise<void> {
  await db("import_staging_rows").where({ id: rowId }).update({ status: "conflict", conflict_type: type });
}

async function detectClassProdCollisions(jobId: string, schoolId: string): Promise<void> {
  const rows: StagingRow[] = await db("import_staging_rows").where({
    job_id: jobId,
    entity_type: "class",
    status: "valid",
  });

  for (const row of rows) {
    const code = (row.edited_data ?? row.raw_data).class_code;
    const existing = await db("classes").where({ school_id: schoolId, class_code: code }).first();

    if (existing) {
      await db("import_staging_rows")
        .where({ id: row.id })
        .update({ conflict_type: "prod_collision", matched_entity_id: existing.id, status: "conflict" });
    }
  }
}