import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  await knex.schema.createTable("import_jobs", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("school_id").notNullable();
    t.string("source_system").notNullable();
    t.string("status").notNullable().defaultTo("pending");
    t.string("file_url").notNullable();
    t.integer("total_rows").defaultTo(0);
    t.integer("processed_rows").defaultTo(0);
    t.integer("failed_rows").defaultTo(0);
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.timestamp("completed_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("import_jobs");
}
