import * as vscode from 'vscode';
import { GODOT_SHADER_TYPES } from '../shader-data';

export class GodotShaderDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

    public provideDocumentSymbols(
        document: vscode.TextDocument,
    ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
        const symbols: vscode.DocumentSymbol[] = [];

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text.trim();

            // 跳过注释和空行
            if (!text || text.startsWith('//') || text.startsWith('/*') || text.startsWith('*')) {
                continue;
            }

            // 匹配 uniform 声明: uniform type name
            const uniformMatch = text.match(/^(uniform)\s+(\w+)\s+(\w+)/);
            if (uniformMatch) {
                const [, keyword, type, name] = uniformMatch;
                const detail = `${keyword} ${type}`;
                const selectionRange = new vscode.Range(i, line.text.indexOf(name), i, line.text.indexOf(name) + name.length);
                const range = new vscode.Range(i, 0, i, line.text.length);
                symbols.push(new vscode.DocumentSymbol(
                    name,
                    detail,
                    vscode.SymbolKind.Property,
                    range,
                    selectionRange
                ));
                continue;
            }

            // 匹配 varying 声明: varying type name
            const varyingMatch = text.match(/^(varying)\s+(\w+)\s+(\w+)/);
            if (varyingMatch) {
                const [, keyword, type, name] = varyingMatch;
                const detail = `${keyword} ${type}`;
                const selectionRange = new vscode.Range(i, line.text.indexOf(name), i, line.text.indexOf(name) + name.length);
                const range = new vscode.Range(i, 0, i, line.text.length);
                symbols.push(new vscode.DocumentSymbol(
                    name,
                    detail,
                    vscode.SymbolKind.Variable,
                    range,
                    selectionRange
                ));
                continue;
            }

            // 匹配 const 声明: const type name
            const constMatch = text.match(/^const\s+(\w+)\s+(\w+)/);
            if (constMatch) {
                const [, type, name] = constMatch;
                const detail = `const ${type}`;
                const selectionRange = new vscode.Range(i, line.text.indexOf(name), i, line.text.indexOf(name) + name.length);
                const range = new vscode.Range(i, 0, i, line.text.length);
                symbols.push(new vscode.DocumentSymbol(
                    name,
                    detail,
                    vscode.SymbolKind.Constant,
                    range,
                    selectionRange
                ));
                continue;
            }

            // 跳过 shader_type / render_mode / stencil_mode 行（避免误匹配函数）
            if (/^(shader_type|render_mode|stencil_mode)\b/.test(text)) {
                continue;
            }

            // 匹配 Godot 着色器函数: void vertex() {, void fragment() 等
            const shaderFuncMatch = text.match(/^void\s+(\w+)\s*\([^)]*\)\s*\{?/);
            if (shaderFuncMatch) {
                const name = shaderFuncMatch[1];
                const detail = 'void ' + name + '()';
                const selectionRange = new vscode.Range(i, line.text.indexOf(name), i, line.text.indexOf(name) + name.length);
                const range = new vscode.Range(i, 0, i, line.text.length);
                symbols.push(new vscode.DocumentSymbol(
                    name,
                    detail,
                    vscode.SymbolKind.Function,
                    range,
                    selectionRange
                ));
                continue;
            }

            // 匹配用户自定义函数: returnType funcName(params)
            const funcMatch = text.match(/^(\w+(?:\s+\w+)?)\s+(\w+)\s*\([^)]*\)\s*\{?/);
            if (funcMatch) {
                const returnType = funcMatch[1];
                const name = funcMatch[2];
                // 排除已知类型被误匹配为函数
                if (GODOT_SHADER_TYPES.includes(returnType)) {
                    const detail = `${returnType} ${name}()`;
                    const selectionRange = new vscode.Range(i, line.text.indexOf(name), i, line.text.indexOf(name) + name.length);
                    const range = new vscode.Range(i, 0, i, line.text.length);
                    symbols.push(new vscode.DocumentSymbol(
                        name,
                        detail,
                        vscode.SymbolKind.Function,
                        range,
                        selectionRange
                    ));
                }
            }
        }

        return symbols;
    }
}
