import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { readFileSync } from "fs";
import { join } from "path";
import { graphqlUploadExpress } from "graphql-upload-minimal";
import { resolvers } from "./resolvers";

async function main() {
  const typeDefs = readFileSync(join(__dirname, "schema.graphql"), "utf-8");
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  const app = express();
  app.use(cors({ origin: "http://localhost:3000" }));
  app.use(graphqlUploadExpress());
  app.use("/graphql", express.json(), expressMiddleware(server));

  app.listen(4000, () => console.log("api on :4000/graphql"));
}

main();
