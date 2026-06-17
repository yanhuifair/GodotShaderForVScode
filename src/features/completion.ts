import * as vscode from 'vscode';
import { 
    GODOT_SHADER_BUILTINS_MASTER,
    GODOT_SHADER_FUNCTIONS, 
    GODOT_SHADER_TYPES, 
    GODOT_SHADER_KEYWORDS,
    GODOT_SHADER_HINTS,
    GODOT_SHADER_RENDER_MODES,
    GODOT_SHADER_RENDER_MODE_DESCRIPTIONS,
    GODOT_SHADER_STENCIL_MODES,
    GODOT_SHADER_STENCIL_MODE_DESCRIPTIONS,
    GODOT_SHADER_TYPE_DESCRIPTIONS,
    GODOT_SHADER_TYPE_INFO,
    GODOT_SHADER_HINT_INFO,
    getVariableShaderTypes
} from '../shader-data';
import { t, getLanguage, td, getLang } from '../i18n';
import { getShaderType } from '../utils';

// 语言感知的补全缓存（避免每次补全都重建 300+ 个 CompletionItem）
let cachedAllCompletions: { lang: string; items: vscode.CompletionItem[] } | null = null;
// 各上下文的小缓存：按 lang 或 shaderType 缓存较轻量的补全列表
let cachedTypeCompletions: { lang: string; items: vscode.CompletionItem[] } | null = null;
let cachedHintCompletions: { lang: string; items: vscode.CompletionItem[] } | null = null;
let cachedShaderTypeCompletions: { lang: string; items: vscode.CompletionItem[] } | null = null;
let cachedTypeKeywordCompletions: { lang: string; items: vscode.CompletionItem[] } | null = null;
// render_mode/stencil_mode/shader_func 按 shaderType 缓存
let cachedRenderModeCompletions: Map<string, vscode.CompletionItem[]> = new Map();
let cachedStencilModeCompletions: Map<string, vscode.CompletionItem[]> = new Map();
let cachedShaderFuncCompletions: Map<string, vscode.CompletionItem[]> = new Map();

// 语言切换时清除所有缓存
function clearAllCompletionCaches(): void {
    cachedAllCompletions = null;
    cachedTypeCompletions = null;
    cachedHintCompletions = null;
    cachedShaderTypeCompletions = null;
    cachedTypeKeywordCompletions = null;
    cachedRenderModeCompletions.clear();
    cachedStencilModeCompletions.clear();
    cachedShaderFuncCompletions.clear();
}

// 监听语言配置变更，清除缓存
vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('godot-shader.general.language')) {
        clearAllCompletionCaches();
    }
});

export class GodotShaderCompletionProvider implements vscode.CompletionItemProvider {
    
    // 触发字符 - 添加空格支持
    public static readonly triggerCharacters = ['.', ':', ',', '(', ' ', '\n', '#'];
    
    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        
        const lineText = document.lineAt(position.line).text;
        const textBeforeCursor = lineText.substring(0, position.character);
        
        // 获取当前文档的 shader 类型
        const shaderType = getShaderType(document) || 'canvas_item';
        
        // 判断当前上下文
        const isAfterUniform = this.isAfterKeywordContext(document, position, ['uniform', 'varying', 'in', 'out', 'const']);
        const isAfterShaderType = /shader_type\s*$/.test(textBeforeCursor);
        const isAfterRenderMode = /render_mode\s*$/.test(textBeforeCursor) || this.isInRenderModeContext(document, position);
        const isAfterStencilMode = /stencil_mode\s*$/.test(textBeforeCursor) || this.isInStencilModeContext(document, position);
        const isAfterColon = /:\s*$/.test(textBeforeCursor);
        const isAfterVoid = /void\s*$/.test(textBeforeCursor);
        // #include 路径补全
        const isIncludePath = /#include\s+"[^"]*$/.test(textBeforeCursor);
        
        let completions: vscode.CompletionItem[] = [];
        
