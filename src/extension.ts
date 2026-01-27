import * as vscode from "vscode"
import { PlaybookHoverProvider } from "./hoverProvider"
import { PlaybookDefinitionProvider } from "./definitionProvider"
import { PlaybookDiagnostics } from "./diagnostics"
import { PlaybookCompletionProvider } from "./completionProvider"

export function activate(context: vscode.ExtensionContext) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] Playbook UI extension activating...`)
  console.log(`[${timestamp}] Extension path: ${context.extensionPath}`)

  const supportedLanguages = [
    "ruby",
    "erb",
    "html.erb",
    "html",
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
  console.log(`[${timestamp}] Playbook UI: Registering for languages:`, supportedLanguages)

  console.log(`[${timestamp}] Creating hover provider...`)
  const hoverProvider = new PlaybookHoverProvider(context.extensionPath)
  const hoverDisposable = vscode.languages.registerHoverProvider(supportedLanguages, hoverProvider)
  context.subscriptions.push(hoverDisposable)
  console.log(
    `[${timestamp}] ✓ Hover provider registered for ${supportedLanguages.length} languages`
  )

  console.log(`[${timestamp}] Creating definition provider...`)
  const definitionProvider = new PlaybookDefinitionProvider(context.extensionPath)
  const definitionDisposable = vscode.languages.registerDefinitionProvider(
    supportedLanguages,
    definitionProvider
  )
  context.subscriptions.push(definitionDisposable)
  console.log(
    `[${timestamp}] ✓ Definition provider registered for ${supportedLanguages.length} languages`
  )

  console.log(`[${timestamp}] Creating completion provider...`)
  const completionProvider = new PlaybookCompletionProvider(context.extensionPath)
  const completionTriggers = ['"', "'", "<", " ", ":", "="]
  console.log(`[${timestamp}] Completion triggers: ${completionTriggers.join(", ")}`)
  const completionDisposable = vscode.languages.registerCompletionItemProvider(
    supportedLanguages,
    completionProvider,
    ...completionTriggers
  )
  context.subscriptions.push(completionDisposable)
  console.log(
    `[${timestamp}] ✓ Completion provider registered for ${supportedLanguages.length} languages`
  )

  console.log(`[${timestamp}] Creating diagnostics provider...`)
  const diagnostics = new PlaybookDiagnostics(context.extensionPath)
  context.subscriptions.push(diagnostics)

  console.log(`[${timestamp}] Registering diagnostics event listeners...`)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      console.log(
        `[Diagnostics] Text changed in ${event.document.languageId} file: ${event.document.uri.toString()}`
      )
      diagnostics.updateDiagnostics(event.document)
    })
  )

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      console.log(
        `[Diagnostics] Document opened: ${document.languageId} - ${document.uri.toString()}`
      )
      diagnostics.updateDiagnostics(document)
    })
  )

  const openDocs = vscode.workspace.textDocuments
  console.log(`[${timestamp}] Running diagnostics on ${openDocs.length} already-open documents...`)
  openDocs.forEach((document) => {
    console.log(
      `[Diagnostics] Processing open document: ${document.languageId} - ${document.uri.toString()}`
    )
    diagnostics.updateDiagnostics(document)
  })

  console.log(`[${timestamp}] ✓ Prop validation diagnostics registered`)

  console.log(
    `[${timestamp}] ✨ Playbook UI extension fully activated with snippets, autocomplete, hover, validation, and definition support!`
  )
  console.log(`[${timestamp}] Extension ready to use.`)
}

export function deactivate() {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] Playbook UI extension is now deactivating...`)
}
