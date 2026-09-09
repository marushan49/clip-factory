#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const topic = args.topic || "Der Eiffelturm wächst im Sommer";
const provider = args.provider || "codex";
const slug = args.slug || slugify(topic);
const accent = args.accent || "#ff5a36";
const voice = args.voice || "Anna";

mkdirSync(join(project, "jobs"), { recursive: true });
mkdirSync(join(project, "assets", "generated"), { recursive: true });

const script = provider === "codex" ? generateWithCodex(topic, slug, args.model || "gpt-5.6-luna") : sampleScript(topic);
validateScript(script);
const voiceover = args["no-tts"] ? "assets/silence.wav" : generateVoice(script.narration, slug, voice);
const job = {
  slug,
  kicker: script.kicker,
  hookLead: script.hookLead,
  hookAccent: script.hookAccent,
  setup: script.setup,
  reveal: script.reveal,
  proof: script.proof,
  close: script.close,
  loop: script.loop,
  episode: args.episode || "FELDNOTIZ 001",
  accent,
  voiceover,
};

const jobPath = join(project, "jobs", `${slug}.json`);
writeFileSync(jobPath, `${JSON.stringify(job, null, 2)}\n`);
console.log(`created ${jobPath}`);
console.log("preview defaults: npm run dev");
console.log(`after visual approval: npm run render:job -- jobs/${slug}.json`);

function generateWithCodex(subject, outputSlug, model) {
  const schema = join(project, "schemas", "clip-script.schema.json");
  const temp = join(project, "jobs", `.${outputSlug}.codex.json`);
  const prompt = [
    "Schreibe genau einen deutschen 22-Sekunden-Short über dieses Thema:",
    subject,
    "Die Ausgabe muss dem JSON-Schema entsprechen.",
    "Stil: konkret, überraschend, schnell, natürlich gesprochen, kein Marketing-Sprech.",
    "Der Hook braucht zwei kurze typografische Zeilen. Reveal ist eine kurze Zahl oder Pointe.",
    "Grenzen: setup 100 Zeichen, proof 110, close 90, loop 60. Diese vier Felder enden mit Satzzeichen.",
    "Jedes Feld muss ein vollständiger Gedanke sein. Niemals Wörter abschneiden oder Zeichenzahlen anhängen.",
    "Narration: 42 bis 58 Wörter, deckungsgleich mit den sichtbaren Aussagen.",
    "Keine Markdown-Ausgabe und keine Erläuterung.",
  ].join("\n");

  try {
    execFileSync(
      "codex",
      [
        "exec",
        "--ephemeral",
        "--skip-git-repo-check",
        "--ignore-user-config",
        "--model",
        model,
        "--sandbox",
        "read-only",
        "--output-schema",
        schema,
        "--output-last-message",
        temp,
        "-",
      ],
      { cwd: project, input: prompt, stdio: ["pipe", "inherit", "inherit"] },
    );
    return JSON.parse(readFileSync(temp, "utf8"));
  } finally {
    rmSync(temp, { force: true });
  }
}

function validateScript(script) {
  const fields = ["kicker", "hookLead", "hookAccent", "setup", "reveal", "proof", "close", "loop", "narration"];
  for (const field of fields) {
    if (typeof script[field] !== "string" || script[field].trim().length === 0) {
      throw new Error(`Codex-Ausgabe ist unvollständig: ${field}`);
    }
  }
  for (const field of ["setup", "proof", "close", "loop"]) {
    if (
      !/[.!?]$/.test(script[field]) ||
      /[-–—]\s*$/.test(script[field]) ||
      /\s\d{1,3}$/.test(script[field]) ||
      /\s[A-ZÄÖÜ]$/.test(script[field]) ||
      /\b(?:und|oder|die|der|das|ein|eine|zu|im|in)$/.test(script[field])
    ) {
      throw new Error(`Codex-Ausgabe wirkt abgeschnitten: ${field}=${JSON.stringify(script[field])}`);
    }
  }
  const limits = { setup: 110, proof: 120, close: 100, loop: 70 };
  for (const [field, limit] of Object.entries(limits)) {
    if (script[field].length > limit) throw new Error(`${field} hat ${script[field].length} Zeichen; maximal ${limit}.`);
  }
  const words = script.narration.trim().split(/\s+/).length;
  if (words < 38 || words > 64) throw new Error(`Narration hat ${words} Wörter; erwartet sind 38 bis 64.`);
}

function generateVoice(text, outputSlug, selectedVoice) {
  if (process.platform !== "darwin") {
    throw new Error("Der kostenlose TTS-Smoke-Test nutzt macOS say. Auf Linux --no-tts oder später Kokoro verwenden.");
  }

  const aiff = join(project, "assets", "generated", `${outputSlug}.aiff`);
  const m4a = join(project, "assets", "generated", `${outputSlug}.m4a`);
  execFileSync("say", ["-v", selectedVoice, "-r", "205", "-o", aiff, text], { stdio: "inherit" });
  execFileSync(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-y", "-i", aiff, "-af", "loudnorm=I=-16:TP=-1.5:LRA=9", "-c:a", "aac", "-b:a", "192k", m4a],
    { stdio: "inherit" },
  );
  rmSync(aiff, { force: true });
  return `assets/generated/${outputSlug}.m4a`;
}

function sampleScript(subject) {
  return {
    kicker: "SCHNELLTEST / 01",
    hookLead: subject.toUpperCase().slice(0, 32),
    hookAccent: "IST ANDERS ALS DU DENKST.",
    setup: "Ein klarer Gedanke wird in drei visuellen Schritten aufgebaut.",
    reveal: "22 SEKUNDEN",
    proof: "Hook, Erklärung, Payoff und Loop landen in einem reproduzierbaren Render.",
    close: "Das Thema wird zur Feldnotiz, nicht zur Präsentation.",
    loop: "Nächstes Thema. Gleicher Qualitätsrahmen.",
    narration: `${subject}. Ein klarer Gedanke wird in drei visuellen Schritten aufgebaut. Zuerst stoppt ein starker Hook den Scroll. Dann folgt eine kurze Erklärung. Eine konkrete Zahl liefert den Payoff. Am Ende schließt ein Satz den Kreis. So wird das Thema zur Feldnotiz statt zur Präsentation.`,
  };
}

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

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}
