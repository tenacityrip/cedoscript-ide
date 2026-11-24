# CedoScript for editors

Completion, checks and snippets for [CedoScript](https://tenacity.rip/docs), the JavaScript scripting of the
[Tenacity](https://tenacity.rip) Minecraft client. One extension for VS Code, one for JetBrains IDEs.

- **Completion and docs** for every global, event, setting and object, through TypeScript declarations
- **Capability check**: warns when a script uses API its header does not request, with a one-click fix
- **New Script** command and snippets (`cedo`, `cedorender`, `cedonumber`, ...)

Matches Tenacity 7.0.

## Install

Download the files from the [latest release](https://github.com/tenacityrip/cedoscript-ide/releases/latest).

**VS Code**: Extensions view, `...` menu, **Install from VSIX...**, pick `cedoscript-*.vsix`. Open your
`Tenacity/Scripts` folder. The typings are written to `.cedoscript/` when you open a script; turn that off with
`cedoscript.autoInstallTypings`.

**JetBrains**: Settings, Plugins, gear icon, **Install Plugin from Disk...**, pick `cedoscript-intellij-*.zip`. Then run
Tools, **Install CedoScript Typings**. Completion needs an IDE with JavaScript support, such as WebStorm; the capability
check and templates work everywhere.

**Any other editor**: copy [`typings/cedoscript.d.ts`](typings/cedoscript.d.ts) next to your scripts.

Writing scripts with Claude Code? Use [cedoscript-claude](https://github.com/tenacityrip/cedoscript-claude).

## Development

```sh
cd vscode && npm ci && npm run typecheck && npm test && npm run package
cd intellij && ./gradlew test buildPlugin
node scripts/check.mjs
```

The typings are generated from the client. Maintainers update them with
`node scripts/sync-typings.mjs <generated cedoscript.d.ts>`.

## For AI agents

Read [CLAUDE.md](CLAUDE.md). [llms.txt](llms.txt) indexes the files.

## License

[MIT](LICENSE). Not affiliated with Mojang, Microsoft or JetBrains.
