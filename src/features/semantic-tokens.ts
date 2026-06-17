import * as vscode from 'vscode';
import { GODOT_SHADER_BUILTINS, GODOT_SHADER_TYPES, GODOT_SHADER_KEYWORDS, GODOT_SHADER_HINTS, GODOT_SHADER_STENCIL_MODES } from '../shader-data';

// 语义令牌类型定义
const tokenTypes = [
    'variable',     // 用户变量
    'property',     // 内置变量（COLOR, UV 等）
    'function',     // 函数
    'keyword',      // 关键字
    'type',         // 类型（float, vec3 等）
    'parameter',    // 参数
    'modifier'      // uniform hint 值（source_color, filter_linear 等）
];

const tokenModifiers = [
    'declaration',  // 声明
    'readonly',     // 只读
    'static'        // 静态
];

const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);

// 编译时构建内置变量集合
const builtinSet = new Set<string>();
for (const category of Object.keys(GODOT_SHADER_BUILTINS)) {
    const vars = GODOT_SHADER_BUILTINS[category];
    if (Array.isArray(vars)) {
        vars.forEach((v: {name: string}) => builtinSet.add(v.name));
    }
}

const typeSet = new Set(GODOT_SHADER_TYPES);
const keywordSet = new Set(GODOT_SHADER_KEYWORDS);
// true/false 是 Godot Shader 布尔字面量，按关键字着色
keywordSet.add('true').add('false');
const hintsSet = new Set(GODOT_SHADER_HINTS);

// stencil_mode 值集合（含简写版）
const stencilSet = new Set<string>();
for (const modes of Object.values(GODOT_SHADER_STENCIL_MODES)) {
    for (const m of modes) stencilSet.add(m);
}

// 修饰符位掩码
const MOD_DECLARATION = 1 << tokenModifiers.indexOf('declaration');
const MOD_READONLY = 1 << tokenModifiers.indexOf('readonly');

export class GodotShaderSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {

