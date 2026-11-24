/** @fileoverview Bundles the extension, or its tests with --test. The typings are embedded as text. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const typings = {
    name: "typings",
    setup(b) {
        b.onResolve({ filter: /cedoscript\.d\.ts\.txt$/ }, () => ({
            path: path.resolve(import.meta.dirname, "../typings/cedoscript.d.ts"),
            namespace: "typings",
        }));
        b.onLoad({ filter: /.*/, namespace: "typings" }, ({ path: file }) => ({
            contents: readFileSync(file, "utf8").replace(/\r\n/g, "\n"),
            loader: "text",
        }));
    },
};

const test = process.argv.includes("--test");
await build({
    entryPoints: test ? ["src/test/extension.test.ts"] : ["src/extension.ts"],
    outdir: test ? "dist/test" : "dist",
    outExtension: { ".js": ".cjs" },
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node20",
    external: ["vscode"],
    plugins: [typings],
    absWorkingDir: import.meta.dirname,
});
