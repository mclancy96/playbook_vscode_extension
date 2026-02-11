#!/usr/bin/env ts-node

import * as fs from "fs"
import * as path from "path"

const PLAYBOOK_REPO_PATH =
  process.env.PLAYBOOK_REPO_PATH ||
  path.join(__dirname, "../../playbook/playbook/app/pb_kits/playbook")
const OUTPUT_DIR = path.join(__dirname, "..")
const SNIPPETS_DIR = path.join(OUTPUT_DIR, "snippets")
const DATA_DIR = path.join(OUTPUT_DIR, "data")

interface PropDefinition {
  name: string
  type: string
  default?: string
  values?: string[]
  required?: boolean
}

interface ComponentMetadata {
  name: string
  railsName: string
  reactName: string
  description?: string
  props: PropDefinition[]
  hasChildren: boolean
}

function extractGlobalPropsFromTypeScript(playbookPath: string): Record<string, any> {
  const playbookRoot = path.dirname(path.dirname(path.dirname(playbookPath)))
  const globalPropsPath = path.join(playbookRoot, "app/pb_kits/playbook/utilities/globalProps.ts")

  if (!fs.existsSync(globalPropsPath)) {
    console.warn(`Could not find globalProps.ts at ${globalPropsPath}`)
    return {}
  }

  const content = fs.readFileSync(globalPropsPath, "utf-8")
  const globalProps: Record<string, any> = {}

  const typeAliases: Record<string, string[]> = {}

  const typesDir = path.join(playbookRoot, "app/pb_kits/playbook/types")
  const typeFiles = ["sizes.ts", "display.ts", "base.ts", "spacing.ts"]

  typeFiles.forEach(typeFile => {
    const typePath = path.join(typesDir, typeFile)
    if (fs.existsSync(typePath)) {
      const typeContent = fs.readFileSync(typePath, "utf-8")
      const exportTypeRegex = /export\s+type\s+(\w+)\s*=\s*([^;\n]+)/g
      let match

      while ((match = exportTypeRegex.exec(typeContent)) !== null) {
        const typeName = match[1]
        const typeDef = match[2].trim()

        const values: string[] = []
        const quotedValuesRegex = /"([^"]+)"/g
        let valueMatch

        while ((valueMatch = quotedValuesRegex.exec(typeDef)) !== null) {
          values.push(valueMatch[1])
        }

        if (values.length > 0) {
          typeAliases[typeName] = values
        }
      }
    }
  })

  const simpleTypeRegex = /type\s+(\w+)\s*=\s*([^{][^;\n]+)/g
  let aliasMatch

  while ((aliasMatch = simpleTypeRegex.exec(content)) !== null) {
    const typeName = aliasMatch[1]
    const typeDef = aliasMatch[2].trim()

    if (typeDef.includes('{')) continue

    const values: string[] = []
    const quotedValuesRegex = /"([^"]+)"/g
    let valueMatch

    while ((valueMatch = quotedValuesRegex.exec(typeDef)) !== null) {
      values.push(valueMatch[1])
    }

    const numericRegex = /\b(\d+)\b/g
    let numMatch
    while ((numMatch = numericRegex.exec(typeDef)) !== null) {
      values.push(numMatch[1])
    }

    const typeRefRegex = /\b([A-Z]\w+)\b/g
    let typeMatch
    while ((typeMatch = typeRefRegex.exec(typeDef)) !== null) {
      const refType = typeMatch[1]
      if (typeAliases[refType]) {
        values.push(...typeAliases[refType])
      }
    }

    if (values.length > 0) {
      typeAliases[typeName] = [...new Set(values)] // Remove duplicates
    }
  }

  function extractEnumValues(valuesDef: string): string[] {
    const enumValues: string[] = []

    const quotedValuesRegex = /"([^"]+)"/g
    let valueMatch
    while ((valueMatch = quotedValuesRegex.exec(valuesDef)) !== null) {
      enumValues.push(valueMatch[1])
    }

    const numericRegex = /\b(\d+)\b/g
    let numMatch
    while ((numMatch = numericRegex.exec(valuesDef)) !== null) {
      if (!enumValues.includes(numMatch[1])) {
        enumValues.push(numMatch[1])
      }
    }

    const typeRefRegex = /\b([A-Z]\w+)\b/g
    let typeMatch
    while ((typeMatch = typeRefRegex.exec(valuesDef)) !== null) {
      const referencedType = typeMatch[1]
      if (typeAliases[referencedType]) {
        enumValues.push(...typeAliases[referencedType])
      }
    }

    return [...new Set(enumValues)] // Remove duplicates
  }

  const typeDefRegex = /type\s+(\w+)\s*=\s*\{([^}]+)\}/gs
  let typeMatch

  while ((typeMatch = typeDefRegex.exec(content)) !== null) {
    const typeName = typeMatch[1]
    const typeBody = typeMatch[2]

    if (typeName === 'GlobalProps') continue

    const propRegex = /(\w+)\?:\s*([^,}]+(?:,\s*)?)/gs
    let propMatch

    while ((propMatch = propRegex.exec(typeBody)) !== null) {
      const propNameCamelCase = propMatch[1]
      let valuesDef = propMatch[2].trim()

      valuesDef = valuesDef.replace(/,\s*$/, '').trim()

      if (
        propNameCamelCase === "break" ||
        propNameCamelCase === "default" ||
        propNameCamelCase === "value" ||
        propNameCamelCase === "inset" ||
        propNameCamelCase.length <= 1
      ) {
        continue
      }

      const propName = propNameCamelCase.replace(/([A-Z])/g, "_$1").toLowerCase()

      if (globalProps[propName]) {
        continue
      }

      const enumValues = extractEnumValues(valuesDef)

      let propType = "string"
      if (valuesDef.includes("boolean")) {
        propType = "boolean"
      } else if (
        valuesDef.includes("Binary") ||
        valuesDef.includes("number") ||
        valuesDef.match(/\b\d+\s*\|/) ||
        valuesDef.match(/^\d/)
      ) {
        propType = "number"
      }

      globalProps[propName] = {
        type: propType,
        ...(enumValues.length > 0 && { values: enumValues })
      }
    }
  }

  // Extract sizing and positioning values from Ruby modules (width, height, top, bottom, etc.)
  // These are defined in lib/playbook/*.rb files with *_values methods
  // Store Rails and React values separately for context-specific validation
  const sizingPropsFromRuby = extractSizingPropsFromRuby(playbookRoot)
  Object.keys(sizingPropsFromRuby).forEach((key) => {
    if (globalProps[key] && globalProps[key].values) {
      // Both TypeScript and Ruby define this prop - store separately
      const tsValues = globalProps[key].values || []
      const rubyValues = sizingPropsFromRuby[key].values || []

      // Combine for backward compatibility
      const combined = [
        ...rubyValues,
        ...tsValues.filter((v: string) => !rubyValues.includes(v))
      ]

      globalProps[key] = {
        ...globalProps[key],
        values: combined,
        railsValues: rubyValues,
        reactValues: tsValues
      }
    } else {
      // Only Ruby defines this prop
      globalProps[key] = {
        ...sizingPropsFromRuby[key],
        railsValues: sizingPropsFromRuby[key].values
      }
    }
  })

  // For props only in TypeScript, set reactValues
  Object.keys(globalProps).forEach((key) => {
    if (globalProps[key].values && !globalProps[key].railsValues && !globalProps[key].reactValues) {
      globalProps[key].reactValues = globalProps[key].values
    }
  })

  // Debug: Log props with separate values
  const propsWithSeparateValues = Object.keys(globalProps).filter(k =>
    globalProps[k].railsValues || globalProps[k].reactValues
  )
  if (propsWithSeparateValues.length > 0) {
    console.log(`\n📝 Props with separate Rails/React values: ${propsWithSeparateValues.join(', ')}`)
  }

  // Ensure critical props are present with fallbacks (only for props not in Ruby/TypeScript)
  if (!globalProps.dark) {
    globalProps.dark = { type: "boolean" }
  }

  // Props that aren't in globalProps.ts or Ruby but are needed for Rails/forms
  if (!globalProps.aria) {
    globalProps.aria = { type: "string" }
  }
  if (!globalProps.children) {
    globalProps.children = { type: "string" }
  }
  if (!globalProps.classname) {
    globalProps.classname = { type: "string" }
  }
  if (!globalProps.class_name) {
    globalProps.class_name = { type: "string" }
  }
  if (!globalProps.data) {
    globalProps.data = { type: "string" }
  }
  if (!globalProps.html_options) {
    globalProps.html_options = { type: "string" }
  }
  if (!globalProps.id) {
    globalProps.id = { type: "string" }
  }
  if (!globalProps.style) {
    globalProps.style = { type: "string" }
  }

  return globalProps
}

