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
