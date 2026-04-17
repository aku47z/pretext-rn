import { createRequire } from "node:module";

(globalThis as { require?: NodeRequire }).require = createRequire(
  import.meta.url,
);
