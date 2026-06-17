import * as vscode from 'vscode';
import { GODOT_SHADER_FUNCTIONS } from '../shader-data';

// 预构建函数名 → 数据映射（O(1) 查找）
const FUNC_MAP: Map<string, { name: string; signature: string; description: string }> = new Map();
for (const f of GODOT_SHADER_FUNCTIONS) {
    FUNC_MAP.set(f.name, f);
}

export class GodotShaderSignatureHelpProvider implements vscode.SignatureHelpProvider {

    public provideSignatureHelp(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.SignatureHelpContext
    ): vscode.ProviderResult<vscode.SignatureHelp> {
        const lineText = document.lineAt(position.line).text;
        const textBeforeCursor = lineText.substring(0, position.character);

        // 向左查找函数名
        const funcName = this.extractFunctionName(textBeforeCursor);
        if (!funcName) return null;

        // 在数据中查找匹配的函数（O(1) Map 查找）
        const funcData = FUNC_MAP.get(funcName);
        if (!funcData) return null;

        // 解析参数
        const params = this.parseParameters(funcData.signature);
        if (params.length === 0) {
            // 无参数函数，不需要显示签名帮助
            if (!textBeforeCursor.includes('(') || textBeforeCursor.endsWith('()')) {
                return null;
            }
        }

        const signature = new vscode.SignatureInformation(
            funcData.signature,
            funcData.description
        );
        signature.parameters = params.map(p => 
            new vscode.ParameterInformation(p.trim())
        );

        const help = new vscode.SignatureHelp();
        help.signatures = [signature];
        help.activeSignature = 0;

        // 计算当前参数索引
        help.activeParameter = this.getActiveParameter(textBeforeCursor);

        return help;
    }

    // 从光标位置向前提取函数名
    private extractFunctionName(text: string): string | null {
        // 找到最后一个 ( 的位置
        const parenIndex = text.lastIndexOf('(');
        if (parenIndex < 0) return null;

        // 在 ( 之前寻找函数名
        const beforeParen = text.substring(0, parenIndex).trimEnd();
        const match = beforeParen.match(/([a-zA-Z_]\w*)$/);
        return match ? match[1] : null;
    }

    // 从函数签名中提取参数列表
    private parseParameters(signature: string): string[] {
        const match = signature.match(/\(([^)]*)\)/);
        if (!match || !match[1].trim()) return [];
        return match[1].split(',').map(p => p.trim());
    }

    // 计算当前正在输入第几个参数（基于逗号数量）
    private getActiveParameter(textBeforeCursor: string): number {
        const lastParen = textBeforeCursor.lastIndexOf('(');
        if (lastParen < 0) return 0;

        const textInParen = textBeforeCursor.substring(lastParen);
        let depth = 0;
        let commaCount = 0;

        for (let i = 0; i < textInParen.length; i++) {
            const ch = textInParen[i];
            if (ch === '(') depth++;
            else if (ch === ')') depth--;
            else if (ch === ',' && depth === 1) commaCount++;
        }

        return commaCount;
    }
}
