import * as vscode from 'vscode';

// 缓存解析后的符号数据
interface CachedSymbol {
    name: string;
    kind: vscode.SymbolKind;
    detail: string;
    location: vscode.Location;
}

let symbolCache: CachedSymbol[] | null = null;
let cacheVersion = 0;

export class GodotShaderWorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {

    public async provideWorkspaceSymbols(
        query: string,
        token: vscode.CancellationToken
    ): Promise<vscode.SymbolInformation[]> {
        // 首次或缓存失效时重建索引
        if (!symbolCache) {
            symbolCache = await this.buildIndex(token);
        }

        const queryUpper = query.toUpperCase();
        const results: vscode.SymbolInformation[] = [];

        for (const s of symbolCache) {
            if (token.isCancellationRequested) return results;
            if (s.name.toUpperCase().includes(queryUpper)) {
                results.push(new vscode.SymbolInformation(
                    s.name, s.kind, s.detail, s.location
                ));
            }
        }

        return results;
    }

    /** 外部可调用以失效缓存（文件变化时） */
    public static invalidateCache(): void {
        symbolCache = null;
        cacheVersion++;
    }

    private async buildIndex(token: vscode.CancellationToken): Promise<CachedSymbol[]> {
        const results: CachedSymbol[] = [];
        const files = await vscode.workspace.findFiles('**/*.gdshader', '**/node_modules/**');

        for (const file of files) {
            if (token.isCancellationRequested) return results;

            try {
                // 使用 fs.readFile 代替 openTextDocument，更快且不触发编辑器
                const rawBytes = await vscode.workspace.fs.readFile(file);
                const text = new TextDecoder().decode(rawBytes);
                const lines = text.split('\n');

                // 从文本内容直接提取 shader_type
                const shaderMatch = text.match(/^shader_type\s+(\w+)/m);
                const shaderType = shaderMatch ? shaderMatch[1] : '';

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();

                    const uniformMatch = line.match(/^uniform\s+(\w+)\s+(\w+)/);
                    if (uniformMatch) {
                        const [, type, name] = uniformMatch;
                        results.push({
                            name,
                            kind: vscode.SymbolKind.Variable,
                            detail: `uniform ${type} (${shaderType})`,
                            location: new vscode.Location(file, new vscode.Position(i, 0))
                        });
                        continue;
                    }

                    const varyingMatch = line.match(/^varying\s+(\w+)\s+(\w+)/);
                    if (varyingMatch) {
                        const [, type, name] = varyingMatch;
                        results.push({
                            name,
                            kind: vscode.SymbolKind.Variable,
                            detail: `varying ${type} (${shaderType})`,
                            location: new vscode.Location(file, new vscode.Position(i, 0))
                        });
                        continue;
                    }

                    const funcMatch = line.match(/^void\s+(\w+)\s*\(/);
                    if (funcMatch) {
                        const name = funcMatch[1];
                        results.push({
                            name,
                            kind: vscode.SymbolKind.Function,
                            detail: `${name}() (${shaderType})`,
                            location: new vscode.Location(file, new vscode.Position(i, 0))
                        });
                    }
                }
            } catch {
                // 跳过无法读取的文件
            }
        }

        return results;
    }
}
