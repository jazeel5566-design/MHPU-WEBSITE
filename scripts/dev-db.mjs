// Local Postgres 17 for development & tests — no Docker or system install needed.
// Data lives in ./.pgdata (gitignored). Usage: npm run db:dev  (leave running)
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const pg = new EmbeddedPostgres({
  databaseDir: "./.pgdata",
  user: "mhpu",
  password: "mhpu-dev",
  port: 5433,
  persistent: true,
});

if (!existsSync("./.pgdata/PG_VERSION")) await pg.initialise();
await pg.start();
try { await pg.createDatabase("mhpu"); } catch { /* already exists */ }
console.log("Postgres ready → postgresql://mhpu:mhpu-dev@localhost:5433/mhpu  (Ctrl+C to stop)");
const stop = async () => { await pg.stop(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
