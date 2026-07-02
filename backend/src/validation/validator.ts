import { db } from "../db/knexfile";
import { schemas } from "./schemas";
import type { StagingRow } from "../types";

export async function runSchemaValidation(jobId: string): Promise<void> {
  const rows: StagingRow[] = await db("import_staging_rows")
    .where({ job_id: jobId })
    .whereNotIn("status", ["skip", "overwrite_existing", "committed", "commit_failed"]);

  for (const row of rows) {
    const schema = schemas[row.entity_type];
    const data = row.edited_data ?? row.raw_data;
    const result = schema.safeParse(data);

    if (result.success) {
      await db("import_staging_rows").where({ id: row.id }).update({ status: "valid", errors: "[]" });
    } else {
      const errors = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
      await db("import_staging_rows")
        .where({ id: row.id })
        .update({ status: "schema_error", errors: JSON.stringify(errors) });
    }
  }
}

// second pass: class.teacher_email / student.class_code must resolve to something
// in the same file or already in prod. keep it simple - just class_code check for MVP.
export async function runReferenceValidation(jobId: string, schoolId: string): Promise<void> {
  const classRows: StagingRow[] = await db("import_staging_rows").where({
    job_id: jobId,
    entity_type: "class",
  });
  const knownClassCodes = new Set(classRows.map((r) => (r.edited_data ?? r.raw_data).class_code));

  const prodClasses = await db("classes").where({ school_id: schoolId }).select("class_code");
  prodClasses.forEach((c: { class_code: string }) => knownClassCodes.add(c.class_code));

  const studentRows: StagingRow[] = await db("import_staging_rows").where({
    job_id: jobId,
    entity_type: "student",
    status: "valid",
  });

  for (const row of studentRows) {
    const classCode = (row.edited_data ?? row.raw_data).class_code;
    if (!knownClassCodes.has(classCode)) {
      await db("import_staging_rows")
        .where({ id: row.id })
        .update({
          status: "reference_error",
          errors: JSON.stringify([{ field: "class_code", message: `class ${classCode} not found` }]),
        });
    }
  }
}