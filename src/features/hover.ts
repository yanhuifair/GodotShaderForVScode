import * as vscode from 'vscode';
import { 
    GODOT_SHADER_BUILTINS, 
    GODOT_SHADER_FUNCTIONS,
    GODOT_SHADER_FUNCTION_RETURNS,
    GODOT_SHADER_TYPE_DESCRIPTIONS,
    GODOT_SHADER_RENDER_MODE_DESCRIPTIONS,
    GODOT_SHADER_RENDER_MODES,
    GODOT_SHADER_STENCIL_MODE_DESCRIPTIONS,
    GODOT_SHADER_STENCIL_MODES,
    GODOT_SHADER_HINT_INFO,
    GODOT_SHADER_TYPE_INFO,
    GODOT_SHADER_KEYWORD_INFO,
    getVariableShaderTypes
} from '../shader-data';
import { t, td, getLang } from '../i18n';
import { getShaderType } from '../utils';

// 预构建内置变量 name→entry 映射（O(1) 查找）
const BUILTIN_MAP: Map<string, { name: string; type: string; description: string }> = new Map();
for (const category of Object.values(GODOT_SHADER_BUILTINS)) {
    if (Array.isArray(category)) {
        for (const entry of category) {
            if (!BUILTIN_MAP.has(entry.name)) {
                BUILTIN_MAP.set(entry.name, entry);
            }
        }
    }
}

// 预构建内置函数 name→entry 映射（O(1) 查找，替代 Array.find）
const FUNCTION_MAP: Map<string, { name: string; signature: string; description: string }> = new Map();
for (const func of GODOT_SHADER_FUNCTIONS) {
    FUNCTION_MAP.set(func.name, func);
}

// 函数示例代码（hover 时展示用法）
const FUNCTION_EXAMPLES: Record<string, string> = {
    'mix': 'mix(color1, color2, 0.5)',
    'clamp': 'clamp(value, 0.0, 1.0)',
    'smoothstep': 'smoothstep(0.0, 1.0, value)',
    'step': 'step(0.5, value)',
    'dot': 'dot(normal, light_dir)',
    'cross': 'cross(up, forward)',
    'normalize': 'normalize(vector)',
    'length': 'length(vector)',
    'distance': 'distance(a, b)',
    'reflect': 'reflect(incident, normal)',
    'refract': 'refract(I, N, 0.5)',
    'pow': 'pow(base, exponent)',
    'sqrt': 'sqrt(value)',
    'abs': 'abs(value)',
    'floor': 'floor(value)',
    'ceil': 'ceil(value)',
    'fract': 'fract(value)',
    'mod': 'mod(a, b)',
    'min': 'min(a, b)',
    'max': 'max(a, b)',
    'sin': 'sin(TIME)',
    'cos': 'cos(TIME)',
    'tan': 'tan(angle)',
    'atan': 'atan(y, x)',
    'exp': 'exp(value)',
    'log': 'log(value)',
    'texture': 'texture(tex, UV)',
    'textureLod': 'textureLod(tex, UV, 2.0)',
    'dfdx': 'dfdx(UV)',
    'dfdy': 'dfdy(UV)',
    'fwidth': 'fwidth(value)',
    'noise': 'noise(UV * 10.0)',
    'determinant': 'determinant(mat)',
    'inverse': 'inverse(mat)',
    'transpose': 'transpose(mat)',
};

// 文档级用户变量缓存（per-document URI）
const userVarCache = new Map<string, Array<{ keyword: string; type: string; name: string; line: number }>>();

// 文档关闭或修改时清理缓存
vscode.workspace.onDidCloseTextDocument((doc) => {
    if (doc.languageId === 'godot-shader') {
        userVarCache.delete(doc.uri.toString());
    }
});

vscode.workspace.onDidChangeTextDocument((e) => {
    if (e.document.languageId === 'godot-shader') {
        userVarCache.delete(e.document.uri.toString());
    }
});

