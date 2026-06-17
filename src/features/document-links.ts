import * as vscode from 'vscode';

/**
 * DocumentLinkProvider — 让 #include "path" 可点击跳转
 */
export class GodotShaderDocumentLinkProvider implements vscode.DocumentLinkProvider {

    public provideDocumentLinks(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DocumentLink[]> {
        const links: vscode.DocumentLink[] = [];
        const includeRegex = /#include\s+"([^"]+)"/g;

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text;

            let match: RegExpExecArray | null;
            while ((match = includeRegex.exec(text)) !== null) {
                const includePath = match[1];
                // 相对于当前文档目录解析路径
                const currentDir = vscode.Uri.joinPath(document.uri, '..');
                const targetUri = vscode.Uri.joinPath(currentDir, includePath);

                const range = new vscode.Range(
                    i, match.index + match[0].indexOf('"') + 1,
                    i, match.index + match[0].lastIndexOf('"')
                );

                const link = new vscode.DocumentLink(range, targetUri);
                link.tooltip = `Open ${includePath}`;
                links.push(link);
            }
        }

        return links;
    }
}
