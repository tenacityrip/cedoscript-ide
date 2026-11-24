/** @fileoverview New scripts and the workspace files that give them completion. No VS Code types in here. */

export function scriptTemplate(name: string): string {
    const text = JSON.stringify(name);
    return `// ==Script==
// @name        ${name}
// @version     1.0
// ==/Script==

const script = initScript({
    name: ${text},
    description: "What this script does",
    author: "you"
});

const message = script.stringSetting("Message", "Hello");

script.onEnable(() => {
    client.printClientMsg(message.getString());
});
`;
}

export function scriptFileName(name: string): string {
    return `${name.trim().replace(/[^\w.-]+/g, "_")}.js`;
}

export function nameProblem(name: string): string | undefined {
    if (!name.trim()) return "Enter a name.";
    return /[\r\n]/.test(name) ? "Use a single line." : undefined;
}

const TYPINGS = ".cedoscript/cedoscript.d.ts";

/** The jsconfig.json to write, or undefined when the current one already works or cannot be read safely. */
export function jsconfig(current: string | undefined): string | undefined {
    if (current === undefined) {
        const fresh = {
            compilerOptions: { target: "es2023", lib: ["es2023"], types: [], checkJs: true },
            include: ["**/*.js", TYPINGS],
        };
        return `${JSON.stringify(fresh, null, 2)}\n`;
    }
    let parsed: Record<string, unknown>;
    try {
        parsed = JSON.parse(current);
    } catch {
        return undefined;
    }
    const include = Array.isArray(parsed.include) ? (parsed.include as unknown[]) : ["**/*.js"];
    if (include.includes(TYPINGS)) {
        return undefined;
    }
    return `${JSON.stringify({ ...parsed, include: [...include, TYPINGS] }, null, 2)}\n`;
}

/** How to see an existing config that could not be updated automatically. */
export function needsManualInclude(current: string | undefined): boolean {
    return current !== undefined && jsconfig(current) === undefined && !current.includes(TYPINGS);
}

export { TYPINGS };
