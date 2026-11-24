/** @fileoverview Finds uses of gated API that the script header does not ask for. No VS Code types in here. */
import data from "../../typings/capabilities.json";

export interface Problem {
    capability: string;
    use: string;
    start: number;
    end: number;
}

const HEADER = /^﻿?\s*\/\/\s*==Script==[^\n]*\n([\s\S]*?)\/\/\s*==\/Script==/;
const events = new Map(Object.entries(data.events).flatMap(([c, names]) => names.map((n) => [n, c] as const)));
const members = new Map(Object.entries(data.members).flatMap(([c, names]) => names.map((n) => [n, c] as const)));

export function isScript(source: string): boolean {
    return /\binitScript\s*\(/.test(source) || HEADER.test(source);
}

export function requested(source: string): Set<string> {
    const header = HEADER.exec(source)?.[1] ?? "";
    return new Set(
        [...header.matchAll(/^\s*\/\/\s*@capability\s+(.+)$/gm)].flatMap(([, list]) =>
            list
                .toLowerCase()
                .split(/[\s,]+/)
                .filter(Boolean),
        ),
    );
}

/** Blanks comments and, when asked, string contents, keeping every offset. */
function blank(source: string, strings: boolean): string {
    return source.replace(
        /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g,
        (text) => (!strings && (text[0] === '"' || text[0] === "'") ? text : text.replace(/[^\n]/g, " ")),
    );
}

export function findProblems(source: string): Problem[] {
    if (!isScript(source)) {
        return [];
    }
    const have = requested(source);
    const found: Problem[] = [];
    const add = (capability: string | undefined, use: string, start: number, length: number) => {
        if (capability && !have.has(capability)) {
            found.push({ capability, use, start, end: start + length });
        }
    };
    const code = blank(source, true);
    const script = /\b(?:var|let|const)\s+(\w+)\s*=\s*initScript\s*\(/.exec(code)?.[1];
    for (const match of code.matchAll(/(?<![\w$.])(\w+)\s*\.\s*(\w+)/g)) {
        const owner = match[1] === script ? "script" : match[1];
        if (owner === "script" && script !== match[1]) {
            continue;
        }
        add(members.get(`${owner}.${match[2]}`), `${match[1]}.${match[2]}`, match.index, match[0].length);
    }
    for (const match of blank(source, false).matchAll(/(?<![\w$.])on\s*\(\s*["'](\w+)["']/g)) {
        add(events.get(match[1]), `on("${match[1]}")`, match.index, match[0].length);
    }
    return found;
}

export interface Edit {
    offset: number;
    text: string;
}

/** The edit that makes the header ask for a capability. */
export function addCapability(source: string, capability: string): Edit {
    const header = HEADER.exec(source);
    if (header) {
        const end = header[0].lastIndexOf("//");
        return { offset: end, text: `// @capability  ${capability}\n` };
    }
    return { offset: 0, text: `// ==Script==\n// @capability  ${capability}\n// ==/Script==\n\n` };
}
