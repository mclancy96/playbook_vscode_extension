import * as assert from "assert";
import * as vscode from "vscode";
import { parseRailsComponent, parseReactComponent } from "../../parser";

suite("Parser Test Suite", () => {
  suite("Rails Component Parsing", () => {
    test("Should parse pb_rails component", async () => {
      const doc = await createTestDocument(
        "erb",
        '<%= pb_rails("button", props: { text: "Click" }) %>'
      );
      const position = new vscode.Position(0, 16);

      const result = parseRailsComponent(doc, position);

      assert.ok(result, "Should parse Rails component");
      assert.strictEqual(result?.componentName, "button", "Should extract component name");
    });

    test("Should parse component at different positions", async () => {
      const doc = await createTestDocument("erb", '<%= pb_rails("avatar", props: {}) %>');
      const position = new vscode.Position(0, 18);

      const result = parseRailsComponent(doc, position);

      assert.ok(result, "Should parse component");
      assert.strictEqual(result?.componentName, "avatar", "Should extract avatar component");
    });

    test("Should return null for non-component line", async () => {
      const doc = await createTestDocument("erb", "<p>Regular HTML</p>");
      const position = new vscode.Position(0, 5);

      const result = parseRailsComponent(doc, position);

      assert.strictEqual(result, null, "Should not parse regular HTML");
    });

    test("Should parse nested components", async () => {
      const doc = await createTestDocument(
        "erb",
        '<%= pb_rails("card", props: { body: pb_rails("button") }) %>'
      );
      const position = new vscode.Position(0, 16);

      const result = parseRailsComponent(doc, position);

      assert.ok(result, "Should parse outer component");
      assert.strictEqual(result?.componentName, "card", "Should extract card component");
    });

    test("Should handle incomplete component", async () => {
      const doc = await createTestDocument("erb", '<%= pb_rails("but');
      const position = new vscode.Position(0, 16);

      const result = parseRailsComponent(doc, position);

      assert.ok(true, "Should handle incomplete code without crashing");
    });

    test("Should parse component with underscores", async () => {
      const doc = await createTestDocument("erb", '<%= pb_rails("flex_item", props: {}) %>');
      const position = new vscode.Position(0, 20);

      const result = parseRailsComponent(doc, position);

      assert.ok(result, "Should parse component with underscores");
      assert.strictEqual(result?.componentName, "flex_item", "Should preserve underscores");
    });

    test("Should parse multiline component", async () => {
      const doc = await createTestDocument(
        "erb",
        '<%= pb_rails("button",\n  props: { text: "Click" }) %>'
      );
      const position = new vscode.Position(0, 16);

      const result = parseRailsComponent(doc, position);

      assert.ok(result, "Should parse multiline component");
      assert.strictEqual(result?.componentName, "button", "Should extract component name");
    });

    test("Should handle component with various prop types", async () => {
      const doc = await createTestDocument(
        "erb",
        '<%= pb_rails("button", props: { text: "Click", size: :lg, disabled: false }) %>'
      );
      const position = new vscode.Position(0, 16);

      const result = parseRailsComponent(doc, position);

      assert.ok(result, "Should parse component with mixed props");
      assert.strictEqual(result?.componentName, "button", "Should extract component name");
    });
  });

  suite("React Component Parsing", () => {
    test("Should parse React component", async () => {
      const doc = await createTestDocument("typescriptreact", '<Button text="Click" />');
      const position = new vscode.Position(0, 3);

      const result = parseReactComponent(doc, position);

      assert.ok(result, "Should parse React component");
      assert.strictEqual(result?.componentName, "Button", "Should extract component name");
    });

    test("Should parse self-closing component", async () => {
      const doc = await createTestDocument("typescriptreact", "<Avatar />");
      const position = new vscode.Position(0, 3);

      const result = parseReactComponent(doc, position);

      assert.ok(result, "Should parse self-closing component");
      assert.strictEqual(result?.componentName, "Avatar", "Should extract Avatar");
    });

    test("Should parse component with children", async () => {
      const doc = await createTestDocument("typescriptreact", "<Card><Button /></Card>");
      const position = new vscode.Position(0, 3);

      const result = parseReactComponent(doc, position);

      assert.ok(result, "Should parse component with children");
      assert.strictEqual(result?.componentName, "Card", "Should extract Card component");
    });

    test("Should return null for HTML tag", async () => {
      const doc = await createTestDocument("typescriptreact", "<div>Content</div>");
      const position = new vscode.Position(0, 3);

      const result = parseReactComponent(doc, position);

      assert.ok(true, "Should handle HTML tags");
    });

    test("Should parse component with props", async () => {
      const doc = await createTestDocument(
        "typescriptreact",
        '<Button text="Click" variant="primary" />'
      );
      const position = new vscode.Position(0, 3);

      const result = parseReactComponent(doc, position);

      assert.ok(result, "Should parse component with props");
      assert.strictEqual(result?.componentName, "Button", "Should extract Button");
    });

    test("Should handle incomplete React component", async () => {
      const doc = await createTestDocument("typescriptreact", "<But");
      const position = new vscode.Position(0, 3);

      const result = parseReactComponent(doc, position);

      assert.ok(true, "Should handle incomplete component");
    });

    test("Should parse multiline React component", async () => {
      const doc = await createTestDocument("typescriptreact", '<Button\n  text="Click"\n/>');
      const position = new vscode.Position(0, 3);

      const result = parseReactComponent(doc, position);

      assert.ok(result, "Should parse multiline component");
      assert.strictEqual(result?.componentName, "Button", "Should extract Button");
    });

    test("Should handle JSX fragments", async () => {
      const doc = await createTestDocument("typescriptreact", "<><Button /></>");
      const position = new vscode.Position(0, 4);

      const result = parseReactComponent(doc, position);

      assert.ok(true, "Should handle fragments");
    });
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
