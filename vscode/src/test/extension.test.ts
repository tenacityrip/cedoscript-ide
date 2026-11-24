/** @fileoverview Tests for the parts that do not need VS Code. */
import assert from "node:assert/strict";
import test from "node:test";
import { addCapability, findProblems, isScript, requested } from "../capabilities";
import { jsconfig, needsManualInclude, scriptFileName, scriptTemplate, TYPINGS } from "../template";

const init = 'const s = initScript({ name: "a", description: "", author: "" });\n';

test("reports gated members and events", () => {
    const found = findProblems(`${init}s.onMotion(() => player.jump());\non("packetSend", () => {});`);
    assert.deepEqual(
        found.map((p) => [p.use, p.capability]),
        [
            ["s.onMotion", "movement"],
            ["player.jump", "movement"],
            ['on("packetSend")', "packets"],
        ],
    );
});

test("a requested capability silences it", () => {
    const header = "// ==Script==\n// @capability movement, packets\n// ==/Script==\n";
    assert.deepEqual([...requested(header)], ["movement", "packets"]);
    assert.deepEqual(findProblems(`${header}${init}s.onMotion(() => player.jump());`), []);
});

test("ignores comments, strings and other objects", () => {
    assert.deepEqual(findProblems(`${init}// player.jump()\nconst t = "player.jump()"; foo.player.jump();`), []);
    assert.deepEqual(findProblems("player.jump();"), []);
});

test("the fix clears the problem, with and without a header", () => {
    for (const header of ["", "// ==Script==\n// @name A\n// ==/Script==\n"]) {
        const source = `${header}${init}player.jump();`;
        const edit = addCapability(source, "movement");
        const fixed = source.slice(0, edit.offset) + edit.text + source.slice(edit.offset);
        assert.deepEqual(findProblems(fixed), []);
        assert.equal(fixed.match(/==Script==/g)?.length, 1);
    }
});

test("new scripts are clean scripts", () => {
    const source = scriptTemplate('My "HUD"');
    assert.ok(isScript(source));
    assert.deepEqual(findProblems(source), []);
    assert.equal(scriptFileName("My HUD"), "My_HUD.js");
});

test("jsconfig is created, extended, and left alone when it has comments", () => {
    assert.ok(jsconfig(undefined)?.includes(TYPINGS));
    const extended = JSON.parse(jsconfig('{"compilerOptions":{"strict":true},"include":["a.js"]}') ?? "");
    assert.deepEqual(extended, { compilerOptions: { strict: true }, include: ["a.js", TYPINGS] });
    assert.equal(jsconfig("{ // hi\n}"), undefined);
    assert.ok(needsManualInclude("{ // hi\n}"));
    assert.equal(jsconfig(jsconfig(undefined)), undefined);
});
