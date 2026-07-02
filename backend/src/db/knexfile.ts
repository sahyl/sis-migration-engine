import type { Knex } from "knex";

const config: Knex.Config = {
  client: "pg",
  connection: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/sis_migration",
  migrations: { directory: "./migrations" },
};

export default config;

export const db = require("knex")(config);
