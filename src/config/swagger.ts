import fs from "fs";
import path from "path";
import { parse } from "yaml";

const openApiPath = path.resolve(
  process.cwd(),
  "src",
  "docs",
  "openapi.yaml",
);

const openApiDocument = fs.readFileSync(openApiPath, "utf8");

export const swaggerSpec = parse(openApiDocument);