import { db } from "../db/knexfile";
import { parseCsv } from "../parsers/csv.parser";
import { runSchemaValidation, runReferenceValidation } from "../validation/validator";
import { detectConflicts } from "../validation/conflictDetector";
import type { EntityType, ImportJob } from "../types";

export async function startImport(
  schoolId: string,
  files: { entityType: EntityType; buffer: Buffer }[]
): Promise<ImportJob> {
  const [job] = await db("import_jobs")
    .insert({ school_id: schoolId, source_system: "csv", file_url: "n/a", status: "pending" })
    .returning("*");

  let total = 0;
  for (const file of files) {
    const batch: Record<string, unknown>[] = [];
    for await (const record of parseCsv(file.buffer, file.entityType)) {
      batch.push({
        job_id: job.id,
        row_number: record.rowNumber,
        entity_type: record.entityType,
        raw_data: JSON.stringify(record.data),
      });
      total++;
    }
    if (batch.length) await db("import_staging_rows").insert(batch);
  }

  await db("import_jobs").where({ id: job.id }).update({ total_rows: total, status: "validating" });

  await runSchemaValidation(job.id);
  await runReferenceValidation(job.id, schoolId);
  await detectConflicts(job.id, schoolId);

  const hasIssues = await db("import_staging_rows")
    .where({ job_id: job.id })
    .whereNotIn("status", ["valid"])
    .first();

  const finalStatus = hasIssues ? "needs_review" : "queued_ready";
  const [updated] = await db("import_jobs").where({ id: job.id }).update({ status: finalStatus }).returning("*");
  return updated;
}

// re-run validation after admin edits/resolves rows on frontend
export async function revalidate(jobId: string, schoolId: string): Promise<ImportJob> {
  await runSchemaValidation(jobId);
  await runReferenceValidation(jobId, schoolId);
  await detectConflicts(jobId, schoolId);

  const hasIssues = await db("import_staging_rows")
    .where({ job_id: jobId })
    .whereNotIn("status", ["valid"])
    .first();

  const [updated] = await db("import_jobs")
    .where({ id: jobId })
    .update({ status: hasIssues ? "needs_review" : "queued_ready" })
    .returning("*");
  return updated;
}
