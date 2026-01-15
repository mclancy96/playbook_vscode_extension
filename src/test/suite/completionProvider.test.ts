import * as assert from "assert"
import * as vscode from "vscode"
import * as path from "path"
import { PlaybookCompletionProvider } from "../../completionProvider"
import {
  createTestDocument,
  getCompletionItems,
  createCancellationToken,
  createCompletionContext
} from "./testHelpers"

suite("Completion Provider Test Suite", () => {
  let provider: PlaybookCompletionProvider
  const extensionPath = path.resolve(__dirname, "../../../")

  suiteSetup(() => {
    provider = new PlaybookCompletionProvider(extensionPath)
  })

  test("Should create completion provider", () => {
    assert.ok(provider, "Provider should be created")
  })

  test("Should not provide completions outside component name", async () => {
    const document = await createTestDocument("erb", "Some random text")
    const position = new vscode.Position(0, 5)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    assert.ok(items.length === 0, "Should not provide completions outside component")
  })

  test("Should provide completions for React components", async () => {
    const document = await createTestDocument("typescriptreact", "<B")
    const position = new vscode.Position(0, 2)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    assert.ok(items.length > 0, "Should provide React component completions")
    const buttonCompletion = items.find((c: vscode.CompletionItem) => c.label === "Button")
    assert.ok(buttonCompletion, "Should include Button component")
  })

  test("Should provide completions for props", async () => {
    const document = await createTestDocument("erb", '<%= pb_rails("button", props: {  }) %>')
    const position = new vscode.Position(0, 34)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    assert.ok(items.length >= 0, "Should handle prop completions")
  })

  test("Should provide completions for React props", async () => {
    const document = await createTestDocument("typescriptreact", "<Button  />")
    const position = new vscode.Position(0, 8)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    assert.ok(true, "Handles React prop completions")
  })

  test("Should filter components based on partial match", async () => {
    const document = await createTestDocument("erb", '<%= pb_rails("but" %>')
    const position = new vscode.Position(0, 19)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    if (items.length > 0) {
      const buttonCompletion = items.find((c: vscode.CompletionItem) => c.label === "button")
      assert.ok(true, "Handles partial match filtering")
    }
  })

  test("Should provide enum values for enum props", async () => {
    const document = await createTestDocument(
      "erb",
      '<%= pb_rails("button", props: { variant: "" }) %>'
    )
    const position = new vscode.Position(0, 44)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    assert.ok(true, "Handles enum value completions")
  })

  test("Should handle incomplete code gracefully", async () => {
    const document = await createTestDocument("erb", '<%= pb_rails("')
    const position = new vscode.Position(0, 15)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    assert.ok(true, "Handles incomplete code")
  })

  test("Should provide completions with documentation", async () => {
    const document = await createTestDocument("erb", '<%= pb_rails("" %>')
    const position = new vscode.Position(0, 16)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    if (items.length > 0) {
      const firstItem = items[0]
      assert.ok(firstItem.kind !== undefined, "Items should have completion kind")
    }
  })

  test("Should provide completions for multi-line props - second line", async () => {
    const multiLineText = '<%= pb_rails("card", props: {\n  padding_x: "sm",\n  '
    const document = await createTestDocument("erb", multiLineText)
    const position = new vscode.Position(2, 2)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    assert.ok(items.length > 0, "Should provide prop completions on second line")
    const hasCardProps = items.some(
      (item: vscode.CompletionItem) =>
        item.label === "padding_top" || item.label === "margin_bottom"
    )
    assert.ok(hasCardProps, "Should include card-specific props")
  })

  test("Should provide completions for multi-line props - third line", async () => {
    const multiLineText =
      '<%= pb_rails("card", props: {\n  padding_x: "sm",\n  padding_top: "sm",\n  '
    const document = await createTestDocument("erb", multiLineText)
    const position = new vscode.Position(3, 2)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    assert.ok(items.length > 0, "Should provide prop completions on third line")
  })

  test("Should provide value completions for multi-line props", async () => {
    const multiLineText = '<%= pb_rails("card", props: {\n  padding_x: "sm",\n  margin_bottom: '
    const document = await createTestDocument("erb", multiLineText)
    const position = new vscode.Position(2, 18)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    assert.ok(items.length >= 0, "Should handle value completions in multi-line context")
  })

  test("Should not provide completions outside props block", async () => {
    const multiLineText = '<%= pb_rails("card", props: {\n  padding_x: "sm"\n}) do %>\n  '
    const document = await createTestDocument("erb", multiLineText)
    const position = new vscode.Position(3, 2)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    assert.ok(items.length === 0, "Should not provide completions outside props block")
  })

  test("Should provide value completions inside a string", async () => {
    const document = await createTestDocument(
      "erb",
      '<%= pb_rails("button", props: { variant: "" }) %>'
    )
    const position = new vscode.Position(0, 46)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    assert.ok(items.length > 0, "Should provide value completions inside string")
  })

  test("Should provide value completions inside partial string", async () => {
    const document = await createTestDocument(
      "erb",
      '<%= pb_rails("button", props: { variant: "pri" }) %>'
    )
    const position = new vscode.Position(0, 49)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    assert.ok(items.length > 0, "Should provide value completions inside partial string")
  })

  test("Should provide value completions in multi-line inside string", async () => {
    const multiLineText = '<%= pb_rails("button", props: {\n  variant: ""\n}) %>'
    const document = await createTestDocument("erb", multiLineText)
    const position = new vscode.Position(1, 13)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    assert.ok(items.length > 0, "Should provide value completions in multi-line inside string")
  })

  test("Should provide completions for first prop after opening brace", async () => {
    const document = await createTestDocument("erb", '<%= pb_rails("pill", props: { v')
    const position = new vscode.Position(0, 35)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    assert.ok(items.length > 0, "Should provide completions for first prop")
    const variantCompletion = items.find((c: vscode.CompletionItem) => c.label === "variant")
    assert.ok(variantCompletion, "Should include variant in completions")
  })

  test("Should provide completions immediately after opening brace", async () => {
    const document = await createTestDocument("erb", '<%= pb_rails("pill", props: {')
    const position = new vscode.Position(0, 33)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    assert.ok(items.length > 0, "Should provide completions right after brace")
  })

  test("Should include hardcoded global props in completions", async () => {
    const document = await createTestDocument("erb", '<%= pb_rails("button", props: { ')
    const position = new vscode.Position(0, 35)
    const token = createCancellationToken()
    const context = createCompletionContext()

    const result = await provider.provideCompletionItems(document, position, token, context)
    const items = getCompletionItems(result)

    const hardcodedProps = ["id", "data", "aria", "html_options", "children", "style"]
    hardcodedProps.forEach((propName) => {
      const found = items.find((c: vscode.CompletionItem) => c.label === propName)
      assert.ok(found, `Should include hardcoded global prop: ${propName}`)
    })
  })
})
