import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("import_staging_rows", (t) => {
    t.bigIncrements("id").primary();
    t.uuid("job_id").notNullable().references("id").inTable("import_jobs");
    t.integer("row_number").notNullable();
    t.string("entity_type").notNullable();
    t.jsonb("raw_data").notNullable();
    t.jsonb("edited_data");
    t.string("status").notNullable().defaultTo("pending");
    t.jsonb("errors").defaultTo("[]");
    t.string("conflict_type");
    t.uuid("matched_entity_id");
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.index(["job_id", "status"]);
    t.index(["job_id", "entity_type"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("import_staging_rows");
}