function extractSizingPropsFromRuby(playbookRoot: string): Record<string, any> {
  const sizingProps: Record<string, any> = {}
  const libDir = path.join(playbookRoot, "lib/playbook")

  if (!fs.existsSync(libDir)) {
    console.warn(`lib/playbook directory not found at ${libDir}`)
    return sizingProps
  }

  // Dynamically scan all .rb files in lib/playbook
  const rubyFiles = fs.readdirSync(libDir).filter(file => file.endsWith('.rb'))

  rubyFiles.forEach(fileName => {
    const filePath = path.join(libDir, fileName)
    const content = fs.readFileSync(filePath, "utf-8")

    // Extract all *_values methods from this file
    const valuesRegex = /def\s+(\w+)_values\s*\n\s*%w\[([^\]]+)\]/g
    let match

    while ((match = valuesRegex.exec(content)) !== null) {
      const methodName = match[1] // e.g., "height", "width", "min_width"
      const valuesStr = match[2]
      const values = valuesStr.trim().split(/\s+/)

      // Only add if we found actual values
      if (values.length > 0 && values[0]) {
        sizingProps[methodName] = {
          type: "string",
          values: values
        }
      }
    }
  })

  return sizingProps
}

function extractGlobalPropsList(playbookPath: string): string[] {
  const playbookRoot = path.dirname(path.dirname(path.dirname(playbookPath)))
  const helperPath = path.join(playbookRoot, "lib/playbook/pb_forms_global_props_helper.rb")

  if (!fs.existsSync(helperPath)) {
    console.warn(
      `Could not find pb_forms_global_props_helper.rb at ${helperPath}, using fallback global props`
    )
    return [
      "padding",
      "padding_top",
      "padding_bottom",
      "padding_left",
      "padding_right",
      "padding_x",
      "padding_y",
      "margin",
      "margin_top",
      "margin_bottom",
      "margin_left",
      "margin_right",
      "margin_x",
      "margin_y",
      "shadow",
      "width",
      "min_width",
      "max_width",
      "height",
      "min_height",
      "max_height",
      "position",
      "vertical_alignment",
      "z_index",
      "line_height",
      "number_spacing",
      "border_radius",
      "text_size",
      "letter_spacing",
      "display",
      "cursor",
      "hover",
      "text_align",
      "overflow",
      "overflow_x",
      "overflow_y",
      "truncate",
      "group_hover"
    ]
  }

  const content = fs.readFileSync(helperPath, "utf-8")
  const match = content.match(/global_props\s*=\s*%i\[([^\]]+)\]/)

  if (!match) {
    console.warn("Could not parse global_props from helper file")
    return []
  }

  return match[1]
    .split(/\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

function extractGlobalPropValues(propName: string, playbookPath: string): string[] | undefined {
  const playbookRoot = path.dirname(path.dirname(path.dirname(playbookPath)))
  const libPath = path.join(playbookRoot, "lib/playbook", `${propName}.rb`)

  if (!fs.existsSync(libPath)) {
    return undefined
  }

  const content = fs.readFileSync(libPath, "utf-8")

  const valuesMatch = content.match(
    new RegExp(`def\\s+${propName}_values\\s+%w\\[([^\\]]+)\\]`, "i")
  )

  if (!valuesMatch) {
    return undefined
  }

  return valuesMatch[1]
    .split(/\s+/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

function parsePropLine(line: string): PropDefinition | null {
  const propMatch = line.match(/prop\s+:(\w+)(?:,\s*(.+))?/)
  if (!propMatch) {
    return null
  }

  const name = propMatch[1]
  const rest = propMatch[2] || ""

  const prop: PropDefinition = { name, type: "any" }

  const typeMatch = rest.match(/type:\s*Playbook::Props::(\w+)/)
  if (typeMatch) {
    prop.type = typeMatch[1].toLowerCase()
  }

  const defaultMatch = rest.match(/default:\s*([^,\n]+)/)
  if (defaultMatch) {
    prop.default = defaultMatch[1].trim()
  }

  const valuesMatch = rest.match(/values:\s*%w\[([^\]]+)\]|values:\s*\[([^\]]+)\]/)
  if (valuesMatch) {
    const valuesStr = valuesMatch[1] || valuesMatch[2]
    prop.values = valuesStr
      .split(/[\s,]+/)
      .map((v) => v.replace(/["']/g, "").trim())
      .filter((v) => v && v !== "nil" && v.length > 0)
  }

  return prop
}

function parseRubyComponent(filePath: string, componentName: string): ComponentMetadata | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8")
    const lines = content.split("\n")

    const props: PropDefinition[] = []
    let inPropSection = false
    let currentPropLines: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line.includes("class") && line.includes("Playbook::KitBase")) {
        inPropSection = true
        continue
      }

      if (inPropSection && line.match(/^\s*def\s+/)) {
        break
      }

      if (inPropSection && line.includes("prop :")) {
        currentPropLines = [line]

        while (i + 1 < lines.length) {
          const nextLine = lines[i + 1]
          if (nextLine.match(/^\s{20,}/) || nextLine.trim().match(/^(values|default|type):/)) {
            currentPropLines.push(nextLine)
            i++
          } else {
            break
          }
        }

        const fullPropDef = currentPropLines.join(" ")
        const prop = parsePropLine(fullPropDef)
        if (prop) {
          props.push(prop)
        }
        currentPropLines = []
      }
    }

    const hasChildren =
      content.includes("content_tag") ||
      content.includes("yield") ||
      componentName.match(/card|flex|layout|section|collapsible/i) !== null

    let reactName: string
    if (componentName.includes("/")) {
      const subComponentName = componentName.split("/").pop()!
      reactName = subComponentName
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("")
    } else {
      reactName = componentName
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("")
    }

    return {
      name: componentName,
      railsName: componentName,
      reactName,
      props,
      hasChildren
    }
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error)
    return null
  }
}

