#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
if (!args.file || !args.slug) {
  throw new Error("Usage: npm run import:flow -- --file ~/Downloads/flow.mp4 --slug eiffel-hero [--job jobs/eiffelturm-sommer.json] [--prompt \"...\"]");
}

const source = resolve(args.file.replace(/^~\//, `${process.env.HOME}/`));
if (!existsSync(source)) throw new Error(`Flow-Datei fehlt: ${source}`);
const slug = safeSlug(args.slug);
const extension = [".mp4", ".mov", ".avi", ".wmv"].includes(extname(source).toLowerCase()) ? extname(source).toLowerCase() : ".mp4";
const assetDir = join(project, "assets", "flow");
mkdirSync(assetDir, { recursive: true });

const assetName = `${slug}${extension}`;
const destination = join(assetDir, assetName);
copyFileSync(source, destination);

const probe = JSON.parse(
  execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration:stream=width,height,codec_name", "-of", "json", destination],
    { encoding: "utf8" },
  ),
);
const metadata = {
  provider: "google-flow",
  projectUrl: "https://flow.google.com/project/a1391c84-1baf-4bcc-9f5a-6445a30f97c7",
  slug,
  prompt: args.prompt || "",
  model: args.model || "veo-3.1-fast",
  importedFrom: basename(source),
  importedAt: new Date().toISOString(),
  durationSeconds: Number(probe.format?.duration || 0),
  streams: probe.streams || [],
  localAsset: `assets/flow/${assetName}`,
};
writeFileSync(join(assetDir, `${slug}.json`), `${JSON.stringify(metadata, null, 2)}\n`);

if (args.job) {
  const jobPath = resolve(project, args.job);
  if (!existsSync(jobPath)) throw new Error(`Job fehlt: ${jobPath}`);
  const job = JSON.parse(readFileSync(jobPath, "utf8"));
  job.flowVideo = metadata.localAsset;
  writeFileSync(jobPath, `${JSON.stringify(job, null, 2)}\n`);
  console.log(`updated ${jobPath}`);
}

console.log(`imported ${source} -> ${destination}`);
console.log(`duration ${metadata.durationSeconds.toFixed(2)}s`);
console.log(`metadata ${join(assetDir, `${slug}.json`)}`);

function parseArgs(input) {
  const result = {};
  for (let i = 0; i < input.length; i += 1) {
    const token = input[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    if (input[i + 1] && !input[i + 1].startsWith("--")) result[key] = input[++i];
    else result[key] = true;
  }
  return result;
}

function safeSlug(value) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  if (!slug) throw new Error("Slug ist leer");
  return slug;
}
