import * as vscode from 'vscode';
import { escapeRegExp, isInCommentOrString } from '../utils';

export class GodotShaderReferenceProvider implements vscode.ReferenceProvider {

    public provideReferences(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.ReferenceContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Location[]> {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) return null;

        const targetWord = document.getText(wordRange);
        const locations: vscode.Location[] = [];

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text;

            // 在当前行找目标词
            const wordRegex = new RegExp('\\b' + escapeRegExp(targetWord) + '\\b', 'g');
            let match: RegExpExecArray | null;

            while ((match = wordRegex.exec(text)) !== null) {
                // 跳过注释和字符串内的匹配
                if (isInCommentOrString(text, match.index)) {
                    continue;
                }

                const range = new vscode.Range(i, match.index, i, match.index + targetWord.length);
                locations.push(new vscode.Location(document.uri, range));
            }
        }

        return locations;
    }
}
