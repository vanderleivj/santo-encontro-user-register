import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "node_modules", "pridepack", "env");
mkdirSync(dir, { recursive: true });
writeFileSync(
  join(dir, "package.json"),
  JSON.stringify({ name: "pridepack/env", types: "index.d.ts" }, null, 2)
);
writeFileSync(join(dir, "index.d.ts"), "// stub: seroval references pridepack/env\nexport {};\n");
