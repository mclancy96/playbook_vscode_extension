import * as vscode from "vscode"
import {
  loadMetadata,
  findComponentByRailsName,
  findComponentByReactName,
  ComponentMetadata,
  PropMetadata
} from "./metadata"

export class PlaybookDiagnostics {
  private diagnosticCollection: vscode.DiagnosticCollection
  private extensionPath: string

  constructor(extensionPath: string) {
    this.extensionPath = extensionPath
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection("playbook")
  }

  /**
   * Update diagnostics for a document
   */
  public updateDiagnostics(document: vscode.TextDocument): void {
    if (!this.shouldValidate(document)) {
      return
    }

    const diagnostics: vscode.Diagnostic[] = []
    const metadata = loadMetadata(this.extensionPath)

    const text = document.getText()
    const lines = text.split("\n")

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]

      // Validate Rails components
      this.validateRailsLine(line, lineIndex, document, metadata, diagnostics)

      // Validate React components
      this.validateReactLine(line, lineIndex, document, metadata, diagnostics)
    }

    this.diagnosticCollection.set(document.uri, diagnostics)
  }

  /**
   * Check if document should be validated
   */
  private shouldValidate(document: vscode.TextDocument): boolean {
    const validLanguages = [
      "ruby",
      "erb",
      "javascript",
      "javascriptreact",
      "typescript",
      "typescriptreact"
    ]
    return validLanguages.includes(document.languageId)
  }

  /**
   * Validate Rails/ERB pb_rails call
   */
  private validateRailsLine(
    line: string,
    lineIndex: number,
    document: vscode.TextDocument,
    metadata: any,
    diagnostics: vscode.Diagnostic[]
  ): void {
    // Match pb_rails("component", props: { ... })
    const componentRegex = /pb_rails\(\s*["']([^"']+)["']/g
    let match

    while ((match = componentRegex.exec(line)) !== null) {
      const componentName = match[1]
      const component = findComponentByRailsName(metadata, componentName)

      if (!component) {
        // Unknown component
        const startIndex = match.index + match[0].indexOf(componentName)
        const range = new vscode.Range(
          lineIndex,
          startIndex,
          lineIndex,
          startIndex + componentName.length
        )

        const diagnostic = new vscode.Diagnostic(
          range,
          `Unknown Playbook component: "${componentName}"`,
          vscode.DiagnosticSeverity.Warning
        )
        diagnostic.source = "Playbook"
        diagnostics.push(diagnostic)
      } else {
        // Validate props
        this.validateProps(line, lineIndex, component, metadata, diagnostics, "rails")
      }
    }
  }

  /**
   * Validate React component
   */
  private validateReactLine(
    line: string,
    lineIndex: number,
    document: vscode.TextDocument,
    metadata: any,
    diagnostics: vscode.Diagnostic[]
  ): void {
    // Match <ComponentName ...
    const componentRegex = /<([A-Z][a-zA-Z0-9]*)/g
    let match

    while ((match = componentRegex.exec(line)) !== null) {
      const componentName = match[1]
      const component = findComponentByReactName(metadata, componentName)

      // Only validate if it's a known Playbook component
      if (component) {
        this.validateProps(line, lineIndex, component, metadata, diagnostics, "react")
      }
    }
  }

  /**
   * Validate props in a line
   */
  private validateProps(
    line: string,
    lineIndex: number,
    component: ComponentMetadata,
    metadata: any,
    diagnostics: vscode.Diagnostic[],
    type: "rails" | "react"
  ): void {
    if (type === "rails") {
      // Match prop: value patterns
      const propRegex = /(\w+):\s*["']?([^"',}]+)["']?/g
      let match

      while ((match = propRegex.exec(line)) !== null) {
        const propName = match[1]
        const propValue = match[2].trim()

        // Skip if this is a Ruby keyword (props, do, end, etc.)
        if (["props", "do", "end", "if", "unless"].includes(propName)) {
          continue
        }

        // Check if prop exists in component or global props
        if (!component.props[propName] && !metadata.globalProps?.[propName]) {
          const startIndex = match.index
          const range = new vscode.Range(
            lineIndex,
            startIndex,
            lineIndex,
            startIndex + propName.length
          )

          const diagnostic = new vscode.Diagnostic(
            range,
            `Unknown prop "${propName}" for component "${component.rails}"`,
            vscode.DiagnosticSeverity.Warning
          )
          diagnostic.source = "Playbook"
          diagnostics.push(diagnostic)
        } else {
          // Validate enum values (check both component props and global props)
          const prop = component.props[propName] || metadata.globalProps?.[propName]
          if (prop) {
            this.validatePropValue(propName, propValue, prop, match.index, lineIndex, diagnostics)
          }
        }
      }
    } else {
      // React: Match prop="value" or prop={value}
      const propRegex = /(\w+)=(?:["']([^"']+)["']|\{([^}]+)\})/g
      let match

      while ((match = propRegex.exec(line)) !== null) {
        const propName = match[1]
        const propValue = (match[2] || match[3])?.trim()

        // Convert camelCase to snake_case
        const snakeCaseProp = propName.replace(/([A-Z])/g, "_$1").toLowerCase()

        // Check if prop exists in component or global props
        if (!component.props[snakeCaseProp] && !metadata.globalProps?.[snakeCaseProp]) {
          const startIndex = match.index
          const range = new vscode.Range(
            lineIndex,
            startIndex,
            lineIndex,
            startIndex + propName.length
          )

          const diagnostic = new vscode.Diagnostic(
            range,
            `Unknown prop "${propName}" for component "${component.react}"`,
            vscode.DiagnosticSeverity.Warning
          )
          diagnostic.source = "Playbook"
          diagnostics.push(diagnostic)
        } else {
          // Validate enum values (check both component props and global props)
          const prop = component.props[snakeCaseProp] || metadata.globalProps?.[snakeCaseProp]
          if (prop) {
            this.validatePropValue(
              propName,
              propValue || "",
              prop,
              match.index,
              lineIndex,
              diagnostics
            )
          }
        }
      }
    }
  }

  /**
   * Validate prop value against schema
   */
  private validatePropValue(
    propName: string,
    propValue: string,
    prop: PropMetadata,
    startIndex: number,
    lineIndex: number,
    diagnostics: vscode.Diagnostic[]
  ): void {
    // Validate enum values
    if (prop.values && prop.values.length > 0) {
      const cleanValue = propValue.replace(/["']/g, "").trim()

      // Only validate if the original value was quoted (string literal)
      // If it's not quoted, it's likely a variable or method call and should be allowed
      const isQuotedString = propValue.includes('"') || propValue.includes("'")

      if (isQuotedString && cleanValue && !prop.values.includes(cleanValue)) {
        const range = new vscode.Range(
          lineIndex,
          startIndex,
          lineIndex,
          startIndex + propName.length + propValue.length + 5
        )

        const validValues = prop.values.map((v) => `"${v}"`).join(", ")
        const diagnostic = new vscode.Diagnostic(
          range,
          `Invalid value "${cleanValue}" for prop "${propName}". Valid values: ${validValues}`,
          vscode.DiagnosticSeverity.Warning
        )
        diagnostic.source = "Playbook"
        diagnostics.push(diagnostic)
      }
    }
  }

  /**
   * Clear diagnostics
   */
  public clear(): void {
    this.diagnosticCollection.clear()
  }

  /**
   * Dispose diagnostics
   */
  public dispose(): void {
    this.diagnosticCollection.dispose()
  }
}
