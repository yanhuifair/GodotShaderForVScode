import * as vscode from 'vscode';

/**
 * SelectionRangeProvider — 智能选区逐级扩展
 * 单词 → 行 → 代码块 → 函数体 → 全文
 */
export class GodotShaderSelectionRangeProvider implements vscode.SelectionRangeProvider {

    public provideSelectionRanges(
        document: vscode.TextDocument,
        positions: vscode.Position[],
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.SelectionRange[]> {
        return positions.map(pos => this.buildSelectionRange(document, pos));
    }

    private buildSelectionRange(document: vscode.TextDocument, position: vscode.Position): vscode.SelectionRange {
        const line = position.line;

        // 级别 5: 全文
        const fullRange = new vscode.Range(0, 0, document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);

        // 级别 4: 函数体（查找包裹当前行的最近一对大括号）
        const funcRange = this.findEnclosingBlock(document, line);

        // 级别 3: 当前行（去除首尾空白）
        const lineText = document.lineAt(line).text;
        const trimmedStart = lineText.length - lineText.trimStart().length;
        const trimmedEnd = lineText.trimEnd().length;
        const lineRange = new vscode.Range(line, trimmedStart, line, trimmedEnd);

        // 级别 2: 当前单词
        const wordRange = document.getWordRangeAtPosition(position);
        const wordSelRange = wordRange || lineRange;

        // 级别 1: 光标位置（无选区，由 VS Code 默认处理）

        // 构建层级链: word → line → block → function → full
        const wordSr = new vscode.SelectionRange(wordSelRange);
        const lineSr = new vscode.SelectionRange(lineRange, wordSr);
        const blockSr = new vscode.SelectionRange(funcRange, lineSr);
        return new vscode.SelectionRange(fullRange, blockSr);
    }

    /**
     * 查找包裹指定行的最近一对大括号范围
     */
    private findEnclosingBlock(document: vscode.TextDocument, targetLine: number): vscode.Range {
        const braceStack: number[] = []; // 存储 { 的行号

        for (let i = 0; i < document.lineCount; i++) {
            const text = document.lineAt(i).text;
            for (let j = 0; j < text.length; j++) {
                if (text[j] === '{') {
                    braceStack.push(i);
                } else if (text[j] === '}') {
                    const openLine = braceStack.pop();
                    if (openLine !== undefined && openLine <= targetLine && i >= targetLine) {
                        // 找到包裹 targetLine 的块
                        return new vscode.Range(openLine, 0, i, document.lineAt(i).text.length);
                    }
                }
            }
        }

        // 没找到包裹块，返回当前行
        const lineText = document.lineAt(targetLine).text;
        return new vscode.Range(targetLine, 0, targetLine, lineText.length);
    }
}
