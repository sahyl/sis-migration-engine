import type { Knex } from "knex";
import type { StagingRow } from "../types";

export async function commitRow(row: StagingRow, schoolId: string, trx: Knex.Transaction): Promise<string> {
  const data = row.edited_data ?? row.raw_data;

  if (row.status === "overwrite_existing") {
    return overwriteRow(row, data, trx);
  }

  if (row.entity_type === "student") {
    const [inserted] = await trx("students")
      .insert({
        school_id: schoolId,
        external_id: data.student_id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        date_of_birth: data.date_of_birth,
        grade: Number(data.grade),
        class_code: data.class_code,
      })
      .returning("id");
    return inserted.id;
  }

  if (row.entity_type === "class") {
    const [inserted] = await trx("classes")
      .insert({
        school_id: schoolId,
        class_code: data.class_code,
        class_name: data.class_name,
        grade: Number(data.grade),
        teacher_email: data.teacher_email,
      })
      .returning("id");
    return inserted.id;
  }

  throw new Error(`unknown entity type: ${row.entity_type}`);
}

async function overwriteRow(
  row: StagingRow,
  data: Record<string, string>,
  trx: Knex.Transaction
): Promise<string> {
  if (!row.matched_entity_id) throw new Error(`overwrite requested but no matched_entity_id on row ${row.id}`);

  if (row.entity_type === "student") {
    await trx("students").where({ id: row.matched_entity_id }).update({
      first_name: data.first_name,
      last_name: data.last_name,
      date_of_birth: data.date_of_birth,
      grade: Number(data.grade),
      class_code: data.class_code,
    });
    return row.matched_entity_id;
  }

  if (row.entity_type === "class") {
    await trx("classes").where({ id: row.matched_entity_id }).update({
      class_name: data.class_name,
      grade: Number(data.grade),
      teacher_email: data.teacher_email,
    });
    return row.matched_entity_id;
  }

  throw new Error(`overwrite not supported for entity type: ${row.entity_type}`);
}