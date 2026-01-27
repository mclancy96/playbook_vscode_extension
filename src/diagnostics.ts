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
    console.log(
      `[PlaybookDiagnostics] Created diagnostic collection with extension path: ${extensionPath}`
    )
  }

  public updateDiagnostics(document: vscode.TextDocument): void {
    console.log(
      `[PlaybookDiagnostics] updateDiagnostics called for: ${document.languageId} - ${document.uri.toString()}`
    )

    if (!this.shouldValidate(document)) {
      console.log(
        `[PlaybookDiagnostics] Skipping validation - language not supported: ${document.languageId}`
      )
      return
    }

    const diagnostics: vscode.Diagnostic[] = []
    const metadata = loadMetadata(this.extensionPath)
    console.log(
      `[PlaybookDiagnostics] Loaded metadata with ${Object.keys(metadata.components || {}).length} components`
    )

    const text = document.getText()
    const lines = text.split("\n")
    console.log(`[PlaybookDiagnostics] Analyzing ${lines.length} lines of code`)

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]

      this.validateRailsLine(line, lineIndex, document, metadata, diagnostics)

      this.validateReactLine(line, lineIndex, document, metadata, diagnostics)
    }

    this.diagnosticCollection.set(document.uri, diagnostics)
    console.log(
      `[PlaybookDiagnostics] Found ${diagnostics.length} diagnostic(s) for ${document.uri.toString()}`
    )
    if (diagnostics.length > 0) {
      diagnostics.forEach((d, i) => {
        console.log(
          `[PlaybookDiagnostics]   ${i + 1}. ${d.severity === vscode.DiagnosticSeverity.Warning ? "WARNING" : "ERROR"}: ${d.message} at line ${d.range.start.line + 1}`
        )
      })
    }
  }

  private shouldValidate(document: vscode.TextDocument): boolean {
    const validLanguages = [
      "ruby",
      "erb",
      "html.erb",
      "html",
      "javascript",
      "javascriptreact",
      "typescript",
      "typescriptreact"
    ]
    return validLanguages.includes(document.languageId)
  }

  private validateRailsLine(
    line: string,
    lineIndex: number,
    document: vscode.TextDocument,
    metadata: any,
    diagnostics: vscode.Diagnostic[]
  ): void {
    const componentRegex = /pb_rails\(\s*["']([^"']+)["']/g
    let match

    while ((match = componentRegex.exec(line)) !== null) {
      const componentName = match[1]
      const component = findComponentByRailsName(metadata, componentName)

      if (!component) {
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
        this.validateProps(document, lineIndex, component, metadata, diagnostics, "rails")
      }
    }
  }

  private validateReactLine(
    line: string,
    lineIndex: number,
    document: vscode.TextDocument,
    metadata: any,
    diagnostics: vscode.Diagnostic[]
  ): void {
    const componentRegex = /<([A-Z][a-zA-Z0-9]*)/g
    let match

    while ((match = componentRegex.exec(line)) !== null) {
      const componentName = match[1]
      const component = findComponentByReactName(metadata, componentName)

      if (component) {
        this.validateProps(document, lineIndex, component, metadata, diagnostics, "react")
      }
    }
  }

  private validateProps(
    document: vscode.TextDocument,
    startLineIndex: number,
    component: ComponentMetadata,
    metadata: any,
    diagnostics: vscode.Diagnostic[],
    type: "rails" | "react"
  ): void {
    if (type === "rails") {
      const propsBlock = this.extractPropsBlock(document, startLineIndex)
      if (!propsBlock) {
        return
      }

      const propRegex = /(\w+):\s*("([^"]*)"|'([^']*)'|([^,}\s]+)|\{)/g
      let match
      let parenDepth = 0
      let braceDepth = 0
      let lastIndex = 0

      while (
        (match = propRegex.exec(propRegex.lastIndex > 0 ? propsBlock.text : propsBlock.text)) !==
        null
      ) {
        const betweenText = propsBlock.text.substring(lastIndex, match.index)
        for (const char of betweenText) {
          if (char === "(") {
            parenDepth++
          }
          if (char === ")") {
            parenDepth--
          }
          if (char === "{") {
            braceDepth++
          }
          if (char === "}") {
            braceDepth--
          }
        }
        lastIndex = match.index

        const propName = match[1]
        const fullValue = match[2]
        const doubleQuotedValue = match[3]
        const singleQuotedValue = match[4]
        const unquotedValue = match[5]

        if (parenDepth > 0) {
          continue
        }

        if (braceDepth > 0) {
          continue
        }

        if (propName === "props") {
          continue
        }

        if (["do", "end", "if", "unless"].includes(propName)) {
          continue
        }

        if (fullValue === "{") {
          // This prop has a nested object value - validate the prop name first
          // before skipping the nested contents
          const isValidProp = component.props[propName] || metadata.globalProps?.[propName]

          if (!isValidProp) {
            const position = this.getPositionInPropsBlock(propsBlock, match.index)
            const range = new vscode.Range(
              position.line,
              position.character,
              position.line,
              position.character + propName.length
            )

            const diagnostic = new vscode.Diagnostic(
              range,
              `Unknown prop "${propName}" for component "${component.rails}"`,
              vscode.DiagnosticSeverity.Warning
            )
            diagnostic.source = "Playbook"
            diagnostics.push(diagnostic)
          }

          // Now skip the nested object contents
          let nestedBraceCount = 1
          let searchIndex = propRegex.lastIndex

          while (nestedBraceCount > 0 && searchIndex < propsBlock.text.length) {
            const char = propsBlock.text[searchIndex]
            if (char === "{") {
              nestedBraceCount++
            }
            if (char === "}") {
              nestedBraceCount--
            }
            searchIndex++
          }

          propRegex.lastIndex = searchIndex
          continue
        }

        const propValue =
          doubleQuotedValue !== undefined
            ? `"${doubleQuotedValue}"`
            : singleQuotedValue !== undefined
              ? `'${singleQuotedValue}'`
              : unquotedValue

        const position = this.getPositionInPropsBlock(propsBlock, match.index)

        if (!component.props[propName] && !metadata.globalProps?.[propName]) {
          const range = new vscode.Range(
            position.line,
            position.character,
            position.line,
            position.character + propName.length
          )

          const diagnostic = new vscode.Diagnostic(
            range,
            `Unknown prop "${propName}" for component "${component.rails}"`,
            vscode.DiagnosticSeverity.Warning
          )
          diagnostic.source = "Playbook"
          diagnostics.push(diagnostic)
        } else {
          const prop = component.props[propName] || metadata.globalProps?.[propName]
          if (prop) {
            this.validatePropValue(
              propName,
              propValue,
              prop,
              match[0],
              position.character,
              position.line,
              diagnostics
            )
          }
        }
      }
    } else {
      const line = document.lineAt(startLineIndex).text
      const propRegex = /(\w+)=(?:["']([^"']+)["']|\{([^}]+)\})/g
      let match

      while ((match = propRegex.exec(line)) !== null) {
        const propName = match[1]
        const propValue = (match[2] || match[3])?.trim()

        const snakeCaseProp = propName.replace(/([A-Z])/g, "_$1").toLowerCase()

        if (!component.props[snakeCaseProp] && !metadata.globalProps?.[snakeCaseProp]) {
          const startIndex = match.index
          const range = new vscode.Range(
            startLineIndex,
            startIndex,
            startLineIndex,
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
          const prop = component.props[snakeCaseProp] || metadata.globalProps?.[snakeCaseProp]
          if (prop) {
            this.validatePropValue(
              propName,
              propValue || "",
              prop,
              match[0],
              match.index,
              startLineIndex,
              diagnostics
            )
          }
        }
      }
    }
  }

  private validatePropValue(
    propName: string,
    propValue: string,
    prop: PropMetadata,
    fullMatch: string,
    startCharacter: number,
    lineIndex: number,
    diagnostics: vscode.Diagnostic[]
  ): void {
    if (prop.values && prop.values.length > 0) {
      const cleanValue = propValue.replace(/["']/g, "").trim()

      const isQuotedString = propValue.startsWith('"') || propValue.startsWith("'")

      if (isQuotedString && cleanValue && !prop.values.includes(cleanValue)) {
        const valueMatch = fullMatch.match(/("([^"]*)"|'([^']*)')/)
        const valueStartOffset = valueMatch ? fullMatch.indexOf(valueMatch[0]) : 0
        const valueLength = valueMatch ? valueMatch[0].length : propValue.length

        const range = new vscode.Range(
          lineIndex,
          startCharacter + valueStartOffset,
          lineIndex,
          startCharacter + valueStartOffset + valueLength
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

  private extractPropsBlock(
    document: vscode.TextDocument,
    startLineIndex: number
  ): { text: string; startLine: number; lines: string[] } | null {
    let propsStartLine = -1
    let propsStartChar = -1

    for (let i = startLineIndex; i < Math.min(startLineIndex + 10, document.lineCount); i++) {
      const line = document.lineAt(i).text

      if (i > startLineIndex && line.includes("pb_rails(")) {
        return null
      }

      const propsMatch = line.match(/props:\s*\{/)
      if (propsMatch) {
        // Check if this props block belongs to a different method call (like render_app)
        const beforeProps = line.substring(0, propsMatch.index!)
        // If we're on a line AFTER the pb_rails line and there's another method call, skip it
        if (i > startLineIndex) {
          // Check if there's a method call that's NOT pb_rails before the props
          const otherMethodMatch = beforeProps.match(/\w+\(/)
          if (otherMethodMatch && !beforeProps.includes("pb_rails(")) {
            continue
          }
        }
        propsStartLine = i
        propsStartChar = propsMatch.index! + propsMatch[0].length
        break
      }
    }

    if (propsStartLine === -1) {
      return null
    }

    let braceCount = 1
    let endLine = propsStartLine
    let endChar = propsStartChar
    const lines: string[] = []

    for (let i = propsStartLine; i < Math.min(propsStartLine + 50, document.lineCount); i++) {
      const line = document.lineAt(i).text
      const startChar = i === propsStartLine ? propsStartChar : 0

      for (let j = startChar; j < line.length; j++) {
        if (line[j] === "{") {
          braceCount++
        }
        if (line[j] === "}") {
          braceCount--
          if (braceCount === 0) {
            endLine = i
            endChar = j
            if (i === propsStartLine) {
              lines.push(line.substring(propsStartChar, endChar))
            } else {
              lines.push(line.substring(0, endChar))
            }
            return {
              text: lines.join("\n"),
              startLine: propsStartLine,
              lines: lines
            }
          }
        }
      }

      if (i === propsStartLine) {
        lines.push(line.substring(propsStartChar))
      } else {
        lines.push(line)
      }
    }

    return null
  }

  private getPositionInPropsBlock(
    propsBlock: { text: string; startLine: number; lines: string[] },
    matchIndex: number
  ): { line: number; character: number } {
    let currentIndex = 0
    const currentLine = propsBlock.startLine

    for (let i = 0; i < propsBlock.lines.length; i++) {
      const lineLength = propsBlock.lines[i].length
      const lineEndIndex = currentIndex + lineLength

      if (matchIndex >= currentIndex && matchIndex < lineEndIndex) {
        const character = matchIndex - currentIndex
        return { line: currentLine + i, character }
      }

      currentIndex = lineEndIndex + 1
    }

    return { line: propsBlock.startLine, character: 0 }
  }

  public clear(): void {
    this.diagnosticCollection.clear()
  }

  public dispose(): void {
    this.diagnosticCollection.dispose()
  }

  public getDiagnostics(uri: vscode.Uri): readonly vscode.Diagnostic[] {
    return this.diagnosticCollection.get(uri) || []
  }
}