        // #include 路径补全 — 优先级最高
        if (isIncludePath) {
            return this.getIncludePathCompletions(document);
        }

        // 预处理器指令补全 — #ifdef / #ifndef / #define 等
        const isPreprocessor = /^\s*#\w*$/.test(textBeforeCursor);
        if (isPreprocessor) {
            return this.getPreprocessorCompletions(document);
        }

        // 提供 shader_type 提示
        else if (isAfterShaderType) {
            completions = this.getShaderTypeCompletions();
        }
        // 提供 render_mode 提示
        else if (isAfterRenderMode) {
            completions = this.getRenderModeCompletions(shaderType);
        }
        // 提供 stencil_mode 提示
        else if (isAfterStencilMode) {
            completions = this.getStencilModeCompletions(shaderType);
        }
        // 提供 uniform/varying/in/out/const 的类型提示
        else if (isAfterUniform) {
            completions = this.getTypeCompletions();
        }
        // 提供 hint 提示
        else if (isAfterColon) {
            completions = this.getHintCompletions();
        }
        // 提供 void 后的函数名提示
        else if (isAfterVoid) {
            completions = this.getShaderFunctionCompletions(shaderType);
        }
        // 提供类型和关键字提示
        else if (/^\s*$/.test(textBeforeCursor) || /\s$/.test(textBeforeCursor)) {
            completions = this.getTypeAndKeywordCompletions();
        }
        // 提供内置变量、矩阵和常量提示
        else {
            completions = this.getAllCompletions();
        }
        
