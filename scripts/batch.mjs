#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputIndex = process.argv.indexOf("--input");
const shouldRender = process.argv.includes("--render");
if (inputIndex === -1 || !process.argv[inputIndex + 1]) {
  throw new Error("Usage: npm run batch -- --input jobs/batch.json [--render]");
}

const batchPath = resolve(project, process.argv[inputIndex + 1]);
const jobs = JSON.parse(readFileSync(batchPath, "utf8"));
if (!Array.isArray(jobs) || jobs.length === 0) throw new Error("Batch muss ein nicht-leeres JSON-Array sein");

console.log(`${jobs.length} job(s) validiert`);
for (const job of jobs) {
  if (!job.slug) throw new Error("Jeder Batch-Job benötigt slug");
  console.log(`- ${job.slug}`);
}

if (!shouldRender) {
  console.log("Dry run. Zum Rendern denselben Befehl mit --render ausführen.");
  process.exit(0);
}

execFileSync("npx", ["--yes", "hyperframes@0.8.33", "check", "."], { cwd: project, stdio: "inherit" });
for (const job of jobs) {
  execFileSync(
    "npx",
    [
      "--yes",
      "hyperframes@0.8.33",
      "render",
      ".",
      "--variables",
      JSON.stringify(job),
      "--strict-variables",
      "--resolution",
      "portrait",
      "--quality",
      "high",
      "--gpu",
      "--workers",
      "2",
      "--output",
      `renders/${job.slug}.mp4`,
    ],
    { cwd: project, stdio: "inherit" },
  );
}
