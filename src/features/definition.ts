import * as vscode from 'vscode';
import { GODOT_SHADER_TYPES } from '../shader-data';

export class GodotShaderDefinitionProvider implements vscode.DefinitionProvider {

    public provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Definition | vscode.DefinitionLink[]> {
        // 阶段 0: 检查是否在 #include 路径上 — 跳转到被引用的文件
        const lineText = document.lineAt(position.line).text;
        const includeMatch = lineText.match(/#include\s+"([^"]+)"/);
        if (includeMatch) {
            const quoteStart = lineText.indexOf('"');
            const quoteEnd = lineText.lastIndexOf('"');
            if (position.character > quoteStart && position.character < quoteEnd) {
                const includePath = includeMatch[1];
                const currentDir = vscode.Uri.joinPath(document.uri, '..');
                const targetUri = vscode.Uri.joinPath(currentDir, includePath);
                return new vscode.Location(targetUri, new vscode.Position(0, 0));
            }
        }

        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) return null;

        const word = document.getText(wordRange);

        // 阶段 1: 查找用户声明（变量 + 函数）
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text.trim();

            // 匹配变量声明: uniform/varying/in/out/const type name
            const declMatch = text.match(/^(uniform|varying|in|out|const)\s+(\w+)\s+(\w+)/);
            if (declMatch && declMatch[3] === word) {
                if (i === position.line) continue;
                const nameIndex = line.text.indexOf(declMatch[3]);
                return new vscode.Location(
                    document.uri,
                    new vscode.Range(i, nameIndex, i, nameIndex + word.length)
                );
            }

            // 跳过 shader_type / render_mode 等无效行（不作函数定义匹配）
            if (/^(uniform|varying|in|out|const|shader_type|render_mode)\b/.test(text)) {
                continue;
            }

            // 匹配函数定义: 任意返回类型 + 函数名 + (
            // 例如: void vertex(), float calc(), vec3 get_normal()
            // 注意: (?:void|float|...) 前缀是可选的，支持多词返回类型
            const funcMatch = text.match(/^(\w+(?:\s+\w+)?)\s+(\w+)\s*\(/);
            if (funcMatch && funcMatch[2] === word) {
                if (i === position.line) continue;
                const nameIndex = line.text.indexOf(funcMatch[2]);
                return new vscode.Location(
                    document.uri,
                    new vscode.Range(i, nameIndex, i, nameIndex + word.length)
                );
            }

            // Godot 着色器函数（无返回类型）: vertex() {, fragment() {, light() {, sky() {, fog() {
            // 支持 { 在同一行或下一行
            const SHADER_PROCESS_FUNCS = ['vertex', 'fragment', 'light', 'sky', 'fog'];
            let shaderFuncMatch = text.match(/^(\w+)\s*\([^)]*\)\s*\{/);
            if (!shaderFuncMatch) {
                // { 可能在下一行
                const bareMatch = text.match(/^(\w+)\s*\([^)]*\)\s*$/);
                if (bareMatch && SHADER_PROCESS_FUNCS.includes(bareMatch[1])) {
                    shaderFuncMatch = bareMatch;
                }
            }
            if (shaderFuncMatch && SHADER_PROCESS_FUNCS.includes(shaderFuncMatch[1]) && shaderFuncMatch[1] === word) {
                if (i === position.line) continue;
                const nameIndex = line.text.indexOf(shaderFuncMatch[1]);
                return new vscode.Location(
                    document.uri,
                    new vscode.Range(i, nameIndex, i, nameIndex + word.length)
                );
            }

            // 匹配函数内局部变量声明: type name = value; / type name;
            // 仅当首词是已知类型时匹配，避免误匹配 return x; 等
            const localVarMatch = text.match(/^(\w+)\s+(\w+)\s*[=;]/);
            if (localVarMatch && GODOT_SHADER_TYPES.includes(localVarMatch[1]) && localVarMatch[2] === word) {
                if (i === position.line) continue;
                const nameIndex = line.text.indexOf(localVarMatch[2]);
                return new vscode.Location(
                    document.uri,
                    new vscode.Range(i, nameIndex, i, nameIndex + word.length)
                );
            }
        }

        // 内置函数没有源代码可供跳转，返回 null
        return null;
    }
}
