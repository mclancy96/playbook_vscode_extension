import * as vscode from "vscode"
import { loadMetadata, findComponentByRailsName, findComponentByReactName } from "./metadata"
import { parseRailsComponent, parseReactComponent } from "./parser"

export class PlaybookDefinitionProvider implements vscode.DefinitionProvider {
  private extensionPath: string

  constructor(extensionPath: string) {
    this.extensionPath = extensionPath
  }

  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Definition> {
    const metadata = loadMetadata(this.extensionPath)

    const railsComponent = parseRailsComponent(document, position)
    if (railsComponent) {
      const component = findComponentByRailsName(metadata, railsComponent.componentName)
      if (component) {
        const playbookUrl = `https://playbook.powerhrg.com/kits/${railsComponent.componentName}/react`

        const uri = vscode.Uri.parse(playbookUrl)
        return new vscode.Location(uri, new vscode.Position(0, 0))
      }
    }

    const reactComponent = parseReactComponent(document, position)
    if (reactComponent) {
      const component = findComponentByReactName(metadata, reactComponent.componentName)
      if (component) {
        const playbookUrl = `https://playbook.powerhrg.com/kits/${component.rails}/react`

        const uri = vscode.Uri.parse(playbookUrl)
        return new vscode.Location(uri, new vscode.Position(0, 0))
      }
    }

    return null
  }
}
