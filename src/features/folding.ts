import * as vscode from 'vscode';

export class GodotShaderFoldingRangeProvider implements vscode.FoldingRangeProvider {
    
    public provideFoldingRanges(
        document: vscode.TextDocument,
        context: vscode.FoldingContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.FoldingRange[]> {
        const ranges: vscode.FoldingRange[] = [];
        const braceStack: Array<{line: number, type: string}> = [];

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text.trim();

            // 跳过注释和空行
            if (!text || text.startsWith('//') || text.startsWith('/*') || text.startsWith('*')) {
                continue;
            }

            // 检测函数开始: void xxx() { 或 void xxx() 后跟单独一行的 {
            let isFuncDef = /^void\s+\w+\s*\([^)]*\)\s*\{/.test(text);
            if (!isFuncDef && /^void\s+\w+\s*\([^)]*\)\s*$/.test(text)) {
                // { 可能在下行，检查下一个非空非注释行
                for (let k = i + 1; k < document.lineCount; k++) {
                    const nextText = document.lineAt(k).text.trim();
                    if (!nextText || nextText.startsWith('//') || nextText.startsWith('/*')) continue;
                    if (nextText === '{') {
                        isFuncDef = true;
                    }
                    break;
                }
            }

            // 检测普通大括号
            for (let j = 0; j < line.text.length; j++) {
                const ch = line.text[j];
                if (ch === '{') {
                    braceStack.push({line: i, type: isFuncDef ? 'function' : 'block'});
                } else if (ch === '}') {
                    const start = braceStack.pop();
                    if (start && i - start.line > 1) {
                        ranges.push(new vscode.FoldingRange(
                            start.line,
                            i,
                            vscode.FoldingRangeKind.Region
                        ));
                    }
                }
            }
        }

        return ranges;
    }
}
