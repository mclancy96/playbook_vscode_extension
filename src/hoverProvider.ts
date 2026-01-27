import * as vscode from "vscode"
import {
  loadMetadata,
  findComponentByRailsName,
  findComponentByReactName,
  generateComponentDocs,
  generatePropDocs
} from "./metadata"
import {
  parseRailsComponent,
  parseReactComponent,
  parseRailsProps,
  parseReactProps,
  findComponentContext
} from "./parser"

export class PlaybookHoverProvider implements vscode.HoverProvider {
  private extensionPath: string

  constructor(extensionPath: string) {
    this.extensionPath = extensionPath
    console.log(`[PlaybookHoverProvider] Created with extension path: ${extensionPath}`)
  }

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Hover> {
    console.log(
      `[PlaybookHoverProvider] Hover requested at ${document.languageId}:${position.line}:${position.character}`
    )

    const metadata = loadMetadata(this.extensionPath)

    const railsComponent = parseRailsComponent(document, position)
    if (railsComponent) {
      const component = findComponentByRailsName(metadata, railsComponent.componentName)
      if (component) {
        const docs = generateComponentDocs(railsComponent.componentName, component, metadata)
        return new vscode.Hover(new vscode.MarkdownString(docs), railsComponent.range)
      }
    }

    const reactComponent = parseReactComponent(document, position)
    if (reactComponent) {
      const component = findComponentByReactName(metadata, reactComponent.componentName)
      if (component) {
        const docs = generateComponentDocs(reactComponent.componentName, component, metadata)
        return new vscode.Hover(new vscode.MarkdownString(docs), reactComponent.range)
      }
    }

    const railsProp = parseRailsProps(document, position)
    if (railsProp) {
      const componentContext = findComponentContext(document, position)
      if (componentContext) {
        const component =
          componentContext.type === "rails"
            ? findComponentByRailsName(metadata, componentContext.componentName)
            : findComponentByReactName(metadata, componentContext.componentName)

        if (component) {
          const prop =
            component.props[railsProp.propName] ||
            (metadata as any).globalProps?.[railsProp.propName]
          if (prop) {
            const propDocs = generatePropDocs(
              railsProp.propName,
              prop,
              !component.props[railsProp.propName]
            )
            return new vscode.Hover(new vscode.MarkdownString(propDocs), railsProp.range)
          }
        }
      }
    }

    const reactProp = parseReactProps(document, position)
    if (reactProp) {
      const componentContext = findComponentContext(document, position)
      if (componentContext) {
        const component = findComponentByReactName(metadata, componentContext.componentName)

        if (component) {
          const snakeCaseProp = reactProp.propName.replace(/([A-Z])/g, "_$1").toLowerCase()

          const prop =
            component.props[snakeCaseProp] || (metadata as any).globalProps?.[snakeCaseProp]
          if (prop) {
            const propDocs = generatePropDocs(
              reactProp.propName,
              prop,
              !component.props[snakeCaseProp]
            )
            return new vscode.Hover(new vscode.MarkdownString(propDocs), reactProp.range)
          }
        }
      }
    }

    return null
  }
}