function scanPlaybookComponents(): ComponentMetadata[] {
  const components: ComponentMetadata[] = []

  if (!fs.existsSync(PLAYBOOK_REPO_PATH)) {
    console.error(`Playbook repository not found at: ${PLAYBOOK_REPO_PATH}`)
    console.error("Set PLAYBOOK_REPO_PATH environment variable to the correct path.")
    process.exit(1)
  }

  const entries = fs.readdirSync(PLAYBOOK_REPO_PATH)

  for (const entry of entries) {
    if (!entry.startsWith("pb_") || entry === "pb_kit" || entry === "pb_docs") {
      continue
    }

    const componentDir = path.join(PLAYBOOK_REPO_PATH, entry)
    const stats = fs.statSync(componentDir)

    if (!stats.isDirectory()) {
      continue
    }

    const rubyFile = path.join(componentDir, `${entry.replace("pb_", "")}.rb`)
    if (fs.existsSync(rubyFile)) {
      const metadata = parseRubyComponent(rubyFile, entry.replace("pb_", ""))
      if (metadata) {
        components.push(metadata)
      }
    }

    const subComponentFiles = fs
      .readdirSync(componentDir)
      .filter((file) => file.endsWith(".rb") && file !== `${entry.replace("pb_", "")}.rb`)

    for (const subFile of subComponentFiles) {
      const subComponentPath = path.join(componentDir, subFile)
      const subComponentName = subFile.replace(".rb", "")
      const fullComponentName = `${entry.replace("pb_", "")}/${subComponentName}`

      const metadata = parseRubyComponent(subComponentPath, fullComponentName)
      if (metadata) {
        components.push(metadata)
      }
    }
  }

  return components.sort((a, b) => a.name.localeCompare(b.name))
}

