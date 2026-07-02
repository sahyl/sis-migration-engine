import type { Knex } from "knex";

// stand-ins for the real toddle prod tables, minimal fields only, YAGNI
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("students", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("school_id").notNullable();
    t.string("external_id").notNullable();
    t.string("first_name").notNullable();
    t.string("last_name").notNullable();
    t.string("email").notNullable();
    t.date("date_of_birth").notNullable();
    t.integer("grade").notNullable();
    t.string("class_code");
    t.unique(["school_id", "email"]);
  });

  await knex.schema.createTable("classes", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("school_id").notNullable();
    t.string("class_code").notNullable();
    t.string("class_name").notNullable();
    t.integer("grade").notNullable();
    t.string("teacher_email").notNullable();
    t.unique(["school_id", "class_code"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("classes");
  await knex.schema.dropTable("students");
}
