#!/usr/bin/env node
/**
 * Scans git-tracked files (or staged files with --staged) for hardcoded credentials.
 * Prints file:line and the kind of finding only, NEVER the secret value.
 * Exit code 1 if anything is found, so it can run in CI or as a pre-commit hook.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const staged = process.argv.includes("--staged");
const files = execFileSync("git", staged ? ["diff", "--cached", "--name-only", "--diff-filter=ACM"] : ["ls-files"], { encoding: "utf8" })
  .split("\n").filter(Boolean)
  .filter((f) => !/\.(png|jpe?g|gif|ico|woff2?|lock)$|package-lock\.json$/.test(f) && fs.existsSync(f));

const NAME = /(TOKEN|SECRET|PASSWORD|PASSWD|API[_-]?KEY|APIKEY|CREDENTIAL|PRIVATE[_-]?KEY)/i;
const rules = [
  { label: "secret-named assignment with a literal value", rx: /\b([A-Za-z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API[_-]?KEY|APIKEY|CREDENTIAL|PRIVATE[_-]?KEY)[A-Za-z0-9_]*)\s*[:=]\s*["'`]([^"'`\s]{12,})["'`]/gi, literal: (m) => !/^(process\.env|os\.environ|<|\$\{|your[-_]|example|changeme|placeholder|xxx)/i.test(m[2]) && !NAME.test(m[2]) },
  { label: "Telegram bot token", rx: /\b\d{8,10}:[A-Za-z0-9_-]{30,}\b/g },
  { label: "CoinGecko key", rx: /\bCG-[A-Za-z0-9]{20,}\b/g },
  { label: "Anthropic/OpenAI-style key", rx: /\bsk-(?:ant-)?[A-Za-z0-9_-]{24,}\b/g },
  { label: "GitHub token", rx: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  { label: "AWS access key id", rx: /\bAKIA[0-9A-Z]{16}\b/g },
  { label: "private key block", rx: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
];

let found = 0;
for (const f of files) {
  if (f === "scripts/check-secrets.mjs") continue;
  const lines = fs.readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const r of rules) {
      for (const m of line.matchAll(r.rx)) {
        if (r.literal && !r.literal(m)) continue;
        console.error(`${f}:${i + 1}  ${r.label}`);
        found++;
      }
    }
  });
}
const badFiles = files.filter((f) => /(^|\/)\.env(\.(?!example$).+)?$|\.(pem|p12|pfx)$/.test(f));
for (const f of badFiles) { console.error(`${f}  secret-bearing file is tracked`); found++; }
if (found) { console.error(`\n${found} potential secret(s) found. Move them to environment variables and rotate them.`); process.exit(1); }
console.log(`No hardcoded secrets found in ${files.length} ${staged ? "staged" : "tracked"} files.`);