        return completions;
    }
    
    // 检查是否在 render_mode 上下文中（在 render_mode 关键字后，分号前）
    private isInRenderModeContext(document: vscode.TextDocument, position: vscode.Position): boolean {
        const lineText = document.lineAt(position.line).text;
        const textBeforeCursor = lineText.substring(0, position.character);
        
        // 查找光标前最后一个 render_mode 关键字
        const lastRenderModeIndex = textBeforeCursor.lastIndexOf('render_mode');
        if (lastRenderModeIndex === -1) {
            return false;
        }
        
        // 检查 render_mode 后是否有分号（表示语句已结束）
        const textAfterRenderMode = textBeforeCursor.substring(lastRenderModeIndex);
        return !textAfterRenderMode.includes(';');
    }

    // 检查是否在 stencil_mode 上下文中（在 stencil_mode 关键字后，分号前）
    private isInStencilModeContext(document: vscode.TextDocument, position: vscode.Position): boolean {
        const lineText = document.lineAt(position.line).text;
        const textBeforeCursor = lineText.substring(0, position.character);
        
        const lastStencilModeIndex = textBeforeCursor.lastIndexOf('stencil_mode');
        if (lastStencilModeIndex === -1) {
            return false;
        }
        
        const textAfterStencilMode = textBeforeCursor.substring(lastStencilModeIndex);
        return !textAfterStencilMode.includes(';');
    }
    
    // 检查是否在关键字（uniform/varying/in/out/const）后的上下文中
    private isAfterKeywordContext(document: vscode.TextDocument, position: vscode.Position, keywords: string[]): boolean {
        const lineText = document.lineAt(position.line).text;
        const textBeforeCursor = lineText.substring(0, position.character);
        const trimmed = textBeforeCursor.trim();
        
        for (const keyword of keywords) {
            // 情况 1: 行首就是关键字（后面可能没有空格）
            if (trimmed === keyword) {
                return true;
            }
            
            // 情况 2: 关键字后面有空格
            if (new RegExp(keyword + '\\s+$').test(textBeforeCursor)) {
                return true;
            }
        }
        
        return false;
    }
    
    // #include 路径补全 — 扫描工作区 .gdshaderinc 文件
    private async getIncludePathCompletions(document: vscode.TextDocument): Promise<vscode.CompletionItem[]> {
        const items: vscode.CompletionItem[] = [];
        // 从当前行提取用户已输入的路径前缀（而非全文匹配，避免多 #include 时错位）
        const activeEditor = vscode.window.activeTextEditor;
        let typedPrefix = '';
        if (activeEditor && activeEditor.document === document) {
            const lineText = activeEditor.document.lineAt(activeEditor.selection.active.line).text;
            const prefixMatch = lineText.match(/#include\s+"([^"]*)$/);
            typedPrefix = prefixMatch ? prefixMatch[1] : '';
        }

        try {
            const files = await vscode.workspace.findFiles('**/*.gdshaderinc', '**/node_modules/**', 50);
            const currentDir = vscode.Uri.joinPath(document.uri, '..');
            
            for (const file of files) {
                // 计算相对路径
                let relativePath = vscode.workspace.asRelativePath(file, false);
                const filePath = file.fsPath;
                const dirPath = currentDir.fsPath;
                if (filePath.startsWith(dirPath)) {
                    relativePath = filePath.substring(dirPath.length + 1);
                }

                // 前缀匹配过滤
                if (typedPrefix && !relativePath.startsWith(typedPrefix)) {
                    continue;
                }
                
                const item = new vscode.CompletionItem(relativePath, vscode.CompletionItemKind.File);
                item.detail = t('include.gdshaderinc');
                item.sortText = '0' + relativePath;
                // 替换用户已输入的引号内内容
                if (typedPrefix) {
                    item.filterText = typedPrefix + relativePath.substring(typedPrefix.length);
                }
                items.push(item);
            }

            // 也支持 .gdshader 文件作为 include 目标
            if (typedPrefix.length === 0 || typedPrefix.includes('.gdshader')) {
                const shaderFiles = await vscode.workspace.findFiles('**/*.gdshader', '**/node_modules/**', 50);
                for (const file of shaderFiles) {
                    if (file.fsPath === document.uri.fsPath) continue; // 排除自身
                    let relativePath = vscode.workspace.asRelativePath(file, false);
                    const dirPath = currentDir.fsPath;
                    if (file.fsPath.startsWith(dirPath)) {
                        relativePath = file.fsPath.substring(dirPath.length + 1);
                    }
                    if (typedPrefix && !relativePath.startsWith(typedPrefix)) continue;

                    const item = new vscode.CompletionItem(relativePath, vscode.CompletionItemKind.File);
                    item.detail = t('include.gdshader');
                    item.sortText = '1' + relativePath;
                    items.push(item);
                }
            }
        } catch {
            // 文件搜索失败时返回空列表
        }
        return items;
    }

    // 预处理器指令补全（#ifdef / #ifndef / #define / #include 等）
    private getPreprocessorCompletions(document: vscode.TextDocument): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        const preprocessorDirectives = [
            { name: 'ifdef', snippet: '#ifdef ${1:FLAG}\n$0\n#endif', desc: '条件编译：如果定义了宏' },
            { name: 'ifndef', snippet: '#ifndef ${1:FLAG}\n$0\n#endif', desc: '条件编译：如果未定义宏' },
            { name: 'define', snippet: '#define ${1:MACRO} ${2:value}', desc: '定义宏' },
            { name: 'undef', snippet: '#undef ${1:MACRO}', desc: '取消宏定义' },
            { name: 'include', snippet: '#include "${1:file.gdshaderinc}"', desc: '包含外部着色器文件' },
            { name: 'if', snippet: '#if ${1:condition}\n$0\n#endif', desc: '条件编译：表达式判断' },
            { name: 'else', snippet: '#else', desc: '条件编译：否则分支' },
            { name: 'elif', snippet: '#elif ${1:condition}', desc: '条件编译：否则如果' },
            { name: 'endif', snippet: '#endif', desc: '条件编译：结束' },
            { name: 'pragma', snippet: '#pragma ${1:directive}', desc: '编译指示' },
        ];

        for (const directive of preprocessorDirectives) {
            const item = new vscode.CompletionItem('#' + directive.name, vscode.CompletionItemKind.Keyword);
            item.detail = `Preprocessor: #${directive.name}`;
            item.documentation = new vscode.MarkdownString(`**#${directive.name}**\n\n${directive.desc}`);
            item.insertText = new vscode.SnippetString(directive.snippet);
            item.sortText = '10' + directive.name;
            items.push(item);
        }

        return items;
    }
    
    private getShaderTypeCompletions(): vscode.CompletionItem[] {
        const lang = getLang();
        if (cachedShaderTypeCompletions && cachedShaderTypeCompletions.lang === lang) {
            return cachedShaderTypeCompletions.items;
        }
        const items: vscode.CompletionItem[] = [];
        const shaderTypes = Object.keys(GODOT_SHADER_TYPE_DESCRIPTIONS);
        for (const type of shaderTypes) {
            const item = new vscode.CompletionItem(type, vscode.CompletionItemKind.Enum);
            const info = GODOT_SHADER_TYPE_DESCRIPTIONS[type];
            item.detail = `${info.category}: ${type}`;
            item.documentation = new vscode.MarkdownString(`## ${type}\n\n${td(type, info.desc)}\n\n**Usage:** \`shader_type ${type};\``);
            items.push(item);
        }
        cachedShaderTypeCompletions = { lang, items };
        return items;
    }
    
    private getRenderModeCompletions(shaderType: string): vscode.CompletionItem[] {
        const cached = cachedRenderModeCompletions.get(shaderType);
        if (cached) return cached;

        const modes = GODOT_SHADER_RENDER_MODES[shaderType] || GODOT_SHADER_RENDER_MODES['canvas_item'];
        
        const items = modes.map(mode => {
            const item = new vscode.CompletionItem(mode, vscode.CompletionItemKind.Enum);
            const info = GODOT_SHADER_RENDER_MODE_DESCRIPTIONS[mode];
            if (info) {
                item.detail = `${info.detail}: ${mode}`;
                item.documentation = new vscode.MarkdownString(`**${mode}**\n\n${td(mode, info.desc)}`);
            } else {
                item.detail = `Render mode: ${mode}`;
                item.documentation = new vscode.MarkdownString(`**${mode}**\n\nRender mode option for \`${shaderType}\` shader.`);
            }
            return item;
        });
        cachedRenderModeCompletions.set(shaderType, items);
        return items;
    }
    
    private getStencilModeCompletions(shaderType: string): vscode.CompletionItem[] {
        const cached = cachedStencilModeCompletions.get(shaderType);
        if (cached) return cached;

        const modes = GODOT_SHADER_STENCIL_MODES[shaderType] || [];
        
        const items = modes.map(mode => {
            const item = new vscode.CompletionItem(mode, vscode.CompletionItemKind.Enum);
            const info = GODOT_SHADER_STENCIL_MODE_DESCRIPTIONS[mode];
            if (info) {
                item.detail = `${info.detail}: ${mode}`;
                item.documentation = new vscode.MarkdownString(`**${mode}**\n\n${td(mode, info.desc)}`);
            } else {
                item.detail = `Stencil mode: ${mode}`;
                item.documentation = new vscode.MarkdownString(`**${mode}**\n\nStencil mode option for \`${shaderType}\` shader.`);
            }
            return item;
        });
        cachedStencilModeCompletions.set(shaderType, items);
        return items;
    }
    
    private getTypeCompletions(): vscode.CompletionItem[] {
        const lang = getLang();
        if (cachedTypeCompletions && cachedTypeCompletions.lang === lang) {
            return cachedTypeCompletions.items;
        }
        const items: vscode.CompletionItem[] = [];
        const types = GODOT_SHADER_TYPES;
        for (const type of types) {
            const item = new vscode.CompletionItem(type, vscode.CompletionItemKind.Keyword);
            const info = GODOT_SHADER_TYPE_INFO[type];
            if (info) {
                item.detail = `${info.category}: ${type}`;
                const hasUniformSuffix = ['sampler2D', 'samplerCube', 'sampler2DArray'].includes(type);
                item.documentation = new vscode.MarkdownString(
                    `## ${type}\n\n**Category:** ${info.category}\n\n**Description:** ${td(type, info.desc)}` +
                    (hasUniformSuffix ? `\n\n*${t('uniform_only')}*` : '')
                );
            } else {
                item.detail = `Type: ${type}`;
            }
            items.push(item);
        }
        cachedTypeCompletions = { lang, items };
        return items;
    }
    
    private getHintCompletions(): vscode.CompletionItem[] {
        const lang = getLang();
        if (cachedHintCompletions && cachedHintCompletions.lang === lang) {
            return cachedHintCompletions.items;
        }
        const items = GODOT_SHADER_HINTS.map(hint => {
            const item = new vscode.CompletionItem(hint, vscode.CompletionItemKind.Property);
            const info = GODOT_SHADER_HINT_INFO[hint];
            if (info) {
                item.detail = `${info.category}: ${hint}`;
                item.documentation = new vscode.MarkdownString(`**${hint}**\n\n${td(hint, info.desc)}`);
            } else {
                item.detail = `Godot Shader hint: ${hint}`;
            }
            return item;
        });
        cachedHintCompletions = { lang, items };
        return items;
    }
    
    // 提供 void 后的着色器函数名提示
    private getShaderFunctionCompletions(shaderType: string): vscode.CompletionItem[] {
        const cached = cachedShaderFuncCompletions.get(shaderType);
        if (cached) return cached;

        // 根据 shader_type 显示可用的函数
        const availableFunctions: {[key: string]: string[]} = {
            'canvas_item': ['fragment', 'vertex'],
            'fog': ['fog'],
            'particles': ['fragment', 'vertex'],
            'sky': ['sky'],
            'spatial': ['fragment', 'light', 'vertex']
        };
        
        const funcs = availableFunctions[shaderType] || ['fragment', 'vertex'];
        const zhDesc: {[key: string]: string} = {
            'vertex': '顶点着色器函数 - 处理顶点位置和属性',
            'fragment': '片段着色器函数 - 计算每个像素的颜色',
            'light': '光照着色器函数 - 自定义光照计算（仅 spatial）',
            'sky': '天空着色器函数 - 渲染程序化天空',
            'fog': '雾效着色器函数 - 体积雾效果'
        };
        const enDesc: {[key: string]: string} = {
            'vertex': 'Vertex shader function - processes vertex position and attributes',
            'fragment': 'Fragment shader function - computes the color for each pixel',
            'light': 'Light shader function - custom lighting calculations (spatial only)',
            'sky': 'Sky shader function - renders procedural sky',
            'fog': 'Fog shader function - volumetric fog effects'
        };
        
        const items = funcs.map(func => {
            const item = new vscode.CompletionItem(func, vscode.CompletionItemKind.Function);
            const desc = getLanguage() === 'en' ? (enDesc[func] || '') : (zhDesc[func] || '');
            const sig = `void ${func}()`;
            item.detail = sig;
            item.documentation = new vscode.MarkdownString(`## ${func}()\n\n${desc}`);
            return item;
        });
        cachedShaderFuncCompletions.set(shaderType, items);
        return items;
    }
    
    private getTypeAndKeywordCompletions(): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        
        // 添加类型
        GODOT_SHADER_TYPES.forEach(type => {
            const item = new vscode.CompletionItem(type, vscode.CompletionItemKind.Keyword);
            item.detail = `Type: ${type}`;
            items.push(item);
        });
        
        // 添加关键字
        GODOT_SHADER_KEYWORDS.forEach(keyword => {
            const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
            item.detail = `Keyword: ${keyword}`;
            items.push(item);
        });
        
        return items;
    }
    
    // 通用辅助：将预去重的主列表一次性转为 CompletionItem
    private addBuiltinCompletionsFast(items: vscode.CompletionItem[]) {
        // 高优先级变量名
        const highPriority = new Set([
            'COLOR', 'UV', 'TIME', 'PI', 'TAU', 'E',
            'ALBEDO', 'TEXTURE', 'NORMAL', 'SCREEN_UV',
            'VERTEX', 'ALPHA', 'METALLIC', 'ROUGHNESS',
            'EMISSION', 'VIEW', 'DEPTH', 'FRAGCOORD'
        ]);
        const midPriority = new Set([
            'UV2', 'TANGENT', 'BINORMAL', 'AO', 'SPECULAR',
            'RIM', 'SSS_STRENGTH', 'CLEARCOAT', 'BACKLIGHT',
            'LIGHT', 'POINT_SIZE', 'POINT_COORD', 'MODEL_MATRIX',
            'VIEW_MATRIX', 'PROJECTION_MATRIX', 'CAMERA_POSITION_WORLD'
        ]);

        // 一次遍历预去重的主列表（~250 项），而非 17 次分类遍历
        for (const b of GODOT_SHADER_BUILTINS_MASTER) {
            const item = new vscode.CompletionItem(b.name, vscode.CompletionItemKind.Variable);
            item.detail = `${b.type} - ${td(b.name, b.description)}`;
            const scope = getVariableShaderTypes(b.name);
            const sep = t('separator');
            const scopeText = scope ? `\n\n**${t('available_in')}:** ${[...scope].sort().join(sep)}` : '';
            item.documentation = new vscode.MarkdownString(
                `**${b.name}**\n\nType: \`${b.type}\`\n\n${td(b.name, b.description)}${scopeText}`
            );
            // 设置排序优先级
            if (highPriority.has(b.name)) {
                item.sortText = '30' + b.name;
            } else if (midPriority.has(b.name)) {
                item.sortText = '31' + b.name;
            } else {
                item.sortText = '32' + b.name;
            }
            items.push(item);
        }
    }
    
    private getAllCompletions(): vscode.CompletionItem[] {
        const lang = getLang();
        if (cachedAllCompletions && cachedAllCompletions.lang === lang) {
            return cachedAllCompletions.items;
        }

        const items: vscode.CompletionItem[] = [];
        
        // 添加所有内置变量（一次遍历预去重主列表）
        this.addBuiltinCompletionsFast(items);
        
        // 添加内置函数
        GODOT_SHADER_FUNCTIONS.forEach(func => {
            const item = new vscode.CompletionItem(func.name, vscode.CompletionItemKind.Function);
            item.detail = func.signature;
            item.documentation = new vscode.MarkdownString(`**${func.name}()**\n\n\`${func.signature}\`\n\n${td(func.name, func.description)}`);
            item.insertText = new vscode.SnippetString(`${func.name}(${this.getFunctionSnippet(func.signature)})`);
            items.push(item);
        });
        
        // 添加类型
        GODOT_SHADER_TYPES.forEach(type => {
            const item = new vscode.CompletionItem(type, vscode.CompletionItemKind.Keyword);
            item.detail = `Type: ${type}`;
            items.push(item);
        });
        
        // 添加关键字
        GODOT_SHADER_KEYWORDS.forEach(keyword => {
            const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
            item.detail = `Keyword: ${keyword}`;
            items.push(item);
        });

        cachedAllCompletions = { lang, items };
        return items;
    }
    
    private getFunctionSnippet(signature: string): string {
        // 从函数签名中提取参数
        const match = signature.match(/\(([^)]*)\)/);
        if (!match || !match[1]) {
            return '';
        }
        
        const params = match[1].split(',').map(p => p.trim());
        let snippet = '';
        
        for (let i = 0; i < params.length; i++) {
            if (i > 0) {
                snippet += ', ';
            }
            snippet += `\${${i + 1}:${params[i].split(' ').pop()}}`;
        }
        
        return snippet;
    }
}
