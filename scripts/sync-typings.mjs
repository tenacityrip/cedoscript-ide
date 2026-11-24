/**
 * @fileoverview Turns the declarations the client build generates into typings/cedoscript.d.ts and
 * typings/capabilities.json: precise handler types, no null where a value is always returned, and the
 * helpers the client adds to JavaScript values.
 *
 * Usage: node scripts/sync-typings.mjs <cedoscript.d.ts from the client build>
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const EVENTS = {
    onMotion: "MotionEvent",
    onMove: "MoveEvent",
    onSafeWalk: "SafeWalkEvent",
    onPacketSend: "PacketEvent",
    onPacketReceive: "PacketEvent",
    onChatReceived: "ChatEvent",
    onPlayerSendMessage: "ChatEvent",
    onRender2D: "Render2DEvent",
    onRender3D: "Render3DEvent",
    onShader: "ShaderEvent",
    onAttack: "AttackEvent",
    onCustomBlockRender: "CustomBlockRenderEvent",
    onRenderModel: "RenderModelEvent",
    onTick: "",
    onWorldLoad: "",
    onEnable: "",
    onDisable: "",
};

const BUS = {
    tick: "",
    render: "Render2DEvent",
    render3D: "Render3DEvent",
    shader: "ShaderEvent",
    motion: "MotionEvent",
    move: "MoveEvent",
    safewalk: "SafeWalkEvent",
    packetSend: "PacketEvent",
    packetReceive: "PacketEvent",
    chat: "ChatEvent",
    playerMessage: "ChatEvent",
    attack: "AttackEvent",
    worldLoad: "",
    customBlockRender: "CustomBlockRenderEvent",
    renderModel: "RenderModelEvent",
};

/** Members that really can return null. */
const NULLABLE = new Set([
    "getAuraTarget",
    "getModule",
    "getTargetEntity",
    "getHeldItem",
    "getEquipmentInSlot",
    "getUUID",
    "getInventorySlot",
    "getRainbow",
    "getSetting",
    "getNumberSetting",
    "getBooleanSetting",
    "getModeSetting",
    "getStringSetting",
    "getMultiBoolSetting",
    "getColorSetting",
    "getChatText",
]);

const handler = (type) => (type ? `(event: ${type}) => void` : "() => void");

/** Rewrites generated declarations into the published ones. */
export function transform(generated) {
    let out = generated.replace(/\r\n/g, "\n").replace(/^\/\/ Generated.*\n/, "");
    out = out.replace(/\{@code ((?:[^{}]|\{[^{}]*\})*)\}/g, "`$1`").replace(/[ \t]+$/gm, "");
    out = out.replace(/@return /g, "@returns ").replace(/^ *\* *$\n(?= *\*\/)/gm, "");
    out = out.replace(/^(\s*(?:declare function )?)(\w+)\((.*)\): (.+) \| null;$/gm, (_, pre, name, params, type) => {
        const suffix = NULLABLE.has(name) ? " | null" : "";
        return `${pre}${name}(${params}): ${type}${suffix};`;
    });
    out = out.replace(/(\w+): (Color|Pair|EntityLivingBase) \| null(?=[,)])/g, "$1: $2");
    out = out.replace(/^(\s+(?:readonly )?\w+): string \| null;$/gm, "$1: string;");
    for (const [name, type] of Object.entries(EVENTS)) {
        out = out.replace(`${name}(handler: (...args: any[]) => any)`, `${name}(handler: ${handler(type)})`);
    }
    out = out
        .replace(/content: \(\.\.\.args: any\[\]\) => any/, "content: () => void")
        .replace(
            /addParent\(parent: any, condition: \(\.\.\.args: any\[\]\) => any\)/g,
            "addParent<T extends Setting>(parent: T, condition: (parent: T) => boolean)",
        )
        .replace("...modes: any[]): ModeSetting", "...modes: (string | string[])[]): ModeSetting")
        .replace("...options: any[]): MultiBoolSetting", "...options: (string | string[])[]): MultiBoolSetting")
        .replace("initScript(options: Record<string, any>)", "initScript(options: ScriptOptions)")
        .replace("createDrag(options: Record<string, any>)", "createDrag(options: { initialX: number; initialY: number })")
        .replace(
            "declare function color(...channels: any[]): Color;",
            [
                "declare function color(channels: { red: number; green: number; blue: number; alpha?: number }): Color;",
                "declare function color(channels: { hex: number }): Color;",
                "declare function color(red: number, green: number, blue: number, alpha?: number): Color;",
            ].join("\n"),
        )
        .replace(
            /interface Pair \{[\s\S]*?\n\}/,
            "interface Pair<A = any, B = any> {\n    getFirst(): A;\n    getSecond(): B;\n}",
        )
        .replace("(EntityLivingBase | null)[]", "EntityLivingBase[]")
        .replace("getUUID(): string;", "getUUID(): string | null;")
        .replace("getChatText(): string;", "getChatText(): string | null;")
        .replace("getClientColors(): Pair;", "getClientColors(): Pair<Color, Color>;");
    return `${HEADER}\n${out.trim()}\n\n${footer()}`;
}

