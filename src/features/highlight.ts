import * as vscode from 'vscode';
import { escapeRegExp, isInCommentOrString } from '../utils';
import { GODOT_SHADER_KEYWORD_SET } from '../shader-data';

export class GodotShaderHighlightProvider implements vscode.DocumentHighlightProvider {

    public provideDocumentHighlights(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): vscode.ProviderResult<vscode.DocumentHighlight[]> {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) return null;

        const targetWord = document.getText(wordRange);
        if (!targetWord || targetWord.length === 0) return null;

        // 关键字不显示高亮（复用统一的 Set）
        if (GODOT_SHADER_KEYWORD_SET.has(targetWord)) return null;

        const highlights: vscode.DocumentHighlight[] = [];
        const wordRegex = new RegExp('\\b' + escapeRegExp(targetWord) + '\\b', 'g');

        for (let i = 0; i < document.lineCount; i++) {
            const text = document.lineAt(i).text;
            let match: RegExpExecArray | null;

            while ((match = wordRegex.exec(text)) !== null) {
                // 跳过注释和字符串内的匹配
                if (isInCommentOrString(text, match.index)) {
                    continue;
                }

                const range = new vscode.Range(i, match.index, i, match.index + targetWord.length);

                // 判断是否为写入引用（声明行）
                const linePrefix = text.substring(0, match.index).trim();
                const lineSuffix = text.substring(match.index + targetWord.length).trim();
                const isDeclaration = /^(uniform|varying|in\s|out\s|const)\b/.test(linePrefix + targetWord + ' ');

                // 判断是否为赋值左侧（写操作）
                const isWrite = lineSuffix.startsWith('=') || isDeclaration;

                highlights.push(new vscode.DocumentHighlight(
                    range,
                    isWrite ? vscode.DocumentHighlightKind.Write : vscode.DocumentHighlightKind.Read
                ));
            }
        }

        return highlights.length > 0 ? highlights : null;
    }
}
