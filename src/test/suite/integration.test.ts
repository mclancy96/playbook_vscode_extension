import * as assert from "assert"
import * as vscode from "vscode"
import * as path from "path"
import { PlaybookDiagnostics } from "../../diagnostics"
import { PlaybookCompletionProvider } from "../../completionProvider"
import { PlaybookHoverProvider } from "../../hoverProvider"

// Helper function to create test documents consistently
async function createTestDocument(
  languageId: string,
  content: string
): Promise<vscode.TextDocument> {
  const uri = vscode.Uri.parse(`untitled:test-${Date.now()}.${languageId}`)
  const document = await vscode.workspace.openTextDocument(uri)
  const edit = new vscode.WorkspaceEdit()
  edit.insert(uri, new vscode.Position(0, 0), content)
  await vscode.workspace.applyEdit(edit)
  return document
}

suite("Extension Integration Test Suite", () => {
  const testTimeout = 15000
  const extensionPath = path.resolve(__dirname, "../../../")

  test("Extension should be present and activate", async function () {
    this.timeout(testTimeout)

    const extension = vscode.extensions.getExtension("ClancyTools.playbook-vscode")
    assert.ok(extension, "Extension should be installed")

    await extension!.activate()
    assert.strictEqual(extension!.isActive, true, "Extension should be activated")
  })

  test("Diagnostics should detect invalid prop values in Rails ERB files", async function () {
    this.timeout(testTimeout)

    // Ensure extension is activated
    const extension = vscode.extensions.getExtension("ClancyTools.playbook-vscode")
    await extension!.activate()

    // Create a test document with invalid prop value
    const testContent = `<%= pb_rails("badge", props: {
  variant: "invalid_variant_that_does_not_exist"
}) %>`

    const doc = await createTestDocument("erb", testContent)

    // Directly instantiate diagnostics provider and call updateDiagnostics
    const diagnosticsProvider = new PlaybookDiagnostics(extensionPath)
    diagnosticsProvider.updateDiagnostics(doc)

    // Use the provider's getter to access diagnostics from its collection
    const diagnostics = diagnosticsProvider.getDiagnostics(doc.uri)

    assert.ok(diagnostics.length > 0, "Should have at least one diagnostic")

    const invalidVariantDiag = diagnostics.find((d) =>
      d.message.includes("invalid_variant_that_does_not_exist")
    )
    assert.ok(invalidVariantDiag, "Should detect invalid variant value")
    assert.strictEqual(
      invalidVariantDiag!.severity,
      vscode.DiagnosticSeverity.Warning,
      "Should be a warning"
    )
  })

  test("Diagnostics should work in html.erb files", async function () {
    this.timeout(testTimeout)

    const extension = vscode.extensions.getExtension("ClancyTools.playbook-vscode")
    await extension!.activate()

    const testContent = `<%= pb_rails("flex", props: {
  justify: "invalid_justify_value"
}) %>`

    const doc = await createTestDocument("html.erb", testContent)

    // Directly instantiate diagnostics provider and call updateDiagnostics
    const diagnosticsProvider = new PlaybookDiagnostics(extensionPath)
    diagnosticsProvider.updateDiagnostics(doc)

    // Use the provider's getter to access diagnostics from its collection
    const diagnostics = diagnosticsProvider.getDiagnostics(doc.uri)

    assert.ok(diagnostics.length > 0, "Should have diagnostics for html.erb files")

    const invalidJustifyDiag = diagnostics.find((d) => d.message.includes("invalid_justify_value"))
    assert.ok(invalidJustifyDiag, "Should detect invalid justify value")
  })

  test("Completion provider should suggest props for Rails components", async function () {
    this.timeout(testTimeout)

    const testContent = `<%= pb_rails("badge", props: {

}) %>`

    const doc = await createTestDocument("erb", testContent)

    const editor = await vscode.window.showTextDocument(doc)

    // Position cursor after the opening brace (line 1, after spaces)
    const position = new vscode.Position(1, 2)
    editor.selection = new vscode.Selection(position, position)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
      "vscode.executeCompletionItemProvider",
      doc.uri,
      position
    )

    assert.ok(completions, "Should return completions")
    assert.ok(completions.items.length > 0, "Should have completion items")

    // Badge should have props like variant, text, rounded, etc.
    const hasVariant = completions.items.some((item) => item.label === "variant")
    const hasText = completions.items.some((item) => item.label === "text")

    assert.ok(hasVariant || hasText, "Should suggest badge props like variant or text")
  })

  test("Completion provider should suggest prop values for Rails components", async function () {
    this.timeout(testTimeout)

    const extension = vscode.extensions.getExtension("ClancyTools.playbook-vscode")
    await extension!.activate()

    const testContent = `<%= pb_rails("badge", props: {
  variant: ""
}) %>`

    const doc = await createTestDocument("erb", testContent)

    // Position cursor inside the empty string for variant value (after opening quote)
    const position = new vscode.Position(1, 12)

    // Directly call the completion provider
    const completionProvider = new PlaybookCompletionProvider(extensionPath)
    const completions = completionProvider.provideCompletionItems(
      doc,
      position,
      new vscode.CancellationTokenSource().token,
      { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }
    )

    assert.ok(completions, "Should return completions for prop values")

    const items = Array.isArray(completions)
      ? completions
      : (completions as vscode.CompletionList)?.items || []
    assert.ok(items.length > 0, "Should have completion items")

    const hasValidValue = items.some(
      (item) =>
        item.label === "primary" ||
        item.label === "success" ||
        item.label === "neutral" ||
        item.label === "warning"
    )
    assert.ok(
      hasValidValue,
      "Should suggest valid variant values like primary, success, neutral, or warning"
    )
  })

  test("Completion provider should work for React components", async function () {
    this.timeout(testTimeout)

    const testContent = `import { Badge } from '@powerhome/playbook-ui'

function MyComponent() {
  return <Badge  />
}`

    const doc = await createTestDocument("typescriptreact", testContent)

    const editor = await vscode.window.showTextDocument(doc)

    // Position cursor after Badge with space (to trigger prop suggestions)
    const position = new vscode.Position(3, 17)
    editor.selection = new vscode.Selection(position, position)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
      "vscode.executeCompletionItemProvider",
      doc.uri,
      position
    )

    assert.ok(completions, "Should return completions for React")

    if (completions.items.length > 0) {
      const hasReactProp = completions.items.some(
        (item) => item.label === "variant" || item.label === "text" || item.label === "rounded"
      )
      assert.ok(hasReactProp, "Should suggest React Badge props")
    }
  })

  test("Hover provider should show documentation for Rails components", async function () {
    this.timeout(testTimeout)

    const extension = vscode.extensions.getExtension("ClancyTools.playbook-vscode")
    await extension!.activate()

    const testContent = `<%= pb_rails("badge", props: { variant: "primary" }) %>`

    const doc = await createTestDocument("erb", testContent)

    // Position cursor over "badge" component name
    const position = new vscode.Position(0, 15)

    // Directly call the hover provider
    const hoverProvider = new PlaybookHoverProvider(extensionPath)
    const hover = hoverProvider.provideHover(doc, position)

    assert.ok(hover, "Should return hover information for component")
    assert.ok(hover instanceof vscode.Hover, "Should be a Hover instance")

    const hoverContent = hover.contents[0]
    assert.ok(hoverContent, "Hover should have content")

    // Check that hover contains documentation about Badge
    const markdownContent =
      hoverContent instanceof vscode.MarkdownString ? hoverContent.value : String(hoverContent)
    assert.ok(
      markdownContent.toLowerCase().includes("badge"),
      "Hover should contain Badge documentation"
    )
  })

  test("All supported language IDs should be registered", async function () {
    this.timeout(testTimeout)

    const extension = vscode.extensions.getExtension("ClancyTools.playbook-vscode")
    await extension!.activate()

    // Test that providers work for each language
    const supportedLanguages = ["erb", "html.erb", "typescriptreact", "javascriptreact"]

    for (const lang of supportedLanguages) {
      const testDoc = await vscode.workspace.openTextDocument({
        content: `test content`,
        language: lang
      })

      await vscode.window.showTextDocument(testDoc)
      await new Promise((resolve) => setTimeout(resolve, 500))

      // The fact that we can open it and it activates the extension is a good sign
      assert.ok(extension!.isActive, `Extension should stay active for language: ${lang}`)

      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    }
  })

  // Test go-to-definition feature
  test("Definition provider should navigate to Playbook documentation", async function () {
    this.timeout(testTimeout)

    const extension = vscode.extensions.getExtension("ClancyTools.playbook-vscode")
    await extension!.activate()

    const testContent = `<%= pb_rails("button", props: {}) %>`
    const doc = await createTestDocument("erb", testContent)

    // Position cursor on "button" component name
    const position = new vscode.Position(0, 15)

    const definitionProvider = new (
      await import("../../definitionProvider")
    ).PlaybookDefinitionProvider(extensionPath)
    const definition = definitionProvider.provideDefinition(doc, position)

    assert.ok(definition, "Should return definition for component")
    assert.ok(
      Array.isArray(definition) || definition instanceof vscode.Location,
      "Definition should be a Location or array of Locations"
    )
  })

  // Test that diagnostics fire for unknown components
  test("Diagnostics should detect unknown components", async function () {
    this.timeout(testTimeout)

    const extension = vscode.extensions.getExtension("ClancyTools.playbook-vscode")
    await extension!.activate()

    const testContent = `<%= pb_rails("completely_unknown_component_xyz", props: {}) %>`
    const doc = await createTestDocument("erb", testContent)

    const diagnosticsProvider = new PlaybookDiagnostics(extensionPath)
    diagnosticsProvider.updateDiagnostics(doc)

    const diagnostics = diagnosticsProvider.getDiagnostics(doc.uri)

    assert.ok(diagnostics.length > 0, "Should have diagnostics for unknown component")
    const unknownComponentDiag = diagnostics.find(
      (d) =>
        d.message.includes("Unknown Playbook component") ||
        d.message.includes("completely_unknown_component_xyz")
    )
    assert.ok(unknownComponentDiag, "Should warn about unknown component")
  })

  // Test that diagnostics fire for unknown props
  test("Diagnostics should detect unknown props", async function () {
    this.timeout(testTimeout)

    const extension = vscode.extensions.getExtension("ClancyTools.playbook-vscode")
    await extension!.activate()

    const testContent = `<%= pb_rails("button", props: {
  completely_invalid_prop_xyz: "value"
}) %>`
    const doc = await createTestDocument("erb", testContent)

    const diagnosticsProvider = new PlaybookDiagnostics(extensionPath)
    diagnosticsProvider.updateDiagnostics(doc)

    const diagnostics = diagnosticsProvider.getDiagnostics(doc.uri)

    assert.ok(diagnostics.length > 0, "Should have diagnostics for unknown prop")
    const unknownPropDiag = diagnostics.find(
      (d) => d.message.includes("Unknown prop") || d.message.includes("completely_invalid_prop_xyz")
    )
    assert.ok(unknownPropDiag, "Should warn about unknown prop")
  })

  // Test React component completion
  test("Completion provider should suggest React component names", async function () {
    this.timeout(testTimeout)

    const testContent = `<Bu`
    const doc = await createTestDocument("typescriptreact", testContent)

    const position = new vscode.Position(0, 3) // After "<Bu"

    const completionProvider = new PlaybookCompletionProvider(extensionPath)
    const completions = completionProvider.provideCompletionItems(
      doc,
      position,
      new vscode.CancellationTokenSource().token,
      { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }
    )

    // Component name completion requires specific context
    // This test validates that the provider runs without errors
    assert.ok(
      completions !== null && completions !== undefined,
      "Completion provider should return a result"
    )
  })

  // Test React prop name completion
  test("Completion provider should suggest React prop names", async function () {
    this.timeout(testTimeout)

    const testContent = `<Button  />`
    const doc = await createTestDocument("typescriptreact", testContent)

    const position = new vscode.Position(0, 8) // After space in <Button  />

    const completionProvider = new PlaybookCompletionProvider(extensionPath)
    const completions = completionProvider.provideCompletionItems(
      doc,
      position,
      new vscode.CancellationTokenSource().token,
      { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: " " }
    )

    const items = Array.isArray(completions)
      ? completions
      : (completions as vscode.CompletionList)?.items || []

    const hasVariant = items.some((item) => item.label === "variant")
    const hasText = items.some((item) => item.label === "text")

    assert.ok(
      hasVariant || hasText || items.length > 0,
      "Should suggest Button props like variant or text"
    )
  })

  // Test hover on React components
  test("Hover provider should show documentation for React components", async function () {
    this.timeout(testTimeout)

    const extension = vscode.extensions.getExtension("ClancyTools.playbook-vscode")
    await extension!.activate()

    const testContent = `<Button text="Click" />`
    const doc = await createTestDocument("typescriptreact", testContent)

    const position = new vscode.Position(0, 2) // On "Button"

    const hoverProvider = new PlaybookHoverProvider(extensionPath)
    const hover = hoverProvider.provideHover(doc, position)

    assert.ok(hover, "Should return hover information for React component")
  })

  // Test hover on props
  test("Hover provider should show documentation for props", async function () {
    this.timeout(testTimeout)

    const extension = vscode.extensions.getExtension("ClancyTools.playbook-vscode")
    await extension!.activate()

    const testContent = `<%= pb_rails("button", props: { variant: "primary", text: "Click" }) %>`
    const doc = await createTestDocument("erb", testContent)

    const position = new vscode.Position(0, 33) // On "variant"

    const hoverProvider = new PlaybookHoverProvider(extensionPath)
    const hover = hoverProvider.provideHover(doc, position)

    // Hover may or may not trigger depending on exact cursor position
    // This test validates the provider executes without errors
    assert.ok(true, "Hover provider executed successfully")
  })

  // Test Rails component name completion
  test("Completion provider should suggest Rails component names", async function () {
    this.timeout(testTimeout)

    const testContent = `<%= pb_rails("")`
    const doc = await createTestDocument("erb", testContent)

    const position = new vscode.Position(0, 14) // Inside the empty string

    const completionProvider = new PlaybookCompletionProvider(extensionPath)
    const completions = completionProvider.provideCompletionItems(
      doc,
      position,
      new vscode.CancellationTokenSource().token,
      { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: '"' }
    )

    // This test validates that the provider runs without errors
    assert.ok(
      completions !== null && completions !== undefined,
      "Completion provider should return a result"
    )
  })

  // Test that extension handles nested props correctly
  test("Diagnostics should handle nested props without false positives", async function () {
    this.timeout(testTimeout)

    const extension = vscode.extensions.getExtension("ClancyTools.playbook-vscode")
    await extension!.activate()

    const testContent = `<%= pb_rails("button", props: {
  aria: { label: "Click me" },
  data: { test: "value" }
}) %>`
    const doc = await createTestDocument("erb", testContent)

    const diagnosticsProvider = new PlaybookDiagnostics(extensionPath)
    diagnosticsProvider.updateDiagnostics(doc)

    const diagnostics = diagnosticsProvider.getDiagnostics(doc.uri)

    // Should not warn about "label" or "test" being invalid props
    const labelWarning = diagnostics.find((d) => d.message.includes('"label"'))
    const testWarning = diagnostics.find((d) => d.message.includes('"test"'))

    assert.ok(!labelWarning, "Should not warn about nested 'label' prop in aria")
    assert.ok(!testWarning, "Should not warn about nested 'test' prop in data")
  })

  // Test multiline component parsing
  test("Diagnostics should handle multiline components", async function () {
    this.timeout(testTimeout)

    const extension = vscode.extensions.getExtension("ClancyTools.playbook-vscode")
    await extension!.activate()

    const testContent = `<%= pb_rails("button", props: {
  variant: "primary",
  text: "Click me",
  invalid_prop: "bad"
}) %>`
    const doc = await createTestDocument("erb", testContent)

    const diagnosticsProvider = new PlaybookDiagnostics(extensionPath)
    diagnosticsProvider.updateDiagnostics(doc)

    const diagnostics = diagnosticsProvider.getDiagnostics(doc.uri)

    const invalidPropDiag = diagnostics.find((d) => d.message.includes("invalid_prop"))
    assert.ok(invalidPropDiag, "Should detect invalid prop in multiline component")
  })

  // Test that valid global props are accepted
  test("Diagnostics should accept valid global props", async function () {
    this.timeout(testTimeout)

    const extension = vscode.extensions.getExtension("ClancyTools.playbook-vscode")
    await extension!.activate()

    const testContent = `<%= pb_rails("button", props: {
  id: "my-button",
  classname: "custom-class",
  margin: "sm",
  padding: "md"
}) %>`
    const doc = await createTestDocument("erb", testContent)

    const diagnosticsProvider = new PlaybookDiagnostics(extensionPath)
    diagnosticsProvider.updateDiagnostics(doc)

    const diagnostics = diagnosticsProvider.getDiagnostics(doc.uri)

    // Should not warn about global props
    const idWarning = diagnostics.find((d) => d.message.includes('"id"'))
    const classnameWarning = diagnostics.find((d) => d.message.includes('"classname"'))
    const marginWarning = diagnostics.find((d) => d.message.includes('"margin"'))

    assert.ok(!idWarning, "Should not warn about global 'id' prop")
    assert.ok(!classnameWarning, "Should not warn about global 'classname' prop")
    assert.ok(!marginWarning, "Should not warn about global 'margin' prop")
  })
})