function generateERBSnippet(component: ComponentMetadata): any {
  const { name, props, hasChildren } = component
  const prefix = `pb_${name}`

  const propLines: string[] = []
  let tabIndex = 1

  const priorityProps = ["text", "variant", "size"]
  const orderedProps = [
    ...props.filter((p) => priorityProps.includes(p.name)),
    ...props.filter((p) => !priorityProps.includes(p.name))
  ]

  for (const prop of orderedProps.slice(0, 5)) {
    if (prop.values && prop.values.length > 0) {
      const choices = prop.values.join(",")
      propLines.push(`\t${prop.name}: "\${${tabIndex}|${choices}|}\",`)
    } else if (prop.default !== undefined && prop.default !== "nil" && prop.default !== "false") {
      propLines.push(`\t${prop.name}: "\${${tabIndex}:${prop.default.replace(/"/g, "")}}\",`)
    } else {
      propLines.push(`\t${prop.name}: "\${${tabIndex}}\",`)
    }
    tabIndex++
  }

  const body: string[] = []

  if (hasChildren) {
    body.push(`<%= pb_rails("${name}", props: {`)
    if (propLines.length > 0) {
      body.push(...propLines)
    }
    body.push(`\t$0`)
    body.push(`}) do %>`)
    body.push(`\t\${${tabIndex}:Content}`)
    body.push(`<% end %>`)
  } else {
    body.push(`<%= pb_rails("${name}", props: {`)
    if (propLines.length > 0) {
      body.push(...propLines)
    }
    body.push(`\t$0`)
    body.push(`}) %>`)
  }

  return {
    prefix,
    body,
    description: `Playbook ${component.reactName} component for Rails/ERB`
  }
}