    public provideDocumentSemanticTokens(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.SemanticTokens> {
        const tokensBuilder = new vscode.SemanticTokensBuilder(legend);

        // 预扫描：找出 #if 0 / #ifdef NEVER 等禁用的块范围
        const disabledRanges = this.findDisabledRanges(document);

        for (let line = 0; line < document.lineCount; line++) {
            const text = document.lineAt(line).text;
            const trimmed = text.trim();

            // 跳过注释行
            if (trimmed.startsWith('//') || trimmed.startsWith('/*') || 
                trimmed.startsWith('*')) {
                continue;
            }

            // #if 0 禁用的块：所有内容标记为 comment 样式（灰显）
            const isInDisabledBlock = this.isInDisabledRange(line, disabledRanges);
            if (isInDisabledBlock) {
                // 灰显块内的预处理指令和关键字
                for (const r of disabledRanges) {
                    if (line >= r.start && line <= r.end) {
                        // 为整行添加 comment 令牌
                        tokensBuilder.push(line, 0, text.length, -1, 0); // -1 = no token type (keeps default)
                        break;
                    }
                }
                continue;
            }

            // 跳过预处理（非禁用块内的预处理正常着色）
            if (trimmed.startsWith('//') || trimmed.startsWith('/*') || 
                trimmed.startsWith('*') || trimmed.startsWith('#')) {
                continue;
            }

            // 查找所有单词
            const wordRegex = /\b([a-zA-Z_]\w*)\b/g;
            let match: RegExpExecArray | null;

            while ((match = wordRegex.exec(text)) !== null) {
                const word = match[1];
                const start = match.index;
                const length = word.length;

                // 跳过普通数字和短名称
                if (/^\d/.test(word) || word.length <= 1) continue;

                // 判断单词类型
                const classified = this.classifyToken(word, text, start, line);

                if (classified) {
                    tokensBuilder.push(line, start, length, classified.tokenType, classified.tokenModifiers);
                }
            }
        }

        return tokensBuilder.build();
    }

    private classifyToken(word: string, lineText: string, pos: number, lineNum: number): { tokenType: number; tokenModifiers: number } | null {
        const upperWord = word.toUpperCase();
        let modifiers = 0;

        // 判断是否位于声明上下文中
        const beforeWord = lineText.substring(0, pos).trim();
        const isDeclaration = /^(uniform|varying|in|out|const)\s+/.test(beforeWord + ' ');
        if (isDeclaration) {
            modifiers |= MOD_DECLARATION;
        }

        // 1. 关键字
        if (keywordSet.has(word) || keywordSet.has(word.toLowerCase())) {
            return { tokenType: 3, tokenModifiers: modifiers }; // keyword
        }

        // 2. 类型名
        if (typeSet.has(word)) {
            return { tokenType: 4, tokenModifiers: modifiers }; // type
        }

        // 2b. Uniform hint 值: source_color, filter_linear, hint_range 等
        // 仅在 : 后出现时高亮，排除三元运算符 ? : 和 case 标签
        if (hintsSet.has(word)) {
            const textBefore = lineText.substring(0, pos);
            const colonIdx = textBefore.lastIndexOf(':');
            if (colonIdx >= 0) {
                const beforeColon = textBefore.substring(0, colonIdx).trimEnd();
                if (!beforeColon.endsWith('?') && !/case\s*$/.test(beforeColon)) {
                    return { tokenType: 6, tokenModifiers: modifiers }; // modifier
                }
            }
        }

        // 2c. stencil_mode 值（含简写 always / equal / greater 等）
        // 仅在 stencil_mode 声明行内高亮
        if (stencilSet.has(word) && lineText.includes('stencil_mode')) {
            return { tokenType: 6, tokenModifiers: modifiers }; // modifier
        }

        // 3. 全大写 = 内置变量
        if (word === word.toUpperCase() && builtinSet.has(word)) {
            return { tokenType: 1, tokenModifiers: modifiers }; // property (内置变量)
        }

        // 4. 函数定义/调用
        const nextChar = lineText.substring(pos + word.length).trimStart()[0];
        if (nextChar === '(') {
            return { tokenType: 2, tokenModifiers: modifiers }; // function
        }

        // 5. 检查是否在声明行 — 变量名
        if (isDeclaration) {
            const beforeWithWord = beforeWord + ' ' + word;
            const parts = beforeWithWord.split(/\s+/);
            if (parts.length >= 2) {
                const secondLast = parts[parts.length - 2];
                // 如果倒数第二个是类型，当前就是变量名
                if (builtinSet.has(secondLast) || typeSet.has(secondLast)) {
                    // uniform 变量标记为 readonly
                    if (/^uniform\s/.test(beforeWord + ' ')) {
                        modifiers |= MOD_READONLY;
                    }
                    return { tokenType: 0, tokenModifiers: modifiers }; // variable (declaration)
                }
            }
        }

        // 6. 其他大写词倾向于是内置变量
        if (word === word.toUpperCase() && word.length > 2) {
            return { tokenType: 1, tokenModifiers: modifiers }; // property
        }

        return { tokenType: 0, tokenModifiers: modifiers }; // variable (默认)
    }

    /**
     * 扫描文档中 #if 0 / #ifdef NEVER_DEFINED 等禁用的代码块
     * 返回禁用行范围列表
     */
    private findDisabledRanges(document: vscode.TextDocument): Array<{ start: number; end: number }> {
        const ranges: Array<{ start: number; end: number }> = [];
        const stack: Array<{ start: number; disabled: boolean; hasElse: boolean }> = [];

        for (let i = 0; i < document.lineCount; i++) {
            const text = document.lineAt(i).text.trim();

            const ifMatch = text.match(/^#(ifdef|ifndef|if)\s+(.+)/);
            const elseMatch = text.match(/^#else\b/);
            const endifMatch = text.match(/^#endif\b/);

            if (ifMatch) {
                const directive = ifMatch[1];
                const condition = ifMatch[2].trim();
                // 判断是否明确禁用: #if 0 或 #ifdef 不太可能定义的宏
                const isDisabled = (directive === 'if' && (condition === '0' || condition === 'false')) ||
                                   (directive === 'ifdef' && condition.includes('NEVER')) ||
                                   (directive === 'ifndef' && condition === '1');
                stack.push({ start: i, disabled: isDisabled, hasElse: false });
            } else if (elseMatch && stack.length > 0) {
                const top = stack[stack.length - 1];
                if (top.disabled && !top.hasElse) {
                    // #else 开始，之前禁用的块现在结束，新块激活
                    ranges.push({ start: top.start, end: i - 1 });
                    top.disabled = false;
                } else if (!top.disabled && !top.hasElse) {
                    // 之前激活，#else 开始新禁用块
                    top.disabled = true;
                    top.start = i + 1;
                }
                top.hasElse = true;
            } else if (endifMatch && stack.length > 0) {
                const top = stack.pop()!;
                if (top.disabled) {
                    ranges.push({ start: top.start, end: i });
                }
            }
        }

        return ranges;
    }

    private isInDisabledRange(line: number, ranges: Array<{ start: number; end: number }>): boolean {
        // start 是 #if 行，end 是 #else 或 #endif 行
        // 灰显中间的行（不包含指令行本身）
        return ranges.some(r => line > r.start && line < r.end);
    }
}

export function getSemanticTokensLegend(): vscode.SemanticTokensLegend {
    return legend;
}
