import * as vscode from "vscode"
import { loadMetadata, ComponentMetadata } from "./metadata"
import { findComponentContext } from "./parser"

export class PlaybookCompletionProvider implements vscode.CompletionItemProvider {
  private extensionPath: string

  constructor(extensionPath: string) {
    this.extensionPath = extensionPath
  }

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    const metadata = loadMetadata(this.extensionPath)
    const line = document.lineAt(position.line).text
    const linePrefix = line.substring(0, position.character)

    // Check what kind of completion we need
    const completionType = this.detectCompletionType(linePrefix, document, position)

    switch (completionType) {
      case "rails-component":
        return this.provideRailsComponentCompletions(metadata)
      case "react-component":
        return this.provideReactComponentCompletions(metadata)
      case "rails-prop-name":
        return this.provideRailsPropNameCompletions(document, position, metadata)
      case "react-prop-name":
        return this.provideReactPropNameCompletions(document, position, metadata)
      case "rails-prop-value":
        return this.providePropValueCompletions(document, position, metadata, "rails")
      case "react-prop-value":
        return this.providePropValueCompletions(document, position, metadata, "react")
      default:
        return []
    }
  }

  /**
   * Detect what type of completion is needed based on context
   */
  private detectCompletionType(
    linePrefix: string,
    document: vscode.TextDocument,
    position: vscode.Position
  ): string {
    // Rails component name: pb_rails("...")
    if (linePrefix.match(/pb_rails\(\s*["']$/)) {
      return "rails-component"
    }

    // Check if we're inside a multi-line props block
    const propsContext = this.findPropsContext(document, position)

    // Rails prop name: props: { ... }
    // Check current line first
    if (linePrefix.match(/props:\s*\{[^}]*$/) || propsContext) {
      // Check if we're typing a prop value (after colon, with or without quotes)
      // Matches: "variant: ", "variant: \"", "variant: \"primary", etc.
      const propValueMatch = linePrefix.match(/(\w+):\s*["']?([^",}]*)$/)
      if (propValueMatch) {
        return "rails-prop-value"
      }
      // Otherwise we're typing a prop name
      return "rails-prop-name"
    }

    // React component: < at start of tag
    if (linePrefix.match(/<[A-Z]?\w*$/)) {
      return "react-component"
    }

    // React prop name: <Component ...
    const reactTagMatch = linePrefix.match(/<([A-Z][a-zA-Z0-9]*)\s+/)
    if (reactTagMatch) {
      const afterTag = linePrefix.substring(
        linePrefix.indexOf(reactTagMatch[1]) + reactTagMatch[1].length
      )

      // Check if we're typing a value
      if (afterTag.match(/\w+\s*=\s*["'{]?$/)) {
        return "react-prop-value"
      }

      // Otherwise typing prop name
      return "react-prop-name"
    }

    return "none"
  }

  /**
   * Find if the current position is inside a Rails props block
   * by searching backwards for the opening props: {
   */
  private findPropsContext(document: vscode.TextDocument, position: vscode.Position): boolean {
    let openBraces = 0
    let foundPropsStart = false

    // Search backwards from current line
    for (let lineNum = position.line; lineNum >= Math.max(0, position.line - 20); lineNum--) {
      const line = document.lineAt(lineNum).text
      const searchText = lineNum === position.line ? line.substring(0, position.character) : line

      // Count braces on this line (from right to left for current line, all for previous lines)
      for (let i = searchText.length - 1; i >= 0; i--) {
        const char = searchText[i]
        if (char === "}") {
          openBraces++
        } else if (char === "{") {
          openBraces--

          // Check if this is the props opening brace
          if (openBraces < 0) {
            // Found an unmatched opening brace, check if it's props:
            const beforeBrace = searchText.substring(0, i).trim()
            if (beforeBrace.endsWith("props:")) {
              foundPropsStart = true
              break
            }
            // If not props:, we're not in props context
            return false
          }
        }
      }

      if (foundPropsStart) {
        break
      }

      // If we found a pb_rails without finding props context, stop
      if (line.includes("pb_rails") && !foundPropsStart) {
        return false
      }
    }

    return foundPropsStart
  }

  /**
   * Provide Rails component name completions
   */
  private provideRailsComponentCompletions(metadata: any): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = []

    for (const [componentName, component] of Object.entries<ComponentMetadata>(
      metadata.components
    )) {
      const item = new vscode.CompletionItem(component.rails, vscode.CompletionItemKind.Class)
      item.detail = `Playbook ${componentName}`
      item.documentation = new vscode.MarkdownString(component.description)

      // Insert just the component name (the quotes and pb_rails are already there)
      item.insertText = component.rails

      // Add snippet for props if component has them
      if (Object.keys(component.props).length > 0) {
        const propNames = Object.keys(component.props).slice(0, 3).join(", ")
        item.documentation.appendMarkdown(`\n\nProps: ${propNames}...`)
      }

      items.push(item)
    }

    return items.sort((a, b) => a.label.toString().localeCompare(b.label.toString()))
  }

  /**
   * Provide React component name completions
   */
  private provideReactComponentCompletions(metadata: any): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = []

    for (const [componentName, component] of Object.entries<ComponentMetadata>(
      metadata.components
    )) {
      const item = new vscode.CompletionItem(componentName, vscode.CompletionItemKind.Class)
      item.detail = `Playbook ${componentName}`
      item.documentation = new vscode.MarkdownString(component.description)

      // Create snippet with common props
      const commonProps = Object.entries(component.props).slice(0, 2)
      if (commonProps.length > 0) {
        let snippet = componentName
        commonProps.forEach(([propName, prop], index) => {
          const camelProp = propName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
          snippet += `\n\t${camelProp}={$${index + 1}}`
        })

        if (component.hasChildren) {
          snippet += "\n>\n\t$0\n</" + componentName + ">"
        } else {
          snippet += "\n\t$0\n/>"
        }

        item.insertText = new vscode.SnippetString(snippet)
        item.kind = vscode.CompletionItemKind.Snippet
      }

      items.push(item)
    }

    return items.sort((a, b) => a.label.toString().localeCompare(b.label.toString()))
  }

  /**
   * Provide Rails prop name completions
   */
  private provideRailsPropNameCompletions(
    document: vscode.TextDocument,
    position: vscode.Position,
    metadata: any
  ): vscode.CompletionItem[] {
    const componentContext = findComponentContext(document, position)
    if (!componentContext || componentContext.type !== "rails") {
      return []
    }

    const items: vscode.CompletionItem[] = []

    // Find the component
    let component: ComponentMetadata | undefined
    for (const [componentName, comp] of Object.entries<ComponentMetadata>(metadata.components)) {
      if (comp.rails === componentContext.componentName) {
        component = comp
        break
      }
    }

    if (!component) {
      return []
    }

    // Add component-specific props
    for (const [propName, prop] of Object.entries(component.props)) {
      const item = new vscode.CompletionItem(propName, vscode.CompletionItemKind.Property)
      item.detail = `${prop.type}${prop.required ? " (required)" : ""}`

      let doc = `Type: \`${prop.type}\``
      if (prop.values && prop.values.length > 0) {
        doc += `\nValues: ${prop.values.map((v) => `\`${v}\``).join(", ")}`
      }
      if (prop.default !== undefined) {
        doc += `\nDefault: \`${prop.default}\``
      }

      item.documentation = new vscode.MarkdownString(doc)

      // Add snippet with value placeholder
      if (prop.values && prop.values.length > 0) {
        const choices = prop.values.join(",")
        item.insertText = new vscode.SnippetString(`${propName}: "\${1|${choices}|}"`)
      } else if (prop.type === "boolean") {
        item.insertText = new vscode.SnippetString(`${propName}: \${1|true,false|}`)
      } else {
        item.insertText = new vscode.SnippetString(`${propName}: "\${1}"`)
      }

      item.kind = vscode.CompletionItemKind.Snippet
      items.push(item)
    }

    // Add global props
    if (metadata.globalProps) {
      for (const [propName, prop] of Object.entries(metadata.globalProps)) {
        const item = new vscode.CompletionItem(propName, vscode.CompletionItemKind.Property)
        item.detail = `${(prop as any).type} (global)`

        let doc = `Type: \`${(prop as any).type}\` (global prop)`
        if ((prop as any).values && (prop as any).values.length > 0) {
          doc += `\nValues: ${(prop as any).values.map((v: string) => `\`${v}\``).join(", ")}`
        }

        item.documentation = new vscode.MarkdownString(doc)

        // Add snippet with value placeholder
        if ((prop as any).values && (prop as any).values.length > 0) {
          const choices = (prop as any).values.join(",")
          item.insertText = new vscode.SnippetString(`${propName}: "\${1|${choices}|}"`)
        } else if ((prop as any).type === "boolean") {
          item.insertText = new vscode.SnippetString(`${propName}: \${1|true,false|}`)
        } else {
          item.insertText = new vscode.SnippetString(`${propName}: "\${1}"`)
        }

        item.kind = vscode.CompletionItemKind.Snippet
        // Sort global props after component-specific props
        item.sortText = "z" + propName
        items.push(item)
      }
    }

    return items
  }

  /**
   * Provide React prop name completions
   */
  private provideReactPropNameCompletions(
    document: vscode.TextDocument,
    position: vscode.Position,
    metadata: any
  ): vscode.CompletionItem[] {
    const componentContext = findComponentContext(document, position)
    if (!componentContext || componentContext.type !== "react") {
      return []
    }

    const component = metadata.components[componentContext.componentName]
    if (!component) {
      return []
    }

    const items: vscode.CompletionItem[] = []

    // Add component-specific props
    for (const [propName, prop] of Object.entries(component.props)) {
      const camelProp = propName.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
      const item = new vscode.CompletionItem(camelProp, vscode.CompletionItemKind.Property)
      item.detail = `${(prop as any).type}${(prop as any).required ? " (required)" : ""}`

      let doc = `Type: \`${(prop as any).type}\``
      if ((prop as any).values && (prop as any).values.length > 0) {
        doc += `\nValues: ${(prop as any).values.map((v: string) => `\`${v}\``).join(", ")}`
      }
      if ((prop as any).default !== undefined) {
        doc += `\nDefault: \`${(prop as any).default}\``
      }

      item.documentation = new vscode.MarkdownString(doc)

      // Add snippet with value placeholder
      if ((prop as any).values && (prop as any).values.length > 0) {
        const choices = (prop as any).values.map((v: string) => `"${v}"`).join(",")
        item.insertText = new vscode.SnippetString(`${camelProp}={\${1|${choices}|}}`)
      } else if ((prop as any).type === "boolean") {
        item.insertText = new vscode.SnippetString(`${camelProp}={$\{1|true,false|}}`)
      } else {
        item.insertText = new vscode.SnippetString(`${camelProp}="\${1}"`)
      }

      item.kind = vscode.CompletionItemKind.Snippet
      items.push(item)
    }

    // Add global props (converted to camelCase for React)
    if (metadata.globalProps) {
      for (const [propName, prop] of Object.entries(metadata.globalProps)) {
        const camelProp = propName.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
        const item = new vscode.CompletionItem(camelProp, vscode.CompletionItemKind.Property)
        item.detail = `${(prop as any).type} (global)`

        let doc = `Type: \`${(prop as any).type}\` (global prop)`
        if ((prop as any).values && (prop as any).values.length > 0) {
          doc += `\nValues: ${(prop as any).values.map((v: string) => `\`${v}\``).join(", ")}`
        }

        item.documentation = new vscode.MarkdownString(doc)

        // Add snippet with value placeholder
        if ((prop as any).values && (prop as any).values.length > 0) {
          const choices = (prop as any).values.map((v: string) => `"${v}"`).join(",")
          item.insertText = new vscode.SnippetString(`${camelProp}={\${1|${choices}|}}`)
        } else if ((prop as any).type === "boolean") {
          item.insertText = new vscode.SnippetString(`${camelProp}={$\{1|true,false|}}`)
        } else {
          item.insertText = new vscode.SnippetString(`${camelProp}="\${1}"`)
        }

        item.kind = vscode.CompletionItemKind.Snippet
        // Sort global props after component-specific props
        item.sortText = "z" + camelProp
        items.push(item)
      }
    }

    return items
  }

  /**
   * Provide prop value completions for enums
   */
  private providePropValueCompletions(
    document: vscode.TextDocument,
    position: vscode.Position,
    metadata: any,
    type: "rails" | "react"
  ): vscode.CompletionItem[] {
    const componentContext = findComponentContext(document, position)
    if (!componentContext) {
      return []
    }

    const component =
      type === "rails"
        ? Object.values<ComponentMetadata>(metadata.components).find(
            (c) => c.rails === componentContext.componentName
          )
        : metadata.components[componentContext.componentName]

    if (!component) {
      return []
    }

    // Find which prop we're completing
    const line = document.lineAt(position.line).text
    const beforeCursor = line.substring(0, position.character)

    let propName: string | null = null
    let insideString = false

    if (type === "rails") {
      // Match prop name even if we're inside the string value
      // Matches: "variant: ", "variant: \"", "variant: \"pri", etc.
      const match = beforeCursor.match(/(\w+):\s*["']?([^",}]*)$/)
      if (match) {
        propName = match[1]
        // Check if we're inside a quote
        const afterColon = beforeCursor.substring(
          beforeCursor.lastIndexOf(propName) + propName.length + 1
        )
        insideString = /["']/.test(afterColon)
      }
    } else {
      const match = beforeCursor.match(/(\w+)\s*=\s*["'{]?([^"'}]*)$/)
      if (match) {
        // Convert camelCase to snake_case
        propName = match[1].replace(/([A-Z])/g, "_$1").toLowerCase()
        const afterEquals = beforeCursor.substring(beforeCursor.lastIndexOf("=") + 1)
        insideString = /["']/.test(afterEquals)
      }
    }

    if (!propName || (!component.props[propName] && !metadata.globalProps?.[propName])) {
      return []
    }

    // Check component props first, then global props
    const prop = component.props[propName] || metadata.globalProps?.[propName]
    if (!prop) {
      return []
    }

    const items: vscode.CompletionItem[] = []

    // Provide enum value completions
    if (prop.values && prop.values.length > 0) {
      for (const value of prop.values) {
        const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.EnumMember)
        item.detail = `Valid value for ${propName}`

        // If we're inside a string, just insert the value
        // If not, insert with quotes
        if (insideString) {
          item.insertText = value
        } else {
          item.insertText = `"${value}"`
        }

        if (value === prop.default?.replace(/["']/g, "")) {
          item.detail += " (default)"
          // Sort default value first
          item.sortText = "0" + value
        }

        items.push(item)
      }
    }

    // Provide boolean completions
    if (prop.type === "boolean") {
      const trueItem = new vscode.CompletionItem("true", vscode.CompletionItemKind.Value)
      trueItem.insertText = "true"
      const falseItem = new vscode.CompletionItem("false", vscode.CompletionItemKind.Value)
      falseItem.insertText = "false"

      if (prop.default === "true") {
        trueItem.detail = "(default)"
        trueItem.sortText = "0true"
      } else if (prop.default === "false") {
        falseItem.detail = "(default)"
        falseItem.sortText = "0false"
      }

      items.push(trueItem, falseItem)
    }

    return items
  }
}
