import { Worker } from "bullmq";
import { connection } from "./importQueue";
import { db } from "../db/knexfile";
import { commitRow } from "../services/commitService";
import type { StagingRow } from "../types";

interface BatchPayload {
  jobId: string;
  schoolId: string;
  rowIds: number[];
}

new Worker<BatchPayload>(
  "import-batches",
  async (job) => {
    const { jobId, schoolId, rowIds } = job.data;
    const rows: StagingRow[] = await db("import_staging_rows").whereIn(
      "id",
      rowIds,
    );

    let failed = 0;
    for (const row of rows) {
      try {
        await db.transaction(async (trx) => {
          const entityId = await commitRow(row, schoolId, trx);
          await trx("import_staging_rows")
            .where({ id: row.id })
            .update({ status: "committed", matched_entity_id: entityId });
        });
      } catch (err) {
        failed++;
        await db("import_staging_rows")
          .where({ id: row.id })
          .update({
            status: "commit_failed",
            errors: JSON.stringify([{ field: "_row", message: String(err) }]),
          });
      }
    }

    await db("import_jobs")
      .where({ id: jobId })
      .increment("processed_rows", rows.length)
      .increment("failed_rows", failed);

    const remaining = await db("import_staging_rows")
      .where({ job_id: jobId })
      .whereIn("status", ["valid", "overwrite_existing"])
      .first();
    if (!remaining) {
      await db("import_jobs")
        .where({ id: jobId })
        .update({ status: "completed", completed_at: new Date() });
    }
  },
  { connection },
);

console.log("import worker running");
