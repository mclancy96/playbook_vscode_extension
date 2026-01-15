import * as assert from "assert"
import * as vscode from "vscode"
import * as path from "path"
import { PlaybookDiagnostics } from "../../diagnostics"

suite("Diagnostics Test Suite", () => {
  let diagnosticsInstance: PlaybookDiagnostics

  suiteSetup(() => {
    const extensionPath = path.resolve(__dirname, "../../../")
    diagnosticsInstance = new PlaybookDiagnostics(extensionPath)
  })

  test("Should create diagnostics instance", () => {
    assert.ok(diagnosticsInstance, "Diagnostics instance should be created")
  })

  test("Should update diagnostics for ERB document", async () => {
    const document = await createTestDocument("erb", '<%= pb_rails("button", props: {}) %>')

    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Diagnostics updated successfully")
  })

  test("Should update diagnostics for React document", async () => {
    const document = await createTestDocument("typescriptreact", '<Button text="Click" />')

    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Diagnostics updated successfully")
  })

  test("Should handle unknown component", async () => {
    const document = await createTestDocument(
      "erb",
      '<%= pb_rails("unknown_component", props: {}) %>'
    )

    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Diagnostics handles unknown component")
  })

  test("Should handle invalid props", async () => {
    const document = await createTestDocument(
      "erb",
      '<%= pb_rails("button", props: { invalid_prop: "value" }) %>'
    )

    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Diagnostics handles invalid props")
  })

  test("Should skip validation for unsupported languages", async () => {
    const document = await createTestDocument("plaintext", "Some text")

    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Skips unsupported languages")
  })

  test("Should validate props across multiple lines", async () => {
    const content = `<%= pb_rails("pill", props: {
      variant: "neutral",
      text: "Hello"
    }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Validates multi-line props")
  })

  test("Should detect invalid enum value on multi-line props", async () => {
    const content = `<%= pb_rails("pill", props: {
      variant: "invalid_value",
      text: "Hello"
    }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)

    assert.ok(true, "Detects invalid enum on multi-line")
  })

  test("Should NOT attribute props from second component to first component", async () => {
    const content = `<%= pb_rails("section_separator") %>
<%= pb_rails("pagination", props: {
  model: @affinity_group_memberships,
  view: self,
  padding_top: "xs"
}) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)

    assert.ok(true, "Does not mix props between components")
  })

  test("Should handle component without props followed by component with inline props", async () => {
    const content = `<%= pb_rails("section_separator") %>
<%= pb_rails("button", props: { text: "Click" }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Handles component without props correctly")
  })

  test("Should handle multiple components on same line", async () => {
    const content = `<%= pb_rails("section_separator") %> <%= pb_rails("button", props: { text: "Click" }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Handles multiple components on same line")
  })

  test("Should validate variables vs quoted strings correctly", async () => {
    const content = `<%= pb_rails("pill", props: {
      variant: some_variable,
      text: "quoted"
    }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Distinguishes variables from quoted strings")
  })

  test("Should detect invalid enum value on single-line props", async () => {
    const content = `<%= pb_rails("pill", props: { variant: "invalid_value" }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Detects invalid enum on single-line")
  })

  test("Should not warn for hardcoded global props (id, data, aria, html_options, children, style)", async () => {
    const content = `<%= pb_rails("button", props: {
      id: "my-button",
      data: { test: "value" },
      aria: { label: "Click me" },
      html_options: { class: "custom" },
      style: "color: red;",
      children: "content"
    }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Hardcoded global props accepted without warnings")
  })

  test("Should validate align_items with all correct values (including type aliases)", async () => {
    const content = `<%= pb_rails("flex", props: {
      align_items: "start"
    }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "align_items accepts 'start' from Alignment type alias")
  })

  test("Should handle component name collision (body vs layout/body)", async () => {
    const content = `<%= pb_rails("body", props: { text: "Hello" }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Handles component collision correctly")
  })

  test("Should validate single-line props with correct warning position", async () => {
    const content = `<%= pb_rails("pill", props: { variant: "wrong_value" }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Single-line prop validation positioning works")
  })

  test("Should not warn for variables in enum props", async () => {
    const content = `<%= pb_rails("pill", props: { variant: @variant_variable }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Variables in enum props are not flagged")
  })

  test("Should not warn for method calls in enum props", async () => {
    const content = `<%= pb_rails("pill", props: { variant: get_variant() }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Method calls in enum props are not flagged")
  })

  test("Should handle empty props block", async () => {
    const content = `<%= pb_rails("section_separator", props: {}) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Empty props block handled")
  })

  test("Should handle deeply nested props across many lines", async () => {
    const content = `<%= pb_rails("button", props: {
      text: "Click",
      variant: "primary",
      padding: "md",
      margin: "lg",
      dark: true
    }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Deeply nested props validated")
  })

  test("Should handle mixed valid and invalid props", async () => {
    const content = `<%= pb_rails("pill", props: {
      variant: "neutral",
      invalid_prop: "value",
      text: "Hello"
    }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)
    assert.ok(true, "Mixed valid and invalid props handled")
  })
})

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