function generateReactSnippet(component: ComponentMetadata): any {
  const { reactName, props, hasChildren } = component
  const prefix = `pb${reactName}`

  const propLines: string[] = []
  let tabIndex = 1

  const priorityProps = ["text", "variant", "size"]
  const orderedProps = [
    ...props.filter((p) => priorityProps.includes(p.name)),
    ...props.filter((p) => !priorityProps.includes(p.name))
  ]

  for (const prop of orderedProps.slice(0, 5)) {
    const propName = prop.name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())

    if (prop.values && prop.values.length > 0) {
      const choices = prop.values.map((v) => `"${v}"`).join(",")
      propLines.push(`\t${propName}={\${${tabIndex}|${choices}|}}`)
    } else if (prop.type === "boolean") {
      propLines.push(`\t${propName}={\${${tabIndex}|true,false|}}`)
    } else if (prop.default !== undefined && prop.default !== "nil" && prop.default !== "false") {
      propLines.push(`\t${propName}="\${${tabIndex}:${prop.default.replace(/"/g, "")}}"`)
    } else {
      propLines.push(`\t${propName}="\${${tabIndex}}"`)
    }
    tabIndex++
  }

  const body: string[] = []

  if (hasChildren) {
    body.push(`<${reactName}`)
    if (propLines.length > 0) {
      body.push(...propLines)
    }
    body.push(`\t$0`)
    body.push(`>`)
    body.push(`\t\${${tabIndex}:Content}`)
    body.push(`</${reactName}>`)
  } else {
    body.push(`<${reactName}`)
    if (propLines.length > 0) {
      body.push(...propLines)
    }
    body.push(`\t$0`)
    body.push(`/>`)
  }

  return {
    prefix,
    body,
    description: `Playbook ${reactName} component for React`
  }
}

function generateSnippets(components: ComponentMetadata[]): void {
  const railsSnippets: Record<string, any> = {}
  const reactSnippets: Record<string, any> = {}

  for (const component of components) {
    const railsSnippetName = component.railsName.includes("/")
      ? `Playbook ${component.railsName
          .split("/")
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join("")}`
      : `Playbook ${component.reactName}`
    const reactSnippetName = `Playbook ${component.reactName}`

    railsSnippets[railsSnippetName] = generateERBSnippet(component)
    reactSnippets[reactSnippetName] = generateReactSnippet(component)
  }

  reactSnippets["Playbook import"] = {
    prefix: "pbImport",
    body: ["import { ${1:Button} } from 'playbook-ui'$0"],
    description: "Import Playbook components"
  }

  fs.writeFileSync(path.join(SNIPPETS_DIR, "rails.json"), JSON.stringify(railsSnippets, null, 2))

  fs.writeFileSync(path.join(SNIPPETS_DIR, "react.json"), JSON.stringify(reactSnippets, null, 2))

  console.log(`✅ Generated ${Object.keys(railsSnippets).length} Rails snippets`)
  console.log(`✅ Generated ${Object.keys(reactSnippets).length} React snippets`)
}

