import * as vscode from 'vscode';
import { escapeRegExp } from '../utils';
import { GODOT_SHADER_KEYWORD_SET } from '../shader-data';
import { getLang } from '../i18n';

/**
 * CodeLensProvider — 显示 uniform/varying/const 的引用计数等上下文信息
 */
export class GodotShaderCodeLensProvider implements vscode.CodeLensProvider {

    private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

    public refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }

    public provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CodeLens[]> {
        const lang = getLang();
        const refLabel = lang === 'zh' ? '处引用' : 'reference';
        const refLabels = lang === 'zh' ? '处引用' : 'references';
        const findRefs = lang === 'zh' ? '查找所有引用' : 'Find all references';

        const lenses: vscode.CodeLens[] = [];

        // 预先计算整个文档中每个标识符的出现次数
        const refCounts = this.computeReferenceCounts(document);

        for (let i = 0; i < document.lineCount; i++) {
            if (token.isCancellationRequested) break;

            const line = document.lineAt(i);
            const text = line.text.trim();

            // 匹配 uniform / varying / const 声明: keyword type name
            const declMatch = text.match(/^(uniform|varying|const)\s+(\w+)\s+(\w+)/);
            if (declMatch) {
                const [, keyword, type, name] = declMatch;
                const count = refCounts.get(name) || 0;
                const nameIndex = line.text.indexOf(name);
                const range = new vscode.Range(i, nameIndex, i, nameIndex + name.length);

                const lens = new vscode.CodeLens(range);
                lens.command = {
                    title: `${count} ${count === 1 ? refLabel : refLabels}`,
                    command: 'editor.action.findReferences',
                    arguments: [
                        document.uri,
                        new vscode.Position(i, nameIndex)
                    ],
                    tooltip: `${findRefs} '${name}'`
                };
                lenses.push(lens);
                continue;
            }

            // 匹配 Godot 着色器入口函数: void vertex() / void fragment() 等
            const funcMatch = text.match(/^void\s+(\w+)\s*\(/);
            if (funcMatch) {
                const funcName = funcMatch[1];
                const count = refCounts.get(funcName) || 0;
                const nameIndex = line.text.indexOf(funcName);
                const range = new vscode.Range(i, nameIndex, i, nameIndex + funcName.length);

                if (count > 0) {
                    const lens = new vscode.CodeLens(range);
                    lens.command = {
                        title: `${count} ${count === 1 ? refLabel : refLabels}`,
                        command: 'editor.action.findReferences',
                        arguments: [
                            document.uri,
                            new vscode.Position(i, nameIndex)
                        ],
                        tooltip: `${findRefs} '${funcName}'`
                    };
                    lenses.push(lens);
                }
            }
        }

        return lenses;
    }

    /**
     * 计算文档中每个标识符的出现次数
     */
    private computeReferenceCounts(document: vscode.TextDocument): Map<string, number> {
        const counts = new Map<string, number>();
        const text = document.getText();

        // 匹配所有标识符
        const wordRegex = /\b([a-zA-Z_]\w*)\b/g;
        let match: RegExpExecArray | null;

        while ((match = wordRegex.exec(text)) !== null) {
            const word = match[1];
            // 跳过关键字、类型名、单字符
            if (word.length <= 1 || GODOT_SHADER_KEYWORD_SET.has(word)) continue;

            counts.set(word, (counts.get(word) || 0) + 1);
        }

        return counts;
    }
}
