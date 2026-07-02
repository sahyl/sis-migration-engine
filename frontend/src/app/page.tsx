"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import { useRouter } from "next/navigation";
import { START_IMPORT } from "@/lib/graphql";

const SCHOOL_ID = "00000000-0000-0000-0000-000000000001"; // hardcoded for MVP, no auth yet

export default function UploadPage() {
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [classFile, setClassFile] = useState<File | null>(null);
  const [startImport, { loading, error }] = useMutation(START_IMPORT);
  const router = useRouter();

  async function handleSubmit() {
    if (!studentFile || !classFile) return;
    const { data } = await startImport({
      variables: { schoolId: SCHOOL_ID, studentFile, classFile },
    });
    router.push(`/review/${data.startImport.id}`);
  }

  return (
    <main style={{ padding: 32, maxWidth: 480 }}>
      <h1>Import students &amp; classes</h1>

      <label style={{ display: "block", marginTop: 16 }}>
        students.csv
        <input type="file" accept=".csv" onChange={(e) => setStudentFile(e.target.files?.[0] ?? null)} />
      </label>

      <label style={{ display: "block", marginTop: 16 }}>
        classes.csv
        <input type="file" accept=".csv" onChange={(e) => setClassFile(e.target.files?.[0] ?? null)} />
      </label>

      <button
        onClick={handleSubmit}
        disabled={!studentFile || !classFile || loading}
        style={{ marginTop: 24 }}
      >
        {loading ? "Uploading..." : "Start import"}
      </button>

      {error && <p style={{ color: "red" }}>{error.message}</p>}
    </main>
  );
}
