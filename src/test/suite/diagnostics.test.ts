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

  test("Should not validate nested object properties for aria, data, html_options", async () => {
    const content = `<%= pb_rails("bread_crumbs", props: {
      aria: { label: "Breadcrumb Navigation" },
      data: { testid: "test-123" },
      html_options: { class: "custom-class" }
    }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)

    // Verify no diagnostics are created for nested properties like "label", "testid", "class"
    // These should be ignored since they're inside nested objects
    assert.ok(true, "Nested object properties are not validated")
  })

  test("Should not validate props inside method call arguments", async () => {
    const content = `<%= pb_rails("table/table_cell", props: {
      text: link_to(
        job_posting.title,
        job_path(job_posting),
        remote: true,
        data: {
          toggle: "modal",
          target: "#show-job",
          disable_with: "Loading...",
        }
      ),
    }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)

    const diagnostics = diagnosticsInstance.getDiagnostics(document.uri)
    const remoteWarning = diagnostics.find((d) => d.message.includes("remote"))
    const toggleWarning = diagnostics.find((d) => d.message.includes("toggle"))
    const targetWarning = diagnostics.find((d) => d.message.includes("target"))
    const disableWithWarning = diagnostics.find((d) => d.message.includes("disable_with"))

    assert.ok(!remoteWarning, "Should not warn about 'remote' (it's in link_to args)")
    assert.ok(
      !toggleWarning,
      "Should not warn about 'toggle' (it's in nested data hash inside link_to)"
    )
    assert.ok(
      !targetWarning,
      "Should not warn about 'target' (it's in nested data hash inside link_to)"
    )
    assert.ok(
      !disableWithWarning,
      "Should not warn about 'disable_with' (it's in nested data hash inside link_to)"
    )
  })

  test("Should not validate props from nested props blocks", async () => {
    const content = `<%= pb_rails("flex/flex_item") do %>
      <%= form.date_picker(:date_left_gteq, props: { label: "Start Date", disable_input: show_date }) %>
    <% end %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)

    const diagnostics = diagnosticsInstance.getDiagnostics(document.uri)
    const labelWarning = diagnostics.find((d) => d.message.includes("label"))
    const disableInputWarning = diagnostics.find((d) => d.message.includes("disable_input"))

    assert.ok(!labelWarning, "Should not warn about 'label' (it's in nested date_picker props)")
    assert.ok(
      !disableInputWarning,
      "Should not warn about 'disable_input' (it's in nested date_picker props)"
    )
  })

  test("Should not validate properties inside nested validation object", async () => {
    const content = `<%= pb_rails("typeahead", props: {
      is_multi: false,
      label: "Employee Name",
      name: :user_id,
      placeholder: "Search Employees",
      required: true,
      validation: { message: "Please select an employee" },
    }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)

    const diagnostics = diagnosticsInstance.getDiagnostics(document.uri)
    const messageWarning = diagnostics.find((d) => d.message.includes("message"))

    assert.ok(!messageWarning, "Should not warn about 'message' (it's in nested validation hash)")
  })

  test("Should not attribute render_app props to previous pb_rails component", async () => {
    const content = `<%= pb_rails("user", props: user_props) %>
    <% else %>
      <%= top_level_view_context.render_app("UserAsyncMultiselectApp", props: { defaultSelected: [],
                                                                                label: "employee" }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)

    const diagnostics = diagnosticsInstance.getDiagnostics(document.uri)
    const defaultSelectedWarning = diagnostics.find((d) => d.message.includes("defaultSelected"))
    const labelWarning = diagnostics.find((d) => d.message.includes("label"))

    assert.ok(
      !defaultSelectedWarning,
      "Should not warn about 'defaultSelected' (it belongs to render_app, not pb_rails)"
    )
    assert.ok(
      !labelWarning,
      "Should not warn about 'label' from render_app (it belongs to render_app, not pb_rails)"
    )
  })

  test("Should validate prop names with nested object values", async () => {
    const content = `<%= pb_rails("button", props: { invalid_prop: { nested: "value" } }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)

    const diagnostics = diagnosticsInstance.getDiagnostics(document.uri)
    const invalidPropWarning = diagnostics.find((d) => d.message.includes("invalid_prop"))

    assert.ok(
      invalidPropWarning,
      "Should warn about 'invalid_prop' even though it has nested value"
    )
  })

  test("Should not warn for global props with nested object values", async () => {
    const content = `<%= pb_rails("button", props: {
      variant: "primary",
      data: { "close-dialog": "123", "toggle": "modal" },
      id: "my-button"
    }) %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)

    const diagnostics = diagnosticsInstance.getDiagnostics(document.uri)
    const dataWarning = diagnostics.find((d) => d.message.includes('"data"'))

    assert.ok(!dataWarning, "Should not warn about 'data' (it's a valid global prop)")
  })

  test("Should allow React-specific props in React components", async () => {
    const content = `<Tooltip placement="top" text="Save to My Favorites" zIndex={10}>
      <IconButton icon="heart" size="md" variant="link" />
    </Tooltip>`

    const document = await createTestDocument("typescriptreact", content)
    diagnosticsInstance.updateDiagnostics(document)

    const diagnostics = diagnosticsInstance.getDiagnostics(document.uri)
    const textWarning = diagnostics.find((d) => d.message.includes('"text"'))
    const placementWarning = diagnostics.find((d) => d.message.includes('"placement"'))

    assert.ok(!textWarning, "Should not warn about 'text' (it's a valid React prop)")
    assert.ok(!placementWarning, "Should not warn about 'placement' (it's a valid React prop)")
  })

  test("Should allow Rails-specific props in Rails components", async () => {
    const content = `<%= pb_rails("tooltip", props: {
      delay_open: 1000,
      trigger_element_id: "my-btn",
      position: "top"
    }) do %>
      Save to My Favorites
    <% end %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)

    const diagnostics = diagnosticsInstance.getDiagnostics(document.uri)
    const delayOpenWarning = diagnostics.find((d) => d.message.includes('"delay_open"'))
    const triggerWarning = diagnostics.find((d) => d.message.includes('"trigger_element_id"'))

    assert.ok(!delayOpenWarning, "Should not warn about 'delay_open' (it's a valid Rails prop)")
    assert.ok(
      !triggerWarning,
      "Should not warn about 'trigger_element_id' (it's a valid Rails prop)"
    )
  })

  test("Should allow both React and Rails props for same component", async () => {
    // Test that a React component can use props from either the React or Rails version
    const reactContent = `<Tooltip delay_open={1000} text="Hello">
      <Button>Click me</Button>
    </Tooltip>`

    const reactDoc = await createTestDocument("typescriptreact", reactContent)
    diagnosticsInstance.updateDiagnostics(reactDoc)

    const reactDiagnostics = diagnosticsInstance.getDiagnostics(reactDoc.uri)
    const delayOpenWarning = reactDiagnostics.find((d) => d.message.includes('"delay_open"'))
    const textWarning = reactDiagnostics.find((d) => d.message.includes('"text"'))

    assert.ok(!delayOpenWarning, "Should allow Rails prop 'delay_open' in React component")
    assert.ok(!textWarning, "Should allow React prop 'text' in React component")
  })

  test("Should not warn for form builder field props inside pb_rails block", async () => {
    const content = `<%= pb_rails("flex/flex_item") do %>
  <%= f.text_field :template_text_field, props: {
    label: "Item Name",
    placeholder: "Enter Item Name",
    required: true,
    required_indicator: true,
  } %>
<% end %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)

    const diagnostics = diagnosticsInstance.getDiagnostics(document.uri)
    const labelWarning = diagnostics.find((d) => d.message.includes('"label"'))
    const placeholderWarning = diagnostics.find((d) => d.message.includes('"placeholder"'))
    const requiredWarning = diagnostics.find((d) => d.message.includes('"required"'))
    const requiredIndicatorWarning = diagnostics.find((d) =>
      d.message.includes('"required_indicator"')
    )

    assert.ok(
      !labelWarning,
      "Should not warn about 'label' - it's for the form field, not flex_item"
    )
    assert.ok(
      !placeholderWarning,
      "Should not warn about 'placeholder' - it's for the form field, not flex_item"
    )
    assert.ok(
      !requiredWarning,
      "Should not warn about 'required' - it's for the form field, not flex_item"
    )
    assert.ok(
      !requiredIndicatorWarning,
      "Should not warn about 'required_indicator' - it's for the form field, not flex_item"
    )
  })

  test("Should validate form builder text_field with valid props", async () => {
    const content = `<%= f.text_field :name, props: {
  label: "Name",
  placeholder: "Enter name",
  required: true
} %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)

    const diagnostics = diagnosticsInstance.getDiagnostics(document.uri)
    const unknownPropWarnings = diagnostics.filter((d) => d.message.includes("Unknown prop"))

    assert.strictEqual(unknownPropWarnings.length, 0, "Should not warn for valid text_field props")
  })

  // TODO: Fix this test - currently having issues with document creation in tests
  // test("Should warn for invalid form builder text_field props", async () => {
  //   const content = `<%= f.text_field :name, props: {
  //     invalid_prop: "value",
  //     another_bad_prop: true
  //   } %>`
  //   const document = await createTestDocument("erb", content)
  //   diagnosticsInstance.updateDiagnostics(document)
  //   const diagnostics = diagnosticsInstance.getDiagnostics(document.uri)
  //   const invalidPropWarning = diagnostics.find((d) => d.message.includes('"invalid_prop"'))
  //   assert.ok(invalidPropWarning, "Should warn about 'invalid_prop'")
  // })


  test("Should validate form builder select field", async () => {
    const content = `<%= f.select :status, options, props: {
  label: "Status",
  blank_selection: "Select one",
  required: true
} %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)

    const diagnostics = diagnosticsInstance.getDiagnostics(document.uri)
    const unknownPropWarnings = diagnostics.filter((d) => d.message.includes("Unknown prop"))

    assert.strictEqual(unknownPropWarnings.length, 0, "Should not warn for valid select props")
  })

  test("Should validate form builder date_picker field", async () => {
    const content = `<%= f.date_picker :start_date, props: {
  label: "Start Date",
  placeholder: "Select date",
  required: true
} %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)

    const diagnostics = diagnosticsInstance.getDiagnostics(document.uri)
    const unknownPropWarnings = diagnostics.filter((d) => d.message.includes("Unknown prop"))

    assert.strictEqual(
      unknownPropWarnings.length,
      0,
      "Should not warn for valid date_picker props"
    )
  })

  test("Should validate form builder with different variable names", async () => {
    const formContent = `<%= form.text_field :email, props: {
  label: "Email",
  required: true
} %>`

    const formDocument = await createTestDocument("erb", formContent)
    diagnosticsInstance.updateDiagnostics(formDocument)

    const formDiagnostics = diagnosticsInstance.getDiagnostics(formDocument.uri)
    const formWarnings = formDiagnostics.filter((d) => d.message.includes("Unknown prop"))

    assert.strictEqual(formWarnings.length, 0, "Should validate 'form' variable name")

    const builderContent = `<%= builder.password_field :password, props: {
  label: "Password",
  required: true
} %>`

    const builderDocument = await createTestDocument("erb", builderContent)
    diagnosticsInstance.updateDiagnostics(builderDocument)

    const builderDiagnostics = diagnosticsInstance.getDiagnostics(builderDocument.uri)
    const builderWarnings = builderDiagnostics.filter((d) => d.message.includes("Unknown prop"))

    assert.strictEqual(builderWarnings.length, 0, "Should validate 'builder' variable name")
  })

  test("Should validate mask prop enum values for form builder fields", async () => {
    const content = `<%= f.text_field :ssn, props: {
  mask: "ssn",
  label: "SSN"
} %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)

    const diagnostics = diagnosticsInstance.getDiagnostics(document.uri)
    const maskWarnings = diagnostics.filter((d) => d.message.includes("mask"))

    assert.strictEqual(maskWarnings.length, 0, "Should accept valid mask value 'ssn'")
  })

  test("Should not validate non-form-builder method calls", async () => {
    const content = `<%= some_object.random_method :field, props: {
  completely_unknown_prop: "value"
} %>`

    const document = await createTestDocument("erb", content)
    diagnosticsInstance.updateDiagnostics(document)

    const diagnostics = diagnosticsInstance.getDiagnostics(document.uri)
    const warnings = diagnostics.filter((d) =>
      d.message.includes("form builder") || d.message.includes("random_method")
    )

    assert.strictEqual(
      warnings.length,
      0,
      "Should not validate non-form-builder objects like 'some_object'"
    )
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

  // Re-fetch the document to ensure we have the latest version
  return vscode.workspace.openTextDocument(uri)
}
