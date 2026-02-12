import * as vscode from "vscode"
import {
  loadMetadata,
  findComponentByRailsName,
  findComponentByReactName,
  ComponentMetadata,
  PropMetadata,
  loadFormBuilderMetadata,
  findFormBuilderField,
  FormBuilderMetadata,
  FormBuilderField,
  getPropValues
} from "./metadata"

const HARDCODED_GLOBAL_PROPS = new Set(["id", "key"])

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
    const formBuilderMetadata = loadFormBuilderMetadata(this.extensionPath)
    console.log(
      `[PlaybookDiagnostics] Loaded metadata with ${Object.keys(metadata.components || {}).length} components`
    )
    console.log(
      `[PlaybookDiagnostics] Loaded ${formBuilderMetadata.fields.length} form builder fields`
    )

    const text = document.getText()
    const lines = text.split("\n")
    console.log(`[PlaybookDiagnostics] Analyzing ${lines.length} lines of code`)


    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]

      this.validateRailsLine(line, lineIndex, document, metadata, diagnostics)

      this.validateReactLine(line, lineIndex, document, metadata, diagnostics)

      this.validateFormBuilderLine(line, lineIndex, document, formBuilderMetadata, metadata, diagnostics)
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
          const isValidProp = component.props[propName] || metadata.globalProps?.[propName] || HARDCODED_GLOBAL_PROPS.has(propName)

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

        if (!component.props[propName] && !metadata.globalProps?.[propName] && !HARDCODED_GLOBAL_PROPS.has(propName)) {
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
              diagnostics,
              document
            )
          }
        }
      }
    } else {
      console.log(`[VALIDATE] React: extracting component block from line ${startLineIndex} for ${component.react}`)
      const componentBlock = this.extractReactComponentBlock(document, startLineIndex, component.react)
      if (!componentBlock) {
        console.log(`[VALIDATE] React: No component block found`)
        return
      }

      const propRegex = /(\w+)=(?:["']([^"']+)["']|\{([^}]+)\})/g
      let match
      const blockLines = componentBlock.text.split('\n')

      for (let i = 0; i < blockLines.length; i++) {
        const line = blockLines[i]
        const actualLineIndex = startLineIndex + i

        propRegex.lastIndex = 0

        while ((match = propRegex.exec(line)) !== null) {
          const propName = match[1]
          const quotedValue = match[2]
          const braceValue = match[3]

          const propValue = quotedValue !== undefined
            ? `"${quotedValue}"`
            : braceValue !== undefined
              ? `{${braceValue}}`
              : ""

          const snakeCaseProp = propName.replace(/([A-Z])/g, "_$1").toLowerCase()

          if (!component.props[snakeCaseProp] && !metadata.globalProps?.[snakeCaseProp] && !HARDCODED_GLOBAL_PROPS.has(propName)) {
            const startIndex = i === 0 ? match.index + componentBlock.startChar : match.index
            const range = new vscode.Range(
              actualLineIndex,
              startIndex,
              actualLineIndex,
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
              const adjustedStartIndex = i === 0 ? match.index + componentBlock.startChar : match.index
              this.validatePropValue(
                propName,
                propValue || "",
                prop,
                match[0],
                adjustedStartIndex,
                actualLineIndex,
                diagnostics,
                document
              )
            }
          }
        }
      }
    }
  }

  private extractReactComponentBlock(
    document: vscode.TextDocument,
    startLineIndex: number,
    targetComponentName: string
  ): { text: string; startLine: number; startChar: number; componentName: string } | null {
    const startLine = document.lineAt(startLineIndex).text

    const componentRegex = new RegExp(`<(${targetComponentName})(?:\\s|>|\\/|$)`)
    const componentMatch = startLine.match(componentRegex)

    if (!componentMatch) {
      return null
    }

    const componentName = componentMatch[1]
    const componentStartIndex = startLine.indexOf(componentMatch[0])
    const lines: string[] = []
    let foundClosingBracket = false

    for (let i = startLineIndex; i < Math.min(startLineIndex + 50, document.lineCount); i++) {
      let line = document.lineAt(i).text

      if (i === startLineIndex) {
        line = line.substring(componentStartIndex)
      }

      const selfClosingIndex = line.indexOf('/>')
      if (selfClosingIndex !== -1) {
        const beforeSelfClosing = line.substring(0, selfClosingIndex)
        const nestedInLine = beforeSelfClosing.substring(componentMatch[0].length).match(/<([A-Z][a-zA-Z0-9]*)/)
        if (nestedInLine) {
          console.log(`[VALIDATE] React: Found nested component <${nestedInLine[1]}> before self-closing tag`)
          const nestedPos = beforeSelfClosing.indexOf(nestedInLine[0])
          lines.push(line.substring(0, nestedPos))
        } else {
          lines.push(line.substring(0, selfClosingIndex + 2))
        }
        foundClosingBracket = true
        break
      }

      const closingBracketIndex = line.indexOf('>')
      if (closingBracketIndex !== -1) {
        const beforeBracket = line.substring(0, closingBracketIndex)
        const searchStart = i === startLineIndex ? componentMatch[0].length : 0
        const nestedMatch = beforeBracket.substring(searchStart).match(/<([A-Z][a-zA-Z0-9]*)/)
        if (nestedMatch) {
          console.log(`[VALIDATE] React: Stopping before nested component <${nestedMatch[1]}> on line ${i}`)
          const nestedPos = beforeBracket.indexOf(nestedMatch[0], searchStart)
          if (nestedPos > 0) {
            lines.push(line.substring(0, nestedPos))
          }
          break
        }

        lines.push(line.substring(0, closingBracketIndex + 1))
        foundClosingBracket = true
        break
      }

      if (i > startLineIndex) {
        const nestedComponentMatch = line.match(/<([A-Z][a-zA-Z0-9]*)/)
        if (nestedComponentMatch) {
          console.log(`[VALIDATE] React: Stopping at nested component <${nestedComponentMatch[1]}> on line ${i}`)
          break
        }
      }

      lines.push(line)
    }

    if (lines.length === 0) {
      return null
    }

    return {
      text: lines.join('\n'),
      startLine: startLineIndex,
      startChar: componentStartIndex,
      componentName
    }
  }

  private validatePropValue(
    propName: string,
    propValue: string,
    prop: PropMetadata,
    fullMatch: string,
    startCharacter: number,
    lineIndex: number,
    diagnostics: vscode.Diagnostic[],
    document: vscode.TextDocument
  ): void {
    const validValues = getPropValues(prop, document.languageId)

    if (validValues && validValues.length > 0) {
      const cleanValue = propValue.replace(/["']/g, "").trim()

      const isQuotedString = propValue.startsWith('"') || propValue.startsWith("'")

      if (isQuotedString && cleanValue && !validValues.includes(cleanValue)) {
        const valueMatch = fullMatch.match(/("([^"]*)"|'([^']*)')/)
        const valueStartOffset = valueMatch ? fullMatch.indexOf(valueMatch[0]) : 0
        const valueLength = valueMatch ? valueMatch[0].length : propValue.length

        const range = new vscode.Range(
          lineIndex,
          startCharacter + valueStartOffset,
          lineIndex,
          startCharacter + valueStartOffset + valueLength
        )

        const validValuesStr = validValues.map((v) => `"${v}"`).join(", ")
        const diagnostic = new vscode.Diagnostic(
          range,
          `Invalid value "${cleanValue}" for prop "${propName}". Valid values: ${validValuesStr}`,
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
  ): { text: string; startLine: number; startChar: number; lines: string[] } | null {
    let propsStartLine = -1
    let propsStartChar = -1

    for (let i = startLineIndex; i < Math.min(startLineIndex + 10, document.lineCount); i++) {
      const line = document.lineAt(i).text

      if (i > startLineIndex && line.includes("pb_rails(")) {
        return null
      }

      const propsMatch = line.match(/props:\s*\{/)
      if (propsMatch) {
        const beforeProps = line.substring(0, propsMatch.index!)
        if (i > startLineIndex) {
          const otherMethodMatch = beforeProps.match(/\w+\(/)
          if (otherMethodMatch && !beforeProps.includes("pb_rails(")) {
            continue
          }
          const formBuilderMatch = beforeProps.match(/\w+\.\w+/)
          if (formBuilderMatch) {
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
              startChar: propsStartChar,
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

  private validateFormBuilderLine(
    line: string,
    lineIndex: number,
    document: vscode.TextDocument,
    formBuilderMetadata: FormBuilderMetadata,
    playbookMetadata: any,
    diagnostics: vscode.Diagnostic[]
  ): void {
    const formBuilderRegex = /(\w+)\.(\w+)\s*\(/g
    let match

    console.log(`[FormBuilder] Checking line ${lineIndex +1}: ${line.substring(0, 50)}`)

    while ((match = formBuilderRegex.exec(line)) !== null) {
      const variableName = match[1]
      const methodName = match[2]

      console.log(`[FormBuilder] Found method call: ${variableName}.${methodName}`)

      const formVariables = ["f", "form", "builder"]

      if (!formVariables.includes(variableName)) {
        console.log(`[FormBuilder] Skipping - not a form variable: ${variableName}`)
        continue
      }

      const field = findFormBuilderField(formBuilderMetadata, methodName)

      if (!field) {
        console.log(`[FormBuilder] Skipping - unknown form builder method: ${methodName}`)
        continue
      }

      console.log(
        `[PlaybookDiagnostics] Found form builder field: ${variableName}.${methodName} on line ${lineIndex + 1}`
      )

      this.validateFormBuilderProps(
        document,
        lineIndex,
        field,
        playbookMetadata,
        diagnostics
      )
    }
  }

  private validateFormBuilderProps(
    document: vscode.TextDocument,
    startLineIndex: number,
    field: FormBuilderField,
    metadata: any,
    diagnostics: vscode.Diagnostic[]
  ): void {
    const propsBlock = this.extractFormBuilderPropsBlock(document, startLineIndex)
    if (!propsBlock) {
      console.log(`[PlaybookDiagnostics] No props block found for form builder field: ${field.name}`)
      return
    }

    console.log(
      `[PlaybookDiagnostics] Validating form builder props for ${field.name}: ${propsBlock.text.substring(0, 50)}...`
    )

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

      if (parenDepth > 0 || braceDepth > 0) {
        continue
      }

      if (propName === "props") {
        continue
      }

      if (["do", "end", "if", "unless"].includes(propName)) {
        continue
      }

      if (fullValue === "{") {
        const isValidProp = field.props[propName] || metadata.globalProps?.[propName] || HARDCODED_GLOBAL_PROPS.has(propName)

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
            `Unknown prop "${propName}" for form builder field "${field.name}"`,
            vscode.DiagnosticSeverity.Warning
          )
          diagnostic.source = "Playbook"
          diagnostics.push(diagnostic)
        }

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

      if (!field.props[propName] && !metadata.globalProps?.[propName] && !HARDCODED_GLOBAL_PROPS.has(propName)) {
        const range = new vscode.Range(
          position.line,
          position.character,
          position.line,
          position.character + propName.length
        )

        const diagnostic = new vscode.Diagnostic(
          range,
          `Unknown prop "${propName}" for form builder field "${field.name}"`,
          vscode.DiagnosticSeverity.Warning
        )
        diagnostic.source = "Playbook"
        diagnostics.push(diagnostic)
      } else {
        const prop = field.props[propName] || metadata.globalProps?.[propName]
        if (prop) {
          this.validatePropValue(
            propName,
            propValue,
            prop,
            match[0],
            position.character,
            position.line,
            diagnostics,
            document
          )
        }
      }
    }
  }

  private extractFormBuilderPropsBlock(
    document: vscode.TextDocument,
    startLineIndex: number
  ): { text: string; startLine: number; startChar: number; lines: string[] } | null {
    let propsStartLine = -1
    let propsStartChar = -1

    for (let i = startLineIndex; i < Math.min(startLineIndex + 10, document.lineCount); i++) {
      const line = document.lineAt(i).text

      const propsMatch = line.match(/props:\s*\{/)
      if (propsMatch) {
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
              startChar: propsStartChar,
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
    propsBlock: { text: string; startLine: number; startChar: number; lines: string[] },
    matchIndex: number
  ): { line: number; character: number } {
    let currentIndex = 0
    const currentLine = propsBlock.startLine

    for (let i = 0; i < propsBlock.lines.length; i++) {
      const lineLength = propsBlock.lines[i].length
      const lineEndIndex = currentIndex + lineLength

      if (matchIndex >= currentIndex && matchIndex < lineEndIndex) {
        const character = matchIndex - currentIndex
        const adjustedCharacter = (i === 0) ? character + propsBlock.startChar : character
        return { line: currentLine + i, character: adjustedCharacter }
      }

      currentIndex = lineEndIndex + 1
    }

    return { line: propsBlock.startLine, character: propsBlock.startChar }
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
