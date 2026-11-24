/** @fileoverview VS Code entry point: typings, new scripts and the capability check. */
import * as vscode from "vscode";
import typings from "../../typings/cedoscript.d.ts.txt";
import { addCapability, findProblems, isScript } from "./capabilities";
import { jsconfig, nameProblem, needsManualInclude, scriptFileName, scriptTemplate, TYPINGS } from "./template";

const installed = new Set<string>();

export function activate(context: vscode.ExtensionContext): void {
    const diagnostics = vscode.languages.createDiagnosticCollection("cedoscript");
    const check = (document: vscode.TextDocument) => {
        if (document.languageId !== "javascript") return;
        const source = document.getText();
        diagnostics.set(document.uri, source.length > 500_000 ? [] : problems(document, source));
        if (isScript(source) && vscode.workspace.getConfiguration("cedoscript").get("autoInstallTypings", true)) {
            const folder = vscode.workspace.getWorkspaceFolder(document.uri);
            if (folder && vscode.workspace.isTrusted && !installed.has(folder.uri.toString())) {
                install(folder, false).catch(report);
            }
        }
    };
    context.subscriptions.push(
        diagnostics,
        vscode.workspace.onDidOpenTextDocument(check),
        vscode.workspace.onDidChangeTextDocument((event) => check(event.document)),
        vscode.workspace.onDidCloseTextDocument((document) => diagnostics.delete(document.uri)),
        vscode.languages.registerCodeActionsProvider("javascript", new AddCapability(), {
            providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
        }),
        vscode.commands.registerCommand("cedoscript.newScript", () => newScript().catch(report)),
        vscode.commands.registerCommand("cedoscript.installTypings", async () => {
            const folder = await pickFolder();
            if (folder) await install(folder, true).catch(report);
        }),
        vscode.commands.registerCommand("cedoscript.openDocs", () =>
            vscode.env.openExternal(vscode.Uri.parse("https://tenacity.rip/docs")),
        ),
    );
    vscode.workspace.textDocuments.forEach(check);
}

function problems(document: vscode.TextDocument, source: string): vscode.Diagnostic[] {
    return findProblems(source).map((problem) => {
        const range = new vscode.Range(document.positionAt(problem.start), document.positionAt(problem.end));
        const diagnostic = new vscode.Diagnostic(
            range,
            `${problem.use} needs "// @capability ${problem.capability}" in the script header.`,
            vscode.DiagnosticSeverity.Warning,
        );
        diagnostic.source = "cedoscript";
        diagnostic.code = problem.capability;
        return diagnostic;
    });
}

class AddCapability implements vscode.CodeActionProvider {
    provideCodeActions(
        document: vscode.TextDocument,
        _range: vscode.Range,
        context: vscode.CodeActionContext,
    ): vscode.CodeAction[] {
        const wanted = new Set(context.diagnostics.filter((d) => d.source === "cedoscript").map((d) => String(d.code)));
        return [...wanted].map((capability) => {
            const action = new vscode.CodeAction(`Request the ${capability} capability`, vscode.CodeActionKind.QuickFix);
            const edit = addCapability(document.getText(), capability);
            action.edit = new vscode.WorkspaceEdit();
            action.edit.insert(document.uri, document.positionAt(edit.offset), edit.text);
            action.isPreferred = true;
            return action;
        });
    }
}

async function pickFolder(): Promise<vscode.WorkspaceFolder | undefined> {
    const folders = vscode.workspace.workspaceFolders ?? [];
    if (folders.length === 0) {
        vscode.window.showWarningMessage("Open your Tenacity/Scripts folder first.");
        return undefined;
    }
    return folders.length === 1 ? folders[0] : vscode.window.showWorkspaceFolderPick();
}

async function install(folder: vscode.WorkspaceFolder, announce: boolean): Promise<void> {
    installed.add(folder.uri.toString());
    const target = vscode.Uri.joinPath(folder.uri, TYPINGS);
    if ((await read(target)) !== typings) {
        await vscode.workspace.fs.writeFile(target, Buffer.from(typings));
    }
    const config = vscode.Uri.joinPath(folder.uri, "jsconfig.json");
    const current = await read(config);
    const next = jsconfig(current);
    if (next !== undefined) {
        await vscode.workspace.fs.writeFile(config, Buffer.from(next));
    }
    if (needsManualInclude(current)) {
        vscode.window.showWarningMessage(`Add "${TYPINGS}" to "include" in jsconfig.json to get CedoScript completion.`);
    } else if (announce) {
        vscode.window.showInformationMessage("CedoScript typings installed.");
    }
}

async function read(uri: vscode.Uri): Promise<string | undefined> {
    try {
        return Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
    } catch {
        return undefined;
    }
}

async function newScript(): Promise<void> {
    const folder = await pickFolder();
    if (!folder) return;
    const name = await vscode.window.showInputBox({ prompt: "Script name", validateInput: nameProblem });
    if (!name) return;
    const file = vscode.Uri.joinPath(folder.uri, scriptFileName(name));
    if ((await read(file)) !== undefined) {
        vscode.window.showErrorMessage(`${scriptFileName(name)} already exists.`);
        return;
    }
    await vscode.workspace.fs.writeFile(file, Buffer.from(scriptTemplate(name)));
    await vscode.window.showTextDocument(file);
}

function report(error: unknown): void {
    vscode.window.showErrorMessage(`CedoScript: ${error instanceof Error ? error.message : String(error)}`);
}
