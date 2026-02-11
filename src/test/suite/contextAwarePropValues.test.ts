import * as assert from "assert"
import * as vscode from "vscode"
import {  loadMetadata, getPropValues } from "../../metadata"
import * as path from "path"

suite("Context-Aware Prop Values Test Suite", () => {
  let metadata: any

  suiteSetup(async () => {
    const extensionPath = path.resolve(__dirname, "../../../")
    metadata = await loadMetadata(extensionPath)
  })

  test("Should return Rails values for ERB files - position prop", () => {
    const position = metadata.globalProps.position
    assert.ok(position, "position prop should exist")

    // ERB file should get Rails values (no "static")
    const railsValues = getPropValues(position, "erb")
    assert.ok(railsValues, "Should return values for ERB")
    assert.strictEqual(railsValues.includes("relative"), true, "Rails should have 'relative'")
    assert.strictEqual(railsValues.includes("static"), false, "Rails should NOT have 'static'")
  })

  test("Should return React values for TSX files - position prop", () => {
    const position = metadata.globalProps.position
    assert.ok(position, "position prop should exist")

    // TSX file should get React values (includes "static")
    const reactValues = getPropValues(position, "typescriptreact")
    assert.ok(reactValues, "Should return values for TSX")
    assert.strictEqual(reactValues.includes("relative"), true, "React should have 'relative'")
    assert.strictEqual(reactValues.includes("static"), true, "React should have 'static'")
  })

  test("Should return Rails values for ERB files - truncate prop", () => {
    const truncate = metadata.globalProps.truncate
    assert.ok(truncate, "truncate prop should exist")

    // Rails should not have "none"
    const railsValues = getPropValues(truncate, "erb")
    assert.ok(railsValues, "Should return values for ERB")
    assert.strictEqual(railsValues.includes("1"), true, "Rails should have '1'")
    assert.strictEqual(railsValues.includes("none"), false, "Rails should NOT have 'none'")
  })

  test("Should return React values for TSX files - truncate prop", () => {
    const truncate = metadata.globalProps.truncate
    assert.ok(truncate, "truncate prop should exist")

    // React should have "none"
    const reactValues = getPropValues(truncate, "typescriptreact")
    assert.ok(reactValues, "Should return values for TSX")
    assert.strictEqual(reactValues.includes("1"), true, "React should have '1'")
    assert.strictEqual(reactValues.includes("none"), true, "React should have 'none'")
  })

  test("Should return Rails values for Ruby files", () => {
    const position = metadata.globalProps.position
    const railsValues = getPropValues(position, "ruby")
    assert.ok(railsValues, "Should return values for Ruby")
    assert.strictEqual(railsValues.includes("static"), false, "Ruby should NOT have 'static'")
  })

  test("Should return React values for JavaScript React files", () => {
    const position = metadata.globalProps.position
    const reactValues = getPropValues(position, "javascriptreact")
    assert.ok(reactValues, "Should return values for JSX")
    assert.strictEqual(reactValues.includes("static"), true, "JSX should have 'static'")
  })

  test("Should return Rails values for top/bottom/left/right - includes 0, auto, initial, inherit", () => {
    const positioningProps = ["top", "bottom", "left", "right"]

    positioningProps.forEach(propName => {
      const prop = metadata.globalProps[propName]
      assert.ok(prop, `${propName} should exist`)

      const railsValues = getPropValues(prop, "erb")
      assert.ok(railsValues, `${propName} should have Rails values`)

      // Rails should have these values
      assert.strictEqual(railsValues.includes("0"), true, `Rails ${propName} should have '0'`)
      assert.strictEqual(railsValues.includes("auto"), true, `Rails ${propName} should have 'auto'`)
      assert.strictEqual(railsValues.includes("initial"), true, `Rails ${propName} should have 'initial'`)
      assert.strictEqual(railsValues.includes("inherit"), true, `Rails ${propName} should have 'inherit'`)
    })
  })

  test("Should return React values for top/bottom/left/right - includes xxl", () => {
    const positioningProps = ["top", "bottom", "left", "right"]

    positioningProps.forEach(propName => {
      const prop = metadata.globalProps[propName]
      const reactValues = getPropValues(prop, "typescriptreact")
      assert.ok(reactValues, `${propName} should have React values`)

      // React should have xxl (from TypeScript Sizes type)
      assert.strictEqual(reactValues.includes("xxl"), true, `React ${propName} should have 'xxl'`)
    })
  })

  test("Should fall back to generic values for props without separate Rails/React values", () => {
    // Props that don't have differences should work in both contexts
    const border_radius = metadata.globalProps.border_radius

    const erbValues = getPropValues(border_radius, "erb")
    const tsxValues = getPropValues(border_radius, "typescriptreact")

    // If there are no separate values, both should get the same values
    if (border_radius.railsValues && border_radius.reactValues) {
      assert.ok(erbValues, "ERB should get values")
      assert.ok(tsxValues, "TSX should get values")
    } else {
      // No separate values, should return generic values for both
      assert.deepStrictEqual(erbValues, tsxValues, "Should return same values when no separation")
    }
  })

  test("Should return Rails values for z_index - includes 'max'", () => {
    const z_index = metadata.globalProps.z_index
    assert.ok(z_index, "z_index should exist")

    const railsValues = getPropValues(z_index, "erb")
    assert.ok(railsValues, "Should return values for ERB")
    assert.strictEqual(railsValues.includes("max"), true, "Rails z_index should have 'max'")
  })

  test("Should return React values for z_index - may not include 'max'", () => {
    const z_index = metadata.globalProps.z_index
    const reactValues = getPropValues(z_index, "typescriptreact")

    // React might not have "max" (it's Rails-specific)
    if (z_index.reactValues && z_index.reactValues.length > 0 && !z_index.reactValues.includes("max")) {
      assert.ok(reactValues, "Should have React values")
      assert.strictEqual(reactValues!.includes("max"), false, "React z_index should NOT have 'max'")    }
  })
})