function parseReactPropsFromTypeScript(
  componentDir: string,
  componentName: string
): PropDefinition[] {
  const tsxFile = path.join(componentDir, `_${componentName.split("/").pop()}.tsx`)

  if (!fs.existsSync(tsxFile)) {
    return []
  }

  try {
    const content = fs.readFileSync(tsxFile, "utf-8")
    const props: PropDefinition[] = []

    const pascalName = componentName
      .split("/")
      .pop()!
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("")

    const typePattern = `type\\s+${pascalName}Props\\s*=\\s*\\{`
    const startIndex = content.search(new RegExp(typePattern))

    if (startIndex === -1) {
      return []
    }

    let braceCount = 0
    let inType = false
    let typeBody = ""

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i]
      if (char === "{") {
        braceCount++
        inType = true
      } else if (char === "}") {
        braceCount--
        if (braceCount === 0) {
          break
        }
      }
      if (inType && braceCount > 0) {
        typeBody += char
      }
    }

    typeBody = typeBody.substring(typeBody.indexOf("{") + 1)

    const lines = typeBody.split("\n")

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
        continue
      }

      const propMatch = trimmed.match(/^(\w+)\??:\s*(.+?)(?:,|$)/)
      if (!propMatch) {
        continue
      }

      const propName = propMatch[1]
      const propType = propMatch[2].trim().replace(/,$/, "")

      if (["aria", "data", "htmlOptions", "className", "children"].includes(propName)) {
        continue
      }

      let type = "any"
      let values: string[] | undefined

      if (propType.includes("|")) {
        const literalValues = propType.match(/["']([^"']+)["']/g)
        if (literalValues && literalValues.length > 0) {
          type = "enum"
          values = literalValues.map((v: string) => v.replace(/["']/g, ""))
        } else if (propType.includes("string")) {
          type = "string"
        } else if (propType.includes("number")) {
          type = "number"
        } else if (propType.includes("boolean")) {
          type = "boolean"
        }
      } else if (propType.startsWith("string")) {
        type = "string"
      } else if (propType.startsWith("number")) {
        type = "number"
      } else if (propType.startsWith("boolean")) {
        type = "boolean"
      }

      const snakeCaseName = propName.replace(/([A-Z])/g, "_$1").toLowerCase()

      props.push({
        name: snakeCaseName,
        type,
        ...(values && { values })
      })
    }

    return props
  } catch (error) {
    console.warn(`Could not parse React props from ${tsxFile}:`, error)
    return []
  }
}

function mergeComponentProps(components: ComponentMetadata[]): ComponentMetadata[] {
  return components.map((component) => {
    const reactProps = parseReactPropsFromTypeScript(
      path.join(PLAYBOOK_REPO_PATH, `pb_${component.name.split("/")[0]}`),
      component.name
    )

    const mergedPropsMap = new Map<string, PropDefinition>()

    component.props.forEach((prop) => {
      mergedPropsMap.set(prop.name, prop)
    })

    reactProps.forEach((prop) => {
      if (!mergedPropsMap.has(prop.name)) {
        mergedPropsMap.set(prop.name, prop)
      }
    })

    return {
      ...component,
      props: Array.from(mergedPropsMap.values())
    }
  })
}

function generateMetadata(components: ComponentMetadata[], globalProps: Record<string, any>): void {
  console.log(
    `✅ Extracted ${Object.keys(globalProps).length} global props from TypeScript definitions`
  )
  const metadata: any = {
    $schema: "./playbook-schema.json",
    generatedAt: new Date().toISOString(),
    globalProps,
    components: {}
  }

  for (const component of components) {
    const key = component.railsName.includes("/") ? component.railsName : component.reactName

    metadata.components[key] = {
      rails: component.railsName,
      react: component.reactName,
      description: `Playbook ${component.reactName} component`,
      hasChildren: component.hasChildren,
      props: component.props.reduce(
        (acc, prop) => {
          acc[prop.name] = {
            type: prop.type,
            ...(prop.default !== undefined && { default: prop.default }),
            ...(prop.values && { values: prop.values }),
            ...(prop.required && { required: prop.required })
          }
          return acc
        },
        {} as Record<string, any>
      )
    }
  }

  fs.writeFileSync(path.join(DATA_DIR, "playbook.json"), JSON.stringify(metadata, null, 2))

  console.log(`✅ Generated metadata for ${components.length} components`)
}

function main() {
  console.log("🔄 Syncing with Playbook UI repository...\n")
  console.log(`Scanning: ${PLAYBOOK_REPO_PATH}\n`)

  const components = scanPlaybookComponents()

  console.log(`Found ${components.length} components:\n`)
  components
    .slice(0, 10)
    .forEach((c) => console.log(`  - ${c.reactName} (${c.props.length} props)`))
  if (components.length > 10) {
    console.log(`  ... and ${components.length - 10} more\n`)
  }

  console.log("\n🔄 Merging Rails and React props...")
  const mergedComponents = mergeComponentProps(components)
  console.log(`✅ Merged props for ${mergedComponents.length} components\n`)

  generateSnippets(mergedComponents)

  // Extract global props with Rails/React separation
  const globalProps = extractGlobalPropsFromTypeScript(PLAYBOOK_REPO_PATH)
  generateMetadata(mergedComponents, globalProps)

  console.log("\n✨ Sync complete!")
}

main()
