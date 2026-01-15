import * as vscode from "vscode"
import { PlaybookHoverProvider } from "./hoverProvider"
import { PlaybookDefinitionProvider } from "./definitionProvider"
import { PlaybookDiagnostics } from "./diagnostics"
import { PlaybookCompletionProvider } from "./completionProvider"

export function activate(context: vscode.ExtensionContext) {
  console.log("Playbook UI extension is now active")

  const supportedLanguages = [
    "ruby",
    "erb",
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
  console.log("Playbook UI: Activated for languages:", supportedLanguages)

  const hoverProvider = new PlaybookHoverProvider(context.extensionPath)
  const hoverDisposable = vscode.languages.registerHoverProvider(supportedLanguages, hoverProvider)
  context.subscriptions.push(hoverDisposable)
  console.log("✓ Hover provider registered")

  const definitionProvider = new PlaybookDefinitionProvider(context.extensionPath)
  const definitionDisposable = vscode.languages.registerDefinitionProvider(
    supportedLanguages,
    definitionProvider
  )
  context.subscriptions.push(definitionDisposable)
  console.log("✓ Definition provider registered")

  const completionProvider = new PlaybookCompletionProvider(context.extensionPath)
  const completionDisposable = vscode.languages.registerCompletionItemProvider(
    supportedLanguages,
    completionProvider,
    '"',
    "'",
    "<",
    " ",
    ":",
    "="
  )
  context.subscriptions.push(completionDisposable)
  console.log("✓ Completion provider registered")

  const diagnostics = new PlaybookDiagnostics(context.extensionPath)
  context.subscriptions.push(diagnostics)

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      diagnostics.updateDiagnostics(event.document)
    })
  )

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      diagnostics.updateDiagnostics(document)
    })
  )

  vscode.workspace.textDocuments.forEach((document) => {
    diagnostics.updateDiagnostics(document)
  })

  console.log("✓ Prop validation diagnostics registered")

  console.log(
    "✨ Playbook UI extension fully activated with snippets, autocomplete, hover, validation, and definition support!"
  )
}

export function deactivate() {
  console.log("Playbook UI extension is now deactivated")
}
