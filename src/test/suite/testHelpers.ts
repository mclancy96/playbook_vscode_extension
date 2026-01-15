import * as vscode from "vscode";

export async function createTestDocument(
  languageId: string,
  content: string
): Promise<vscode.TextDocument> {
  const uri = vscode.Uri.parse(`untitled:test-${Date.now()}.${languageId}`);
  const document = await vscode.workspace.openTextDocument(uri);
  const edit = new vscode.WorkspaceEdit();
  edit.insert(uri, new vscode.Position(0, 0), content);
  await vscode.workspace.applyEdit(edit);
  return document;
}

export function getCompletionItems(
  completions: vscode.CompletionList | vscode.CompletionItem[] | undefined | null
): vscode.CompletionItem[] {
  if (!completions) {
    return [];
  }
  return Array.isArray(completions) ? completions : completions.items;
}

export function createCancellationToken(): vscode.CancellationToken {
  return new vscode.CancellationTokenSource().token;
}

export function createCompletionContext(triggerCharacter?: string): vscode.CompletionContext {
  return {
    triggerKind: vscode.CompletionTriggerKind.Invoke,
    triggerCharacter
  };
}
