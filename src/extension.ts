import * as vscode from "vscode"

/**
 * Extension activation entry point
 * Called when one of the activation events defined in package.json is triggered
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("Playbook UI extension is now active")

  // Log supported languages
  const supportedLanguages = [
    "ruby",
    "erb",
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
  console.log("Playbook UI: Activated for languages:", supportedLanguages)

  // TODO: Register autocomplete provider for Playbook components
  // This will provide intelligent suggestions when typing:
  // - pb_rails("...") in Ruby/ERB files
  // - <Component in JSX/TSX files
  // Should read from data/playbook.json for component metadata

  // Example structure for future implementation:
  // const railsCompletionProvider = vscode.languages.registerCompletionItemProvider(
  //     ['ruby', 'erb'],
  //     {
  //         provideCompletionItems(document, position) {
  //             // Parse pb_rails context
  //             // Return completion items from playbook.json
  //         }
  //     },
  //     '"', '('  // Trigger characters
  // );
  // context.subscriptions.push(railsCompletionProvider);

  // TODO: Register hover provider for Playbook components
  // This will show documentation when hovering over:
  // - Component names in pb_rails calls
  // - React component tags
  // Should display prop information and descriptions from playbook.json

  // Example structure for future implementation:
  // const hoverProvider = vscode.languages.registerHoverProvider(
  //     supportedLanguages,
  //     {
  //         provideHover(document, position) {
  //             // Detect component name at position
  //             // Look up in playbook.json
  //             // Return formatted markdown with component info
  //         }
  //     }
  // );
  // context.subscriptions.push(hoverProvider);

  // TODO: Consider adding definition provider
  // Would allow "Go to Definition" to jump to Playbook documentation or source

  // TODO: Consider adding prop validation/diagnostics
  // Could warn about invalid prop names or values based on playbook.json schema
}

/**
 * Extension deactivation
 * Called when the extension is deactivated
 */
export function deactivate() {
  console.log("Playbook UI extension is now deactivated")
}
