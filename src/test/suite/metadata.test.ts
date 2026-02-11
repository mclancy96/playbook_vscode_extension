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

  test("Should have hardcoded global props (id, data, aria, html_options, children, style)", () => {
    assert.ok(metadata.globalProps, "Metadata should have globalProps")

    const hardcodedProps = ["id", "data", "aria", "html_options", "children", "style"]
    hardcodedProps.forEach((propName) => {
      assert.ok(metadata.globalProps[propName], `Should have ${propName} global prop`)
      assert.strictEqual(
        metadata.globalProps[propName].type,
        "string",
        `${propName} should be string type`
      )
    })
  })

  test("Should have align_items with all values including type alias values", () => {
    assert.ok(metadata.globalProps, "Metadata should have globalProps")
    assert.ok(metadata.globalProps.align_items, "Should have align_items global prop")

    const alignItems = metadata.globalProps.align_items
    assert.ok(alignItems.values, "align_items should have values")

    assert.ok(alignItems.values.includes("start"), "Should include 'start' from Alignment")
    assert.ok(alignItems.values.includes("end"), "Should include 'end' from Alignment")
    assert.ok(alignItems.values.includes("center"), "Should include 'center' from Alignment")

    assert.ok(alignItems.values.includes("flexStart"), "Should include 'flexStart'")
    assert.ok(alignItems.values.includes("flexEnd"), "Should include 'flexEnd'")
    assert.ok(alignItems.values.includes("stretch"), "Should include 'stretch'")
    assert.ok(alignItems.values.includes("baseline"), "Should include 'baseline'")
  })

  test("Should have global props extracted from TypeScript", () => {
    assert.ok(metadata.globalProps, "Metadata should have globalProps")

    const expectedProps = [
      "padding",
      "margin",
      "dark",
      "display",
      "position",
      "vertical_align",
      "text_align",
      "flex_direction"
    ]

    expectedProps.forEach((propName) => {
      assert.ok(
        metadata.globalProps[propName],
        `Should have ${propName} global prop extracted from TypeScript`
      )
    })
  })

  test("Should resolve component name collision (body vs layout/body)", () => {
    const bodyComponent = findComponentByRailsName(metadata, "body")
    assert.ok(bodyComponent, "Should find body component")

    assert.ok(bodyComponent.props, "Body component should have props")
  })

  test("Should have spacing props extracted from TypeScript", () => {
    assert.ok(metadata.globalProps, "Metadata should have globalProps")

    const spacingProps = ["padding", "padding_top", "margin", "margin_left"]

    spacingProps.forEach((propName) => {
      const prop = metadata.globalProps[propName]
      assert.ok(prop, `Should have ${propName}`)
      assert.strictEqual(prop.type, "string", `${propName} should be string type`)
      // Spacing props should have at least some values from TypeScript extraction
      assert.ok(prop.values && prop.values.length > 0, `${propName} should have values`)
    })
  })

  test("Should have positioning props with combined values from Ruby and TypeScript", () => {
    assert.ok(metadata.globalProps, "Metadata should have globalProps")

    // Test bottom - should have Ruby values (authoritative) plus any additional TypeScript values
    const bottom = metadata.globalProps.bottom
    assert.ok(bottom, "Should have bottom prop")
    assert.strictEqual(bottom.type, "string", "bottom should be string type")
    assert.ok(bottom.values, "bottom should have values")

    // Ruby values should all be present (from bottom.rb)
    const rubyBottomValues = ["0", "xxs", "xs", "sm", "md", "lg", "xl", "auto", "initial", "inherit"]
    rubyBottomValues.forEach(value => {
      assert.ok(
        bottom.values.includes(value),
        `bottom should include Ruby value '${value}' from bottom.rb`
      )
    })

    // Also verify other positioning props exist
    const positioningProps = ["top", "right", "left"]
    positioningProps.forEach((propName) => {
      const prop = metadata.globalProps[propName]
      assert.ok(prop, `Should have ${propName}`)
      assert.strictEqual(prop.type, "string", `${propName} should be string type`)
      assert.ok(prop.values && prop.values.length > 0, `${propName} should have values`)
    })
  })

  test("Should have sizing props with correct enum values", () => {
    assert.ok(metadata.globalProps, "Metadata should have globalProps")

    // Width/height/max-width should have enum values
    const widthProps = ["width", "min_width", "max_width"]
    widthProps.forEach((propName) => {
      const prop = metadata.globalProps[propName]
      assert.ok(prop, `Should have ${propName}`)
      assert.strictEqual(prop.type, "string", `${propName} should be string type`)
      assert.ok(prop.values && prop.values.length > 0, `${propName} should have enum values`)
    })

    // Height props should have enum values
    const heightProps = ["height", "min_height", "max_height"]
    heightProps.forEach((propName) => {
      const prop = metadata.globalProps[propName]
      assert.ok(prop, `Should have ${propName}`)
      assert.strictEqual(prop.type, "string", `${propName} should be string type`)
      assert.ok(prop.values && prop.values.length > 0, `${propName} should have enum values`)
    })

    // Verify width has correct values
    const widthValues = metadata.globalProps.width.values
    assert.ok(widthValues.includes("xs"), "width should include 'xs'")
    assert.ok(widthValues.includes("100%"), "width should include '100%'")
    assert.ok(widthValues.includes("none"), "width should include 'none'")

    // Verify height has correct values
    const heightValues = metadata.globalProps.height.values
    assert.ok(heightValues.includes("xs"), "height should include 'xs'")
    assert.ok(heightValues.includes("auto"), "height should include 'auto'")
    assert.ok(heightValues.includes("xxxl"), "height should include 'xxxl'")
  })
})
