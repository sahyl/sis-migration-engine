"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useParams } from "next/navigation";
import {
  GET_JOB,
  GET_PROBLEM_ROWS,
  EDIT_ROW,
  RESOLVE_CONFLICT,
  REVALIDATE_JOB,
  CONFIRM_AND_QUEUE,
} from "@/lib/graphql";

const SCHOOL_ID = "00000000-0000-0000-0000-000000000001";

interface ProblemRow {
  id: string;
  rowNumber: number;
  entityType: string;
  rawData: Record<string, string>;
  status: string;
  errors: { field: string; message: string }[];
  conflictType: string | null;
}

export default function ReviewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const job = useQuery(GET_JOB, { variables: { id: jobId }, pollInterval: 3000 });
  const rows = useQuery(GET_PROBLEM_ROWS, { variables: { jobId } });

  const [editRow] = useMutation(EDIT_ROW);
  const [resolveConflict] = useMutation(RESOLVE_CONFLICT);
  const [revalidate] = useMutation(REVALIDATE_JOB);
  const [confirmAndQueue, { loading: queuing }] = useMutation(CONFIRM_AND_QUEUE);

  async function saveEdit(rowId: string) {
    await editRow({ variables: { rowId, data: editValues } });
    setEditingRow(null);
    await revalidate({ variables: { jobId, schoolId: SCHOOL_ID } });
    rows.refetch();
    job.refetch();
  }

  async function resolve(rowId: string, action: string) {
    await resolveConflict({ variables: { rowId, action } });
    await revalidate({ variables: { jobId, schoolId: SCHOOL_ID } });
    rows.refetch();
    job.refetch();
  }

  async function handleConfirm() {
    await confirmAndQueue({ variables: { jobId, schoolId: SCHOOL_ID } });
    job.refetch();
  }

  if (job.loading || rows.loading) return <p style={{ padding: 32 }}>Loading...</p>;
  
  {job.data?.importJob?.failedRows > 0 && (
  <p style={{ color: "red" }}>
    {job.data.importJob.failedRows} row(s) failed to commit — see table below.
  </p>
)}

  const problemRows: ProblemRow[] = rows.data?.problemRows ?? [];
  const jobStatus = job.data?.importJob?.status;
  const canQueue = problemRows.length === 0 && (jobStatus === "needs_review" || jobStatus === "queued_ready");

  return (
    <main style={{ padding: 32 }}>
      <h1>Import review — job {jobId}</h1>
      <p>
        status: <b>{jobStatus}</b> | total: {job.data?.importJob?.totalRows} | processed:{" "}
        {job.data?.importJob?.processedRows} | failed: {job.data?.importJob?.failedRows}
      </p>

      {problemRows.length === 0 ? (
        <p style={{ color: "green" }}>All rows valid.</p>
      ) : (
        <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", marginTop: 16, width: "100%" }}>
          <thead>
            <tr>
              <th>Row</th>
              <th>Type</th>
              <th>Data</th>
              <th>Status</th>
              <th>Issue</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {problemRows.map((row) => (
              <tr key={row.id}>
                <td>{row.rowNumber}</td>
                <td>{row.entityType}</td>
                <td>
                  {editingRow === row.id ? (
                    <div>
                      {Object.entries(row.rawData).map(([field, value]) => (
                        <div key={field}>
                          <label>{field}: </label>
                          <input
                            defaultValue={value}
                            onChange={(e) =>
                              setEditValues((prev) => ({ ...prev, ...row.rawData, [field]: e.target.value }))
                            }
                          />
                        </div>
                      ))}
                      <button onClick={() => saveEdit(row.id)}>Save</button>
                    </div>
                  ) : (
                    JSON.stringify(row.rawData)
                  )}
                </td>
                <td>{row.status}</td>
                <td>
                  {row.conflictType ??
                    row.errors.map((e) => `${e.field}: ${e.message}`).join(", ")}
                </td>
                <td>
                  {editingRow !== row.id && (
                    <button
                      onClick={() => {
                        setEditingRow(row.id);
                        setEditValues(row.rawData);
                      }}
                    >
                      Edit
                    </button>
                  )}
                  {row.conflictType && (
                    <>
                      <button onClick={() => resolve(row.id, "delete_row")}>Delete</button>
                      {row.conflictType === "prod_collision" && (
                        <button onClick={() => resolve(row.id, "overwrite_existing")}>Overwrite</button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button onClick={handleConfirm} disabled={!canQueue || queuing} style={{ marginTop: 24 }}>
        {queuing ? "Queuing..." : "Confirm & start import"}
      </button>
    </main>
  );
}
