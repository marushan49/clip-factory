#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2];
if (!input) throw new Error("Usage: npm run render:job -- jobs/<slug>.json");

const jobPath = resolve(project, input);
if (!existsSync(jobPath)) throw new Error(`Job fehlt: ${jobPath}`);
const job = JSON.parse(readFileSync(jobPath, "utf8"));
if (!job.slug) throw new Error("Job benötigt slug");

execFileSync("npx", ["--yes", "hyperframes@0.8.33", "check", "."], { cwd: project, stdio: "inherit" });
execFileSync(
  "npx",
  [
    "--yes",
    "hyperframes@0.8.33",
    "render",
    ".",
    "--variables-file",
    jobPath,
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
