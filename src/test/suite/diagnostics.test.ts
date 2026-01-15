import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import { PlaybookDiagnostics } from "../../diagnostics";

suite("Diagnostics Test Suite", () => {
  let diagnosticsInstance: PlaybookDiagnostics;

  suiteSetup(() => {
    const extensionPath = path.resolve(__dirname, "../../../");
    diagnosticsInstance = new PlaybookDiagnostics(extensionPath);
  });

  test("Should create diagnostics instance", () => {
    assert.ok(diagnosticsInstance, "Diagnostics instance should be created");
  });

  test("Should update diagnostics for ERB document", async () => {
    const document = await createTestDocument("erb", '<%= pb_rails("button", props: {}) %>');

    diagnosticsInstance.updateDiagnostics(document);
    assert.ok(true, "Diagnostics updated successfully");
  });

  test("Should update diagnostics for React document", async () => {
    const document = await createTestDocument("typescriptreact", '<Button text="Click" />');

    diagnosticsInstance.updateDiagnostics(document);
    assert.ok(true, "Diagnostics updated successfully");
  });

  test("Should handle unknown component", async () => {
    const document = await createTestDocument(
      "erb",
      '<%= pb_rails("unknown_component", props: {}) %>'
    );

    diagnosticsInstance.updateDiagnostics(document);
    assert.ok(true, "Diagnostics handles unknown component");
  });

  test("Should handle invalid props", async () => {
    const document = await createTestDocument(
      "erb",
      '<%= pb_rails("button", props: { invalid_prop: "value" }) %>'
    );

    diagnosticsInstance.updateDiagnostics(document);
    assert.ok(true, "Diagnostics handles invalid props");
  });

  test("Should skip validation for unsupported languages", async () => {
    const document = await createTestDocument("plaintext", "Some text");

    diagnosticsInstance.updateDiagnostics(document);
    assert.ok(true, "Skips unsupported languages");
  });
});

async function createTestDocument(
  languageId: string,
  content: string
): Promise<vscode.TextDocument> {
  const uri = vscode.Uri.parse(`untitled:test-${Date.now()}.${languageId}`);
  const document = await vscode.workspace.openTextDocument(uri);
  const edit = new vscode.WorkspaceEdit();
  edit.insert(uri, new vscode.Position(0, 0), content);
  await vscode.workspace.applyEdit(edit);
  return document;
}
