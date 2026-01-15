import * as assert from "assert"
import * as vscode from "vscode"
import * as path from "path"
import {
  loadMetadata,
  findComponentByRailsName,
  findComponentByReactName,
  generateComponentDocs,
  generatePropDocs
} from "../../metadata"

suite("Metadata Test Suite", () => {
  let metadata: any

  suiteSetup(async () => {
    const extensionPath = path.resolve(__dirname, "../../../")
    metadata = await loadMetadata(extensionPath)
  })

  test("Should load metadata successfully", () => {
    assert.ok(metadata, "Metadata should be loaded")
    assert.ok(metadata.components, "Metadata should have components")
    assert.ok(Object.keys(metadata.components).length > 0, "Should have at least one component")
  })

  test("Should find component by Rails name", () => {
    const component = findComponentByRailsName(metadata, "button")
    assert.ok(component, "Should find button component")
    assert.strictEqual(component.rails, "button")
    assert.ok(component.props, "Component should have props")
  })

  test("Should find component by React name", () => {
    const component = findComponentByReactName(metadata, "Button")
    assert.ok(component, "Should find Button component")
    assert.strictEqual(component.react, "Button")
    assert.ok(component.props, "Component should have props")
  })

  test("Should return null for non-existent Rails component", () => {
    const component = findComponentByRailsName(metadata, "nonexistent_component")
    assert.strictEqual(component, null, "Should return null for non-existent component")
  })

  test("Should return null for non-existent React component", () => {
    const component = findComponentByReactName(metadata, "NonExistentComponent")
    assert.strictEqual(component, null, "Should return null for non-existent component")
  })

  test("Should generate component docs", () => {
    const component = findComponentByRailsName(metadata, "button")
    const docs = generateComponentDocs("Button", component!, metadata)

    assert.ok(docs.length > 0, "Should generate documentation")
    assert.ok(docs.includes("Button"), "Docs should include component name")
  })

  test("Should generate prop docs for enum prop", () => {
    const component = findComponentByRailsName(metadata, "button")
    assert.ok(component, "Button component should exist")

    const variantProp = component.props.variant
    if (variantProp && variantProp.values && variantProp.values.length > 0) {
      const docs = generatePropDocs("variant", variantProp)

      assert.ok(docs.length > 0, "Should generate prop documentation")
      assert.ok(docs.includes("variant"), "Docs should include prop name")
      assert.ok(docs.includes("Type:"), "Docs should include type info")
      assert.ok(docs.includes("Values:"), "Docs should include valid values for enum")
    }
  })

  test("Should generate prop docs for boolean prop", () => {
    const component = findComponentByRailsName(metadata, "button")
    assert.ok(component, "Button component should exist")

    const boolProp = Object.entries(component.props).find(
      ([_, prop]: [string, any]) => prop.type === "boolean"
    )

    if (boolProp) {
      const [propName, propData] = boolProp
      const docs = generatePropDocs(propName, propData as any)

      assert.ok(docs.length > 0, "Should generate prop documentation")
      assert.ok(docs.includes(propName), "Docs should include prop name")
      assert.ok(docs.includes("boolean"), "Docs should indicate boolean type")
    }
  })

  test("Should include default value in prop docs when available", () => {
    const component = findComponentByRailsName(metadata, "button")
    assert.ok(component, "Button component should exist")

    const propWithDefault = Object.entries(component.props).find(
      ([_, prop]: [string, any]) => prop.default !== undefined
    )

    if (propWithDefault) {
      const [propName, propData] = propWithDefault
      const docs = generatePropDocs(propName, propData as any)

      assert.ok(docs.includes("Default:"), "Docs should include default value")
    }
  })

  test("Should handle component with multiple props", () => {
    const component = findComponentByRailsName(metadata, "button")
    assert.ok(component, "Button component should exist")

    const propCount = Object.keys(component.props).length
    assert.ok(propCount > 0, "Component should have props")

    const docs = generateComponentDocs("Button", component, metadata)
    assert.ok(docs.length > 0, "Docs should be generated")
  })

  test("Should handle Rails and React name mapping", () => {
    const railsComponent = findComponentByRailsName(metadata, "button")
    const reactComponent = findComponentByReactName(metadata, "Button")

    assert.ok(railsComponent, "Should find component by Rails name")
    assert.ok(reactComponent, "Should find component by React name")

    assert.strictEqual(railsComponent.rails, reactComponent.rails)
    assert.strictEqual(railsComponent.react, reactComponent.react)
  })
})