// 构建文档的用户变量缓存
function buildUserVarCache(document: vscode.TextDocument): void {
    const declRegex = /^(uniform|varying|in|out|const)\s+(\w+)\s+(\w+)/;
    const vars: Array<{ keyword: string; type: string; name: string; line: number }> = [];
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i).text.trim();
        const match = line.match(declRegex);
        if (match) {
            vars.push({ keyword: match[1], type: match[2], name: match[3], line: i });
        }
    }
    userVarCache.set(document.uri.toString(), vars);
}

// 获取文档的用户变量缓存（按需重建）
function getUserVarCache(document: vscode.TextDocument): Array<{ keyword: string; type: string; name: string; line: number }> {
    const key = document.uri.toString();
    if (!userVarCache.has(key)) {
        buildUserVarCache(document);
    }
    return userVarCache.get(key)!;
}

export class GodotShaderHoverProvider implements vscode.HoverProvider {
    
    public provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            return null;
        }
        
        const word = document.getText(range);
        const lineText = document.lineAt(position.line).text;
        const textBeforeWord = lineText.substring(0, range.start.character).trim();
        
        // 检查是否在 shader_type 上下文中
        if (word === 'shader_type' || textBeforeWord.endsWith('shader_type')) {
            if (word === 'shader_type') {
                // 悬停在 shader_type 关键字本身上 → 列出所有可行的值
                const shaderFuncMap: Record<string, string[]> = {
                    'canvas_item': ['fragment', 'vertex'],
                    'fog': ['fog'],
                    'particles': ['fragment', 'vertex'],
                    'sky': ['sky'],
                    'spatial': ['fragment', 'light', 'vertex']
                };
                const markdown = new vscode.MarkdownString();
                markdown.appendMarkdown(`## shader_type\n\n`);
                markdown.appendMarkdown(`**${t('description')}:** ${td('shader_type', '声明着色器类型。必须为文件中的第一行。')}\n\n`);
                markdown.appendMarkdown(`---\n\n`);
                markdown.appendMarkdown(`**${t('valid_values')}:**\n\n`);
                for (const [typeName, info] of Object.entries(GODOT_SHADER_TYPE_DESCRIPTIONS)) {
                    const funcs = shaderFuncMap[typeName] || [];
                    const funcStr = funcs.map(f => `\`${f}()\``).join(', ');
                    markdown.appendMarkdown(`- \`${typeName}\` — ${td(typeName, info.desc)}\n`);
                    markdown.appendMarkdown(`  ${t('available_functions')}: ${funcStr}\n`);
                }
                return new vscode.Hover(markdown, range);
            } else {
                const shaderTypeDesc = this.getShaderTypeDescription(word);
                if (shaderTypeDesc) {
                    const markdown = new vscode.MarkdownString();
                    markdown.appendMarkdown(`## shader_type ${word}\n\n`);
                    markdown.appendMarkdown(`**${t('group')}:** ${shaderTypeDesc.category}\n\n`);
                    markdown.appendMarkdown(`**${t('description')}:** ${td(word, shaderTypeDesc.desc)}`);
                    return new vscode.Hover(markdown, range);
                }
            }
        }
        
        // 检查是否在 render_mode 上下文中
        // 使用 textBeforeWord 确保 render_mode 在当前单词之前，而非行内任意位置
        if (word === 'render_mode' || textBeforeWord.includes('render_mode')) {
            if (word === 'render_mode') {
                // 悬停在 render_mode 关键字本身上 → 列出当前 shader_type 可行的所有值
                const shaderType = getShaderType(document);
                const validModes = shaderType ? GODOT_SHADER_RENDER_MODES[shaderType] : null;
                const markdown = new vscode.MarkdownString();
                markdown.appendMarkdown(`## render_mode\n\n`);
                markdown.appendMarkdown(`**${t('description')}:** ${td('render_mode', '设置渲染模式选项。可控制混合、剔除、光照等。')}`);
                if (validModes && validModes.length > 0) {
                    markdown.appendMarkdown(`\n\n---\n\n`);
                    markdown.appendMarkdown(`**${t('valid_in_prefix')} \`${shaderType || '?'}\`** — ${validModes.length} ${t('items')}\n\n`);
                    // 按固定顺序分组
                    const CATEGORY_ORDER = [
                        'Blend Mode', 'Depth', 'Culling', 'Shading', 'Shadows', 'Lighting',
                        'Diffuse Model', 'Specular Model', 'Fog', 'Vertex Transform', 'Particles',
                        'Alpha', 'SSS Mode', 'Sky', 'Debug', 'Canvas Item'
                    ];
                    const grouped: Record<string, string[]> = {};
                    for (const mode of validModes) {
                        const info = GODOT_SHADER_RENDER_MODE_DESCRIPTIONS[mode];
                        const cat = info ? info.detail : 'Other';
                        if (!grouped[cat]) grouped[cat] = [];
                        grouped[cat].push(mode);
                    }
                    // 按 CATEGORY_ORDER 输出，未知分类放末尾
                    for (const cat of CATEGORY_ORDER) {
                        const modes = grouped[cat];
                        if (!modes) continue;
                        markdown.appendMarkdown(`**${t('cat.' + cat)}** — ${modes.length}\n\n`);
                        for (const mode of modes) {
                            const info = GODOT_SHADER_RENDER_MODE_DESCRIPTIONS[mode];
                            const desc = info ? td(mode, info.desc) : '';
                            markdown.appendMarkdown(`- \`${mode}\` — ${desc}\n`);
                        }
                        markdown.appendMarkdown(`\n`);
                        delete grouped[cat];
                    }
                    // 剩余未知分类
                    for (const [cat, modes] of Object.entries(grouped)) {
                        markdown.appendMarkdown(`**${t('cat.' + cat)}**\n\n`);
                        for (const mode of modes) {
                            const info = GODOT_SHADER_RENDER_MODE_DESCRIPTIONS[mode];
                            const desc = info ? td(mode, info.desc) : '';
                            markdown.appendMarkdown(`- \`${mode}\` — ${desc}\n`);
                        }
                        markdown.appendMarkdown(`\n`);
                    }
                } else if (!shaderType) {
                    markdown.appendMarkdown(`\n\n> ${t('hint_declare_shader_type')}\n\n`);
                    // shader_type 未声明时列出所有类型的 render_mode
                    const allModes = new Set<string>();
                    for (const modes of Object.values(GODOT_SHADER_RENDER_MODES)) {
                        for (const mode of modes) allModes.add(mode);
                    }
                    markdown.appendMarkdown(`**${t('all_render_modes')}** (${allModes.size}):\n\n`);
                    for (const mode of allModes) {
                        markdown.appendMarkdown(`- \`${mode}\`\n`);
                    }
                }
                return new vscode.Hover(markdown, range);
            } else {
                // 悬停在 render_mode 值上
                const renderModeDesc = this.getRenderModeDescription(word);
                if (renderModeDesc) {
                    const markdown = new vscode.MarkdownString();
                    markdown.supportHtml = true;
                    markdown.appendMarkdown(`## render_mode \`${word}\`\n\n`);
                    markdown.appendMarkdown(`**${t('group')}:** ${renderModeDesc.detail}\n\n`);
                    markdown.appendMarkdown(`**${t('description')}:** ${td(word, renderModeDesc.desc)}`);
                    // 列出支持此 mode 的 shader_type
                    const supportedTypes: string[] = [];
                    for (const [st, modes] of Object.entries(GODOT_SHADER_RENDER_MODES)) {
                        if (modes.includes(word)) supportedTypes.push(st);
                    }
                    if (supportedTypes.length > 0) {
                        const shaderType = getShaderType(document);
                        const highlighted = supportedTypes.map(st =>
                            (shaderType && st === shaderType)
                                ? `<strong>\`${st}\`</strong>`
                                : `\`${st}\``
                        );
                        markdown.appendMarkdown(`\n\n**${t('valid_in_prefix')}:** ${highlighted.join(', ')}`);
                    }
                    return new vscode.Hover(markdown, range);
                }
            }
        }
        
        // 检查是否在 stencil_mode 上下文中
        if (word === 'stencil_mode' || textBeforeWord.includes('stencil_mode')) {
            if (word === 'stencil_mode') {
                const shaderType = getShaderType(document);
                const validModes = shaderType ? GODOT_SHADER_STENCIL_MODES[shaderType] : null;
                const markdown = new vscode.MarkdownString();
                markdown.appendMarkdown(`## stencil_mode\n\n`);
                markdown.appendMarkdown(`**${t('description')}:** ${td('stencil_mode', '设置模板缓冲区操作模式（实验性，仅 spatial）。格式: stencil_mode operation, compare, 参考值;')}`);
                markdown.appendMarkdown(`\n\n> ⚠️ ${t('experimental')}: stencil_mode ${td('experimental_stencil', '是实验性功能，API 可能在未来版本中变化')}`);
                if (validModes && validModes.length > 0) {
                    markdown.appendMarkdown(`\n\n---\n\n`);
                    markdown.appendMarkdown(`**${t('valid_in_prefix')} \`${shaderType}\`** — ${validModes.length} ${t('items')}\n\n`);
                    const STENCIL_ORDER = ['Operation', 'Compare'];
                    const grouped: Record<string, string[]> = {};
                    for (const mode of validModes) {
                        const info = GODOT_SHADER_STENCIL_MODE_DESCRIPTIONS[mode];
                        const cat = info ? info.detail : 'Other';
                        if (!grouped[cat]) grouped[cat] = [];
                        grouped[cat].push(mode);
                    }
                    for (const cat of STENCIL_ORDER) {
                        const modes = grouped[cat];
                        if (!modes) continue;
                        markdown.appendMarkdown(`**${t('cat.' + cat)}** — ${modes.length}\n\n`);
                        for (const mode of modes) {
                            const info = GODOT_SHADER_STENCIL_MODE_DESCRIPTIONS[mode];
                            const desc = info ? td(mode, info.desc) : '';
                            markdown.appendMarkdown(`- \`${mode}\` — ${desc}\n`);
                        }
                        markdown.appendMarkdown(`\n`);
                        delete grouped[cat];
                    }
                    for (const [cat, modes] of Object.entries(grouped)) {
                        markdown.appendMarkdown(`**${t('cat.' + cat)}**\n\n`);
                        for (const mode of modes) {
                            const info = GODOT_SHADER_STENCIL_MODE_DESCRIPTIONS[mode];
                            const desc = info ? td(mode, info.desc) : '';
                            markdown.appendMarkdown(`- \`${mode}\` — ${desc}\n`);
                        }
                        markdown.appendMarkdown(`\n`);
                    }
                } else {
                    markdown.appendMarkdown(`\n\n> ${t('hint_declare_shader_type')}\n\n`);
                    markdown.appendMarkdown(`\`stencil_mode\` ${t('only_available_in_spatial')}`);
                }
                return new vscode.Hover(markdown, range);
            } else {
                const stencilDesc = GODOT_SHADER_STENCIL_MODE_DESCRIPTIONS[word];
                if (stencilDesc) {
                    const markdown = new vscode.MarkdownString();
                    markdown.appendMarkdown(`## stencil_mode \`${word}\`\n\n`);
                    markdown.appendMarkdown(`**${t('group')}:** ${stencilDesc.detail}\n\n`);
                    markdown.appendMarkdown(`**${t('description')}:** ${td(word, stencilDesc.desc)}`);
                    return new vscode.Hover(markdown, range);
                }
            }
        }
        
        // 检查是否在 uniform hint 上下文中
        const hintDesc = this.getHintDescription(word);
        if (hintDesc) {
            const markdown = new vscode.MarkdownString();
            markdown.appendMarkdown(`## ${word}\n\n`);
            markdown.appendMarkdown(`**${t('group')}:** ${hintDesc.category}\n\n`);
            markdown.appendMarkdown(`**${t('description')}:** ${td(word, hintDesc.desc)}`);
            return new vscode.Hover(markdown, range);
        }
        
        // 检查是否为着色器函数关键词（显示函数签名）
        const SHADER_FUNCTION_SIGNATURES: Record<string, string> = {
            'vertex': 'void vertex()',
            'fragment': 'void fragment()',
            'light': 'void light()',
            'sky': 'void sky()',
            'fog': 'void fog()'
        };
        const SHADER_FUNCTION_TYPES: Record<string, string[]> = {
            'fragment': ['canvas_item', 'particles', 'spatial'],
            'light': ['spatial'],
            'sky': ['sky'],
            'fog': ['fog'],
            'vertex': ['canvas_item', 'particles', 'spatial']
        };
        const funcSignature = SHADER_FUNCTION_SIGNATURES[word];
        if (funcSignature) {
            const keywordDesc = this.getKeywordDescription(word);
            if (keywordDesc) {
                const shaderType = getShaderType(document);
                const validFor = SHADER_FUNCTION_TYPES[word] || [];
                const isCurrentlyValid = shaderType ? validFor.includes(shaderType) : true;
                const markdown = new vscode.MarkdownString(undefined, true);
                markdown.supportHtml = true;
                markdown.appendMarkdown(`## ${funcSignature}\n\n`);
                markdown.appendMarkdown(`**${t('description')}:** ${td(word, keywordDesc.desc)}`);
                if (validFor.length > 0) {
                    const highlighted = validFor.map(vf =>
                        (shaderType && vf === shaderType)
                            ? `<strong>\`${vf}\`</strong>`
                            : `\`${vf}\``
                    );
                    markdown.appendMarkdown(`\n\n**${t('valid_in_prefix')}:** ${highlighted.join(', ')}`);
                    if (!isCurrentlyValid && shaderType) {
                        markdown.appendMarkdown(`\n\n> ⚠️ ${t('not_available_in_current')}: \`${shaderType}\``);
                    }
                }
                return new vscode.Hover(markdown, range);
            }
        }
        
        // 检查是否为 Godot Shader 关键字
        const keywordDesc = this.getKeywordDescription(word);
        if (keywordDesc) {
            const markdown = new vscode.MarkdownString();
            markdown.appendMarkdown(`## ${word}\n\n`);
            markdown.appendMarkdown(`**${t('group')}:** ${keywordDesc.category}\n\n`);
            markdown.appendMarkdown(`**${t('description')}:** ${td(word, keywordDesc.desc)}`);
            return new vscode.Hover(markdown, range);
        }
        
        // 检查是否为 Godot Shader 类型
        const typeDesc = this.getTypeDescription(word);
        if (typeDesc) {
            const markdown = new vscode.MarkdownString();
            markdown.appendMarkdown(`## ${word}\n\n`);
            markdown.appendMarkdown(`**${t('group')}:** ${typeDesc.category}\n\n`);
            markdown.appendMarkdown(`**${t('description')}:** ${td(word, typeDesc.desc)}`);
            // sampler 类型附加 uniform-only 标注
            if (word.startsWith('sampler')) {
                markdown.appendMarkdown(`\n\n> **Note:** ${td('sampler_uniform_only', '只能在 uniform 声明中使用')}`);
            }
            return new vscode.Hover(markdown, range);
        }
        
        // 查找内置变量（自动遍历所有类别）
        const builtin = this.findBuiltin(word);
        if (builtin) {
            const markdown = new vscode.MarkdownString(undefined, true);
            markdown.supportHtml = true;
            markdown.appendMarkdown(`## ${builtin.name}\n\n`);
            markdown.appendMarkdown(`**${t('type_label')}:** \`${builtin.type}\`\n\n`);
            markdown.appendMarkdown(`**${t('description')}:** ${td(builtin.name, builtin.description)}`);
            const scope = getVariableShaderTypes(builtin.name);
            if (scope) {
                const sorted = [...scope].sort();
                const shaderType = getShaderType(document);
                const highlighted = sorted.map(st => {
                    const isCurrent = shaderType ? st === shaderType : false;
                    if (isCurrent) {
                        return `<strong>\`${st}\`</strong>`;
                    }
                    return `\`${st}\``;
                });
                markdown.appendMarkdown(`\n\n**${t('available_in')}:** ${highlighted.join(', ')}`);
                if (shaderType && !sorted.includes(shaderType)) {
                    markdown.appendMarkdown(`\n\n> ⚠️ ${t('not_available_in_current')}: \`${shaderType}\``);
                }
            }
            return new vscode.Hover(markdown, range);
        }
        
        // 查找内置函数
        const func = this.findFunction(word);
        if (func) {
            const markdown = new vscode.MarkdownString();
            markdown.appendMarkdown(`## ${func.name}()\n\n`);
            markdown.appendMarkdown(`**${t('signature')}:** \`${func.signature}\`\n\n`);
            markdown.appendMarkdown(`**${t('description')}:** ${td(func.name, func.description)}`);
            // 返回值范围
            const returns = GODOT_SHADER_FUNCTION_RETURNS[func.name];
            if (returns) {
                const retText = getLang() === 'zh' ? returns.zh : returns.en;
                markdown.appendMarkdown(`\n\n**${t('hover.returns')}:** ${retText}`);
            }
            // 附加示例代码（如果有）
            const example = FUNCTION_EXAMPLES[func.name];
            if (example) {
                markdown.appendMarkdown(`\n\n---\n\n`);
                markdown.appendMarkdown(`**${t('hover.example')}:** \`${example}\``);
            }
            return new vscode.Hover(markdown, range);
        }
        
        // 查找用户声明的 uniform/varying/in/out/const 变量
        const userVar = this.findUserVariable(document, word);
        if (userVar) {
            const markdown = new vscode.MarkdownString();
            markdown.appendMarkdown(`## ${userVar.name} (${userVar.keyword})\n\n`);
            markdown.appendMarkdown(`**${t('type_label')}:** \`${userVar.type}\`\n\n`);
            markdown.appendMarkdown(`**${t('description')}:** ${td('user_var_description', '用户声明的变量')}`);
            return new vscode.Hover(markdown, range);
        }
        
        return null;
    }
    
    // 通用内置变量查找（O(1) map 查找替代 O(n) 线性扫描）
    private findBuiltin(name: string): { name: string; type: string; description: string } | null {
        return BUILTIN_MAP.get(name) || null;
    }
    
    // 查找用户声明的 uniform/varying/in/out/const 变量（使用文档级缓存）
    private findUserVariable(document: vscode.TextDocument, name: string): { keyword: string; type: string; name: string } | null {
        const decls = getUserVarCache(document);
        const found = decls.find(d => d.name === name);
        return found ? { keyword: found.keyword, type: found.type, name: found.name } : null;
    }
    
    private findFunction(name: string): { name: string; signature: string; description: string } | null {
        return FUNCTION_MAP.get(name) || null;
    }
    
    // 获取 shader_type 描述
    private getShaderTypeDescription(type: string | null): { category: string, desc: string } | null {
        return type && GODOT_SHADER_TYPE_DESCRIPTIONS[type] ? GODOT_SHADER_TYPE_DESCRIPTIONS[type] : null;
    }
    
    // 获取 render_mode 描述
    private getRenderModeDescription(mode: string | null): { detail: string, desc: string } | null {
        return mode && GODOT_SHADER_RENDER_MODE_DESCRIPTIONS[mode] ? {
            detail: GODOT_SHADER_RENDER_MODE_DESCRIPTIONS[mode].detail,
            desc: GODOT_SHADER_RENDER_MODE_DESCRIPTIONS[mode].desc
        } : null;
    }
    
    // 获取 uniform hint 描述
    private getHintDescription(hint: string | null): { category: string, desc: string } | null {
        return hint && GODOT_SHADER_HINT_INFO[hint] ? {
            category: GODOT_SHADER_HINT_INFO[hint].category,
            desc: GODOT_SHADER_HINT_INFO[hint].desc
        } : null;
    }
    
    // 获取 Godot Shader 关键字描述
    private getKeywordDescription(keyword: string | null): { category: string, desc: string } | null {
        return keyword && GODOT_SHADER_KEYWORD_INFO[keyword] ? GODOT_SHADER_KEYWORD_INFO[keyword] : null;
    }
    
    // 获取 Godot Shader 类型描述
    private getTypeDescription(type: string | null): { category: string, desc: string } | null {
        return type && GODOT_SHADER_TYPE_INFO[type] ? GODOT_SHADER_TYPE_INFO[type] : null;
    }
}
