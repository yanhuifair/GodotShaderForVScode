import * as vscode from 'vscode';
import { t } from '../i18n';

export class GodotShaderCodeActionProvider implements vscode.CodeActionProvider {

    public provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CodeAction[]> {
        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {
            const msg = diagnostic.message;
            
            if (msg.includes('semicolon') || msg.includes('分号')) {
                actions.push(this.createFixAddSemicolon(document, diagnostic));
            } else if (msg.includes('shader_type') && (msg.includes('Missing') || msg.includes('缺少'))) {
                actions.push(this.createFixAddShaderType(document, diagnostic));
            } else if ((msg.includes('Missing') || msg.includes('缺少')) && (msg.includes('brace') || msg.includes('大括号'))) {
                actions.push(this.createFixAddClosingBrace(document, diagnostic));
            }
        }

        return actions.length > 0 ? actions : undefined;
    }

    // 快速修复：添加分号
    private createFixAddSemicolon(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
        const fix = new vscode.CodeAction(
            t('fix.add_semicolon'),
            vscode.CodeActionKind.QuickFix
        );
        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.insert(document.uri, diagnostic.range.end, ';');
        fix.diagnostics = [diagnostic];
        fix.isPreferred = true;
        return fix;
    }

    // 快速修复：添加 shader_type 声明
    private createFixAddShaderType(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
        const fix = new vscode.CodeAction(
            t('fix.add_shader_type'),
            vscode.CodeActionKind.QuickFix
        );
        fix.edit = new vscode.WorkspaceEdit();
        const insertPos = new vscode.Position(0, 0);
        fix.edit.insert(document.uri, insertPos, 'shader_type canvas_item;\n\n');
        fix.diagnostics = [diagnostic];
        fix.isPreferred = true;
        return fix;
    }

    // 快速修复：补全缺少的大括号
    private createFixAddClosingBrace(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
        const fix = new vscode.CodeAction(
            t('fix.add_brace'),
            vscode.CodeActionKind.QuickFix
        );
        fix.edit = new vscode.WorkspaceEdit();
        const lastLine = document.lineAt(document.lineCount - 1);
        fix.edit.insert(document.uri, lastLine.range.end, '\n}');
        fix.diagnostics = [diagnostic];
        return fix;
    }
}
