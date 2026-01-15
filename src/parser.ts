import * as vscode from "vscode"

export interface ComponentUsage {
  componentName: string
  range: vscode.Range
  type: "rails" | "react"
}

export interface PropUsage {
  propName: string
  range: vscode.Range
  value?: string
  valueRange?: vscode.Range
}

export function parseRailsComponent(
  document: vscode.TextDocument,
  position: vscode.Position
): ComponentUsage | null {
  const line = document.lineAt(position.line).text
  const lineRange = document.lineAt(position.line).range

  const regex = /pb_rails\(\s*["']([^"']+)["']/g
  let match

  while ((match = regex.exec(line)) !== null) {
    const componentName = match[1]
    const startIndex = match.index + match[0].indexOf(componentName)
    const endIndex = startIndex + componentName.length

    const startPos = new vscode.Position(position.line, startIndex)
    const endPos = new vscode.Position(position.line, endIndex)
    const range = new vscode.Range(startPos, endPos)

    if (position.character >= startIndex && position.character <= endIndex) {
      return {
        componentName,
        range,
        type: "rails"
      }
    }
  }

  return null
}

export function parseReactComponent(
  document: vscode.TextDocument,
  position: vscode.Position
): ComponentUsage | null {
  const line = document.lineAt(position.line).text

  const regex = /<\/?([A-Z][a-zA-Z0-9]*)/g
  let match

  while ((match = regex.exec(line)) !== null) {
    const componentName = match[1]
    const startIndex = match.index + match[0].indexOf(componentName)
    const endIndex = startIndex + componentName.length

    if (position.character >= startIndex && position.character <= endIndex) {
      const startPos = new vscode.Position(position.line, startIndex)
      const endPos = new vscode.Position(position.line, endIndex)
      const range = new vscode.Range(startPos, endPos)

      return {
        componentName,
        range,
        type: "react"
      }
    }
  }

  return null
}

export function parseRailsProps(
  document: vscode.TextDocument,
  position: vscode.Position
): PropUsage | null {
  const lineText = document.lineAt(position.line).text

  const propRegex = /(\w+):\s*["']?([^"',}]+)["']?/g
  let match

  while ((match = propRegex.exec(lineText)) !== null) {
    const propName = match[1]
    const propValue = match[2].trim()
    const startIndex = match.index
    const endIndex = startIndex + propName.length

    if (position.character >= startIndex && position.character <= endIndex) {
      const startPos = new vscode.Position(position.line, startIndex)
      const endPos = new vscode.Position(position.line, endIndex)
      const range = new vscode.Range(startPos, endPos)

      return {
        propName,
        range,
        value: propValue
      }
    }
  }

  return null
}

export function parseReactProps(
  document: vscode.TextDocument,
  position: vscode.Position
): PropUsage | null {
  const lineText = document.lineAt(position.line).text

  const propRegex = /(\w+)=(?:["']([^"']+)["']|\{([^}]+)\})/g
  let match

  while ((match = propRegex.exec(lineText)) !== null) {
    const propName = match[1]
    const propValue = match[2] || match[3]
    const startIndex = match.index
    const endIndex = startIndex + propName.length

    if (position.character >= startIndex && position.character <= endIndex) {
      const startPos = new vscode.Position(position.line, startIndex)
      const endPos = new vscode.Position(position.line, endIndex)
      const range = new vscode.Range(startPos, endPos)

      return {
        propName,
        range,
        value: propValue?.trim()
      }
    }
  }

  return null
}

export function findComponentContext(
  document: vscode.TextDocument,
  position: vscode.Position
): ComponentUsage | null {
  for (let line = position.line; line >= Math.max(0, position.line - 20); line--) {
    const lineText = document.lineAt(line).text

    const railsMatch = lineText.match(/pb_rails\(\s*["']([^"']+)["']/)
    if (railsMatch) {
      const componentName = railsMatch[1]
      const startIndex = railsMatch.index! + railsMatch[0].indexOf(componentName)
      const endIndex = startIndex + componentName.length
      const startPos = new vscode.Position(line, startIndex)
      const endPos = new vscode.Position(line, endIndex)
      const range = new vscode.Range(startPos, endPos)

      return {
        componentName,
        range,
        type: "rails"
      }
    }

    const reactMatch = lineText.match(/<([A-Z][a-zA-Z0-9]*)/)
    if (reactMatch) {
      const componentName = reactMatch[1]
      const startIndex = reactMatch.index! + 1
      const endIndex = startIndex + componentName.length
      const startPos = new vscode.Position(line, startIndex)
      const endPos = new vscode.Position(line, endIndex)
      const range = new vscode.Range(startPos, endPos)

      return {
        componentName,
        range,
        type: "react"
      }
    }
  }

  return null
}
