/** @fileoverview Repository checks: no machine paths, no secrets, capability data matches the typings. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const MACHINE_PATH = /([A-Za-z]:\\Users\\|\/home\/[a-z]|\/Users\/[A-Za-z])/;
const SECRET = /(gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;
const problems = [];

const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { cwd: root, encoding: "utf8" });
for (const file of files.split("\n").filter((f) => f && !/(\.jar|package-lock\.json|check\.mjs|gradlew.*)$/.test(f))) {
    const text = readFileSync(path.join(root, file), "utf8");
    if (MACHINE_PATH.test(text)) problems.push(`${file}: machine path`);
    if (SECRET.test(text)) problems.push(`${file}: possible secret`);
}

const typings = readFileSync(path.join(root, "typings/cedoscript.d.ts"), "utf8");
const { members } = JSON.parse(readFileSync(path.join(root, "typings/capabilities.json"), "utf8"));
for (const name of Object.values(members).flat()) {
    if (!new RegExp(`^ {4}${name.split(".")[1]}\\(`, "m").test(typings)) problems.push(`capabilities.json: ${name}`);
}

for (const p of problems) console.error(p);
console.log(problems.length ? `${problems.length} problem(s)` : "ok");
process.exitCode = problems.length ? 1 : 0;