/** Members and events by the capability that unlocks them. */
export function capabilities(generated) {
    const members = {};
    const globals = {};
    for (const [, name, type] of generated.matchAll(/^declare const (\w+): (\w+);/gm)) globals[type] = name;
    let owner = "";
    let pending = "";
    for (const line of generated.split(/\r?\n/)) {
        const type = /^interface (\w+) \{/.exec(line);
        if (type) owner = type[1];
        const need = /Requires the `([a-z]+)` capability/.exec(line);
        if (need) pending = need[1];
        const member = /^ {4}(\w+)\(/.exec(line);
        if (member && pending) {
            const target = owner === "Script" ? "script" : globals[owner];
            if (target) (members[pending] ??= []).push(`${target}.${member[1]}`);
            pending = "";
        }
    }
    return {
        members,
        events: {
            movement: ["motion", "move", "safewalk"],
            packets: ["packetSend", "packetReceive"],
            chat: ["chat", "playerMessage"],
        },
    };
}

const HEADER = `// CedoScript declarations for Tenacity. Generated by scripts/sync-typings.mjs; do not edit.
// Docs: https://tenacity.rip/docs

/** Any setting of a script or module. */
type Setting = BooleanSetting | NumberSetting | ModeSetting | StringSetting | ColorSetting | MultiBoolSetting;

interface ScriptOptions {
    name: string;
    description: string;
    author: string;
}
`;

function footer() {
    const bus = Object.entries(BUS)
        .map(([name, type]) => `    ${name}: ${handler(type)};`)
        .join("\n");
    return `interface ScriptEvents {
${bus}
}

/** Subscribes to a client event. Runs only while the script's module is on. */
declare function on<K extends keyof ScriptEvents>(event: K, handler: ScriptEvents[K]): void;

/** Removes one handler, or every handler for the event. */
declare function off<K extends keyof ScriptEvents>(event: K, handler?: ScriptEvents[K]): void;

/** Prints a line in the chat, for you only. */
declare function print(...values: any[]): void;

declare const console: { log(...values: any[]): void };

interface Array<T> {
    /** The length. */
    size(): number;
    get(index: number): T;
    isEmpty(): boolean;
    contains(value: T): boolean;
}

interface String {
    contains(text: string): boolean;
    equals(text: string): boolean;
    equalsIgnoreCase(text: string): boolean;
}

interface Number {
    intValue(): number;
    longValue(): number;
    floatValue(): number;
    doubleValue(): number;
}

interface ArrayListLike<T = any> extends Array<T> {
    add(value: T): boolean;
    set(index: number, value: T): T;
    remove(index: number): T;
    clear(): void;
}

interface HashMapLike<K = any, V = any> extends Omit<Map<K, V>, "get"> {
    put(key: K, value: V): V | null;
    get(key: K): V | null;
    getOrDefault(key: K, fallback: V): V;
    containsKey(key: K): boolean;
    remove(key: K): V | null;
    isEmpty(): boolean;
    keySet(): ArrayListLike<K>;
    entrySet(): ArrayListLike<{ getKey(): K; getValue(): V }>;
}

interface Triplet<A = any, B = any, C = any> extends Pair<A, B> {
    getThird(): C;
}

interface MutablePair<A = any, B = any> extends Pair<A, B> {
    setFirst(value: A): void;
    setSecond(value: B): void;
}

interface MutableTriplet<A = any, B = any, C = any> extends Triplet<A, B, C> {
    setFirst(value: A): void;
    setSecond(value: B): void;
    setThird(value: C): void;
}

interface Keyboard {
    isKeyDown(code: number): boolean;
    getKeyName(code: number): string;
    getKeyIndex(name: string): number;
    readonly [key: \`KEY_\${string}\`]: number;
}

/** Stand-ins for the Java classes scripts may use. Any other name throws. */
declare const Java: {
    type(name: "org.lwjgl.input.Keyboard"): Keyboard;
    type(name: "org.lwjgl.input.Mouse"): MouseBinding;
    type(name: "org.lwjgl.opengl.GL11" | "org.lwjgl.opengl.GL13" | "org.lwjgl.opengl.GL14"): GLBinding;
    type(name: "org.lwjgl.opengl.GL20"): SafeGL20;
    type(name: "java.lang.Math"): Math;
    type(name: "java.util.Map" | "java.util.HashMap"): {
        new <K = any, V = any>(entries?: Iterable<readonly [K, V]>): HashMapLike<K, V>;
    };
    type(name: "java.util.List" | "java.util.ArrayList"): {
        new <T = any>(items?: Iterable<T> | number): ArrayListLike<T>;
    };
    type(name: "dev.cedo.tuples.Pair"): { of<A, B = null>(first: A, second?: B): Pair<A, B> };
    type(name: "dev.cedo.tuples.Triplet"): { of<A, B, C>(first: A, second: B, third: C): Triplet<A, B, C> };
    type(name: "dev.cedo.tuples.mutable.MutablePair"): { of<A, B = null>(first: A, second?: B): MutablePair<A, B> };
    type(name: "dev.cedo.tuples.mutable.MutableTriplet"): {
        of<A, B, C>(first: A, second: B, third: C): MutableTriplet<A, B, C>;
    };
};
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const source = readFileSync(process.argv[2], "utf8");
    writeFileSync(path.join(root, "typings", "cedoscript.d.ts"), transform(source));
    writeFileSync(path.join(root, "typings", "capabilities.json"), `${JSON.stringify(capabilities(source), null, 2)}\n`);
    console.log("typings updated");
}
