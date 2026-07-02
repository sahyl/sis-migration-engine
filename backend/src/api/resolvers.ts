import { db } from "../db/knexfile";
import {
  startImport as startImportSvc,
  revalidate,
} from "../services/orchestrator";
import { enqueueJob } from "../queue/importQueue";
import { GraphQLUpload } from "graphql-upload-minimal";
import type { EntityType } from "../types";

async function readUpload(file: any): Promise<Buffer> {
  const { createReadStream } = await file;
  const stream = createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function toJob(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    totalRows: row.total_rows,
    processedRows: row.processed_rows,
    failedRows: row.failed_rows,
  };
}

function toStagingRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    rowNumber: row.row_number,
    entityType: row.entity_type,
    rawData: row.edited_data ?? row.raw_data,
    status: row.status,
    errors: row.errors,
    conflictType: row.conflict_type,
  };
}

export const resolvers = {
  Upload: GraphQLUpload,

  Query: {
    importJob: async (_: unknown, { id }: { id: string }) =>
      toJob(await db("import_jobs").where({ id }).first()),
    problemRows: async (_: unknown, { jobId }: { jobId: string }) =>
      (
        await db("import_staging_rows")
          .where({ job_id: jobId })
          .whereNotIn("status", [
            "valid",
            "committed",
            "skip",
            "overwrite_existing",
          ])
      ).map(toStagingRow),
  },

  Mutation: {
    startImport: async (
      _: unknown,
      args: { schoolId: string; studentFile: any; classFile: any },
    ) => {
      const studentBuf = await readUpload(args.studentFile);
      const classBuf = await readUpload(args.classFile);
      const job = await startImportSvc(args.schoolId, [
        { entityType: "class" as EntityType, buffer: classBuf },
        { entityType: "student" as EntityType, buffer: studentBuf },
      ]);
      return toJob(job);
    },

    editStagingRow: async (
      _: unknown,
      { rowId, data }: { rowId: string; data: Record<string, string> },
    ) => {
      await db("import_staging_rows")
        .where({ id: rowId })
        .update({ edited_data: JSON.stringify(data), status: "pending" });
      return toStagingRow(
        await db("import_staging_rows").where({ id: rowId }).first(),
      );
    },

    resolveConflict: async (
      _: unknown,
      { rowId, action }: { rowId: string; action: string },
    ) => {
      if (action === "delete_row") {
        await db("import_staging_rows")
          .where({ id: rowId })
          .update({ status: "skip" });
      } else if (action === "overwrite_existing" || action === "skip") {
        await db("import_staging_rows")
          .where({ id: rowId })
          .update({ status: action });
      }
      return toStagingRow(
        await db("import_staging_rows").where({ id: rowId }).first(),
      );
    },

    revalidateJob: async (
      _: unknown,
      { jobId, schoolId }: { jobId: string; schoolId: string },
    ) => toJob(await revalidate(jobId, schoolId)),

    confirmAndQueue: async (
      _: unknown,
      { jobId, schoolId }: { jobId: string; schoolId: string },
    ) => {
      const blocking = await db("import_staging_rows")
        .where({ job_id: jobId })
        .whereNotIn("status", ["valid", "skip", "overwrite_existing"])
        .first();

      if (blocking)
        throw new Error("job still has unresolved rows, cannot queue");

      const rows = await db("import_staging_rows")
        .where({ job_id: jobId })
        .whereIn("status", ["valid", "overwrite_existing"])
        .select("id");
      await enqueueJob(
        jobId,
        schoolId,
        rows.map((r: { id: number }) => r.id),
      );
      const [updated] = await db("import_jobs")
        .where({ id: jobId })
        .update({ status: "processing" })
        .returning("*");
      return toJob(updated);
    },
  },
};
