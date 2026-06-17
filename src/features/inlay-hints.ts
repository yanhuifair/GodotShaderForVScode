import * as vscode from 'vscode';
import { GODOT_SHADER_FUNCTIONS } from '../shader-data';

/**
 * InlayHintsProvider — 在函数调用参数前显示参数名提示
 * 例如: mix(|x, y, a) → mix(x:, y:, a:)
 */
export class GodotShaderInlayHintsProvider implements vscode.InlayHintsProvider {

    // 配置变更时通知 VS Code 刷新 hints
    private _onDidChangeInlayHints = new vscode.EventEmitter<void>();
    public readonly onDidChangeInlayHints = this._onDidChangeInlayHints.event;

    constructor() {
        // 监听配置变更，立即刷新 inlay hints
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('godot-shader.inlayHints.showParameterNames')) {
                this._onDidChangeInlayHints.fire();
            }
        });
    }

    // 构建函数名 → 参数名列表的快速查找表
    private static readonly funcParamMap: Map<string, string[]> = (() => {
        const map = new Map<string, string[]>();
        for (const func of GODOT_SHADER_FUNCTIONS) {
            const params = GodotShaderInlayHintsProvider.extractParamNames(func.signature);
            if (params.length > 0) {
                map.set(func.name, params);
            }
        }
        return map;
    })();

    /**
     * 从函数签名中提取参数名（排除类型标注）
     * 例如: "mix(vecX a, vecX b, float|vecX t)" → ["a", "b", "t"]
     */
    private static extractParamNames(signature: string): string[] {
        const match = signature.match(/\(([^)]*)\)/);
        if (!match || !match[1].trim()) return [];
        return match[1].split(',').map(part => {
            // 取最后一个词（忽略类型前缀）
            const words = part.trim().split(/\s+/);
            return words[words.length - 1];
        });
    }

    public provideInlayHints(
        document: vscode.TextDocument,
        range: vscode.Range,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.InlayHint[]> {
        // 检查设置：是否显示参数名提示
        const showHints = vscode.workspace.getConfiguration('godot-shader')
            .get<boolean>('inlayHints.showParameterNames', true);
        if (!showHints) return [];

        // 合并内置函数 + 文档中用户自定义函数的参数名
        const userParams = this.extractUserFuncParams(document);
        const mergedParams = new Map(GodotShaderInlayHintsProvider.funcParamMap);
        for (const [name, params] of userParams) {
            mergedParams.set(name, params);
        }

        const hints: vscode.InlayHint[] = [];

        for (let line = range.start.line; line <= range.end.line; line++) {
            if (token.isCancellationRequested) break;

            const lineText = document.lineAt(line).text;

            // 查找所有函数调用: funcName(
            const funcCallRegex = /\b([a-zA-Z_]\w*)\s*\(/g;
            let match: RegExpExecArray | null;

            while ((match = funcCallRegex.exec(lineText)) !== null) {
                const funcName = match[1];
                const openParenPos = match.index + match[0].length - 1; // '(' 的位置

                const paramNames = mergedParams.get(funcName);
                if (!paramNames || paramNames.length === 0) {
                    // 无参函数，不显示提示
                    continue;
                }

                // 提取调用中的参数
                const args = this.extractArgs(lineText, openParenPos);
                if (args.length === 0) continue;

                // 为每个参数添加 inlay hint（跳过第一个参数）
                for (let i = 0; i < Math.min(args.length, paramNames.length); i++) {
                    const argPos = args[i];
                    const paramName = paramNames[i];

                    const hint = new vscode.InlayHint(
                        new vscode.Position(line, argPos),
                        `${paramName}: `,
                        vscode.InlayHintKind.Parameter
                    );
                    hint.paddingLeft = false;
                    hint.paddingRight = false;
                    hints.push(hint);
                }
            }
        }

        return hints;
    }

    /**
     * 从开括号位置提取函数调用的各个参数起始位置
     */
    private extractArgs(lineText: string, openParenPos: number): number[] {
        const args: number[] = [];

        let depth = 0;
        let currentArgStart = openParenPos + 1;
        let inString = false;
        let stringChar = '';

        for (let i = openParenPos; i < lineText.length; i++) {
            const ch = lineText[i];

            // 处理字符串
            if (!inString && (ch === '"' || ch === "'")) {
                inString = true;
                stringChar = ch;
                continue;
            }
            if (inString && ch === stringChar && lineText[i - 1] !== '\\') {
                inString = false;
                continue;
            }
            if (inString) continue;

            if (ch === '(') {
                depth++;
                if (depth === 1) {
                    currentArgStart = i + 1;
                }
            } else if (ch === ')') {
                depth--;
                if (depth === 0) {
                    // 最后一个参数
                    const argText = lineText.substring(currentArgStart, i).trim();
                    if (argText) {
                        args.push(currentArgStart);
                    }
                    break;
                }
            } else if (ch === ',' && depth === 1) {
                const argText = lineText.substring(currentArgStart, i).trim();
                if (argText) {
                    args.push(currentArgStart);
                }
                currentArgStart = i + 1;
            }
        }

        return args;
    }

    /**
     * 扫描文档中的用户自定义函数定义，提取参数名
     * 匹配: void myFunc(float x, vec3 y) { 或 float calc(int n) {
     */
    private extractUserFuncParams(document: vscode.TextDocument): Map<string, string[]> {
        const result = new Map<string, string[]>();
        const text = document.getText();

        // 匹配函数定义: returnType funcName(params)
        // 返回类型可以是 void/float/vec3 等，函数名后面跟 (
        // 排除: shader_type, render_mode, uniform, varying, in, out, const, if, for, while, switch
        const funcDefRegex = /^(?!(shader_type|render_mode|uniform|varying|in\b|out\b|const\b|if\b|for\b|while\b|switch\b))\s*(\w+(?:\s+\w+)?)\s+(\w+)\s*\(([^)]*)\)/gm;

        let match: RegExpExecArray | null;
        while ((match = funcDefRegex.exec(text)) !== null) {
            const funcName = match[3];
            const paramsStr = match[4];

            // 跳过着色器入口函数（已有内置签名）
            if (['vertex', 'fragment', 'light', 'sky', 'fog'].includes(funcName)) continue;

            // 跳过已在内置列表中的函数
            if (GodotShaderInlayHintsProvider.funcParamMap.has(funcName)) continue;

            if (!paramsStr.trim()) continue;

            // 提取参数名：去掉类型前缀和默认值
            const paramNames = paramsStr.split(',').map(p => {
                // "float x" → "x", "vec3 color = vec3(1.0)" → "color"
                const parts = p.trim().split(/\s+/);
                // 找第一个不是类型的词（类型在 GODOT_SHADER_TYPES 中）
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    // 跳过 = 和默认值
                    if (part === '=') break;
                    // 跳过类型名和修饰符
                    if (/^(float|int|uint|bool|vec[234]|ivec[234]|uvec[234]|bvec[234]|mat[234]|sampler\w+|void|in|out|inout)$/.test(part)) {
                        continue;
                    }
                    return part;
                }
                return parts[0]; // fallback
            }).filter(p => p);

            if (paramNames.length > 0) {
                result.set(funcName, paramNames);
            }
        }

        return result;
    }
}
