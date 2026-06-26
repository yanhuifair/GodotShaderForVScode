import * as vscode from 'vscode';

export class GodotShaderFormatter implements 
    vscode.DocumentFormattingEditProvider,
    vscode.DocumentRangeFormattingEditProvider {
    
    // 格式化整个文档
    public provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        const edits: vscode.TextEdit[] = [];
        const fullRange = new vscode.Range(
            0, 0,
            document.lineCount - 1,
            document.lineAt(document.lineCount - 1).text.length
        );
        
        const formattedText = this.formatDocument(document, options);
        edits.push(vscode.TextEdit.replace(fullRange, formattedText));
        
        return edits;
    }
    
    // 格式化文档范围
    public provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        const edits: vscode.TextEdit[] = [];
        const text = document.getText(range);
        const formattedText = this.formatText(text, options);
        edits.push(vscode.TextEdit.replace(range, formattedText));
        
        return edits;
    }
    
    // 格式化整个文档
    private formatDocument(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions
    ): string {
        const tabSize = options.tabSize;
        const indentChar = options.insertSpaces ? ' '.repeat(tabSize) : '\t';
        const braceNewLine = this.shouldBraceNewLine();
        const lines: string[] = [];
        let indentLevel = 0;
        const caseLevels: number[] = [0];
        let inBlockComment = false;
        // 无大括号的控制流语句（if/for/while/else）缩进计数
        let bracelessIndent = 0;
        // else 块的 body 消费后需额外回收其匹配 if 的一级缩进
        let elseConsumesExtra = false;
        
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const rawText = line.text;
            const text = rawText.trim();
            
            // 跳过空行
            if (text.length === 0) {
                lines.push('');
                continue;
            }
            
            // 预处理器指令不缩进（始终顶格）
            if (text.startsWith('#')) {
                lines.push(text);
                continue;
            }
            
            // 块注释保护：检测 /* 开始和 */ 结束，中间行全部保持原样
            const hasBlockStart = text.includes('/*');
            const hasBlockEnd = text.includes('*/');

            if (inBlockComment) {
                lines.push(rawText);
                if (hasBlockEnd) {
                    inBlockComment = false;
                }
                continue;
            }

            if (hasBlockStart) {
                lines.push(rawText);
                if (!hasBlockEnd || text.indexOf('/*') > text.indexOf('*/')) {
                    if (hasBlockEnd && text.lastIndexOf('*/') > text.indexOf('/*')) {
                        inBlockComment = false;
                    } else {
                        inBlockComment = true;
                    }
                }
                continue;
            }
            
            // 单行注释保持原样
            if (text.startsWith('//')) {
                lines.push(rawText);
                continue;
            }
            
            // 处理结束大括号
            if (text.startsWith('}')) {
                indentLevel = Math.max(0, indentLevel - 1);
                if (caseLevels.length > 1) caseLevels.pop();
                bracelessIndent = 0;  // } 关闭所有待处理的无大括号缩进
            }
            
            // case/default 标签使用 switch 块缩进，不额外缩进
            const isCaseLabel = /^(case\s|default\s*:)/.test(text);
            const currentCaseLevel = caseLevels[caseLevels.length - 1] || 0;

            // ---- 大括号另起一行逻辑 ----
            if (braceNewLine && text.endsWith('{') && text !== '{') {
                // 分离声明部分和大括号
                // 例如 "void fragment() {" → "void fragment()" + "{"
                const declPart = text.slice(0, -1).trimEnd();
                const effectiveIndent = isCaseLabel ? indentLevel : indentLevel + currentCaseLevel;

                if (declPart.length > 0) {
                    // 先输出声明行
                    lines.push(indentChar.repeat(effectiveIndent) + this.formatLine(declPart));
                }
                // 再输出 { 行（与声明行同缩进）
                lines.push(indentChar.repeat(effectiveIndent) + '{');

                // 大括号后的行缩进 +1
                indentLevel++;
                caseLevels.push(0);
                bracelessIndent = 0;  // 大括号接管缩进
                continue;
            }

            // 单独的大括号行（已另起一行的情况）
            if (braceNewLine && text === '{') {
                const effectiveIndent = isCaseLabel ? indentLevel : indentLevel + currentCaseLevel;
                lines.push(indentChar.repeat(effectiveIndent) + '{');
                indentLevel++;
                caseLevels.push(0);
                bracelessIndent = 0;  // 大括号接管缩进
                continue;
            }

            // ---- 常规单行大括号风格 ----
            // 大括号行：提前重置无大括号缩进计数，避免前一代码块残留值影响缩进
            if (text.endsWith('{')) {
                bracelessIndent = 0;
            }
            const effectiveIndent = (isCaseLabel ? indentLevel : indentLevel + currentCaseLevel) + bracelessIndent;
            
            // 统一使用 formatLine 格式化
            const formattedLine = indentChar.repeat(effectiveIndent) + this.formatLine(text);
            lines.push(formattedLine);
            
            // case/default 之后的行缩进加深一级
            if (isCaseLabel) {
                caseLevels[caseLevels.length - 1] = 1;
            }
            
            // 处理开始大括号（同行风格）
            if (!braceNewLine && text.endsWith('{')) {
                indentLevel++;
                caseLevels.push(0);
                bracelessIndent = 0;  // 大括号接管缩进
            }
            
            // 处理一行中有多个大括号的情况
            const openBraces = (text.match(/\{/g) || []).length;
            const closeBraces = (text.match(/\}/g) || []).length;
            if (openBraces > 0 && !text.endsWith('{')) {
                indentLevel += openBraces;
            }
            if (closeBraces > 0 && !text.startsWith('}')) {
                indentLevel -= closeBraces;
            }

            // ---- 无大括号控制流缩进处理 ----
            if (text === '{') {
                bracelessIndent = 0;  // 非 braceNewLine 模式的单独 { 行
                elseConsumesExtra = false;
            } else if (/^(if|for|while)\s*\(/.test(text) && !text.includes('{')) {
                // 无大括号的 if/for/while → 下一行缩进 +1
                bracelessIndent++;
            } else if (/^else\b/.test(text) && !text.includes('{')) {
                // 无大括号的 else → 下一行缩进 +1；标记 else 块结束需额外回收一级
                bracelessIndent++;
                elseConsumesExtra = true;
            } else if (bracelessIndent > 0 && !this.isContinuationLine(text)) {
                // 普通 body 行 → 消费一级缩进
                bracelessIndent = Math.max(0, bracelessIndent - 1);
                // else 块的 body 消费后，额外回收其匹配 if 贡献的一级
                if (elseConsumesExtra) {
                    bracelessIndent = Math.max(0, bracelessIndent - 1);
                    elseConsumesExtra = false;
                }
            }
        }
        
        // 后处理：折叠多余空行（最多保留 1 个连续空行），清理首尾空行，裁剪行尾空格
        const cleanedLines: string[] = [];
        let consecutiveBlanks = 0;
        const trimTrailing = this.shouldTrimTrailingWhitespace();
        for (const line of lines) {
            if (line === '') {
                consecutiveBlanks++;
                if (consecutiveBlanks <= 1) cleanedLines.push(line);
            } else {
                consecutiveBlanks = 0;
                cleanedLines.push(trimTrailing ? line.trimEnd() : line);
            }
        }
        // 清理末尾空行
        while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] === '') {
            cleanedLines.pop();
        }

        const eol = this.getEol();
        let result = cleanedLines.join(eol);
        if (this.shouldInsertFinalNewline()) {
            result += eol;
        }
        return result;
    }

    // 读取编辑器 files.trimTrailingWhitespace 设置
    private shouldTrimTrailingWhitespace(): boolean {
        return vscode.workspace.getConfiguration('files').get<boolean>('trimTrailingWhitespace', false);
    }

    // 读取编辑器 files.insertFinalNewline 设置
    private shouldInsertFinalNewline(): boolean {
        return vscode.workspace.getConfiguration('files').get<boolean>('insertFinalNewline', false);
    }

    // 读取编辑器 files.eol 设置
    private getEol(): string {
        const eol = vscode.workspace.getConfiguration('files').get<string>('eol', 'auto');
        if (eol === '\r\n') return '\r\n';
        if (eol === '\n') return '\n';
        return '\n'; // auto → 默认 LF
    }

    // 读取大括号另起一行设置
    private shouldBraceNewLine(): boolean {
        return vscode.workspace.getConfiguration('godot-shader').get<boolean>('formatting.braceNewLine', false);
    }
    
    // 判断是否为纯注释行
    private isCommentLine(text: string): boolean {
        const trimmed = text.trim();
        return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
    }

    // 判断是否为续行（行尾以运算符或逗号结尾，表示表达式未结束）
    private isContinuationLine(text: string): boolean {
        return /[,\+\-\*\/\(=\?\:]$/.test(text) || /&&\s*$/.test(text) || /\|\|\s*$/.test(text);
    }
    
    // 格式化单行 - 保留注释
    private formatLine(line: string): string {
        // 处理内联注释：分离代码和注释部分
        const commentIndex = this.findCommentStart(line);
        
        if (commentIndex >= 0) {
            // 有内联注释，只格式化代码部分
            const codePart = line.substring(0, commentIndex).trim();
            const commentPart = line.substring(commentIndex);
            const formattedCode = this.formatCode(codePart);
            return formattedCode + ' ' + commentPart.trim();
        } else {
            // 无注释，格式化整行
            return this.formatCode(line);
        }
    }
    
    // 查找注释起始位置（返回 // 的位置，如果不是注释行则返回 -1）
    private findCommentStart(line: string): number {
        let inString = false;
        let stringChar = '';
        
        for (let i = 0; i < line.length - 1; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            // 处理字符串
            if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
                continue;
            }
            
            if (inString && char === stringChar && line[i - 1] !== '\\') {
                inString = false;
                continue;
            }
            
            // 检查 //
            if (!inString && char === '/' && nextChar === '/') {
                return i;
            }
        }
        
        return -1;
    }
    
    // 格式化代码部分（不含注释）
    private formatCode(code: string): string {
        let formatted = code.trim();
        
        // 1. 规范化逗号：去除逗号前后多余空格，逗号后留一个空格: "a ,  b" -> "a, b"
        // 排除行尾逗号（续行符），不添加尾随空格
        formatted = formatted.replace(/\s*,\s*/g, ', ');
        formatted = formatted.replace(/,\s+$/g, ',');
        
        // 2. 去除括号内多余的空格: "func( a, b )" -> "func(a, b)"
        formatted = formatted.replace(/\(\s+/g, '(');
        formatted = formatted.replace(/\s+\)/g, ')');
        
        // 3. 关键词和函数名后格式："){" -> ") {"
        formatted = formatted.replace(/\)\s*\{/g, ') {');
        formatted = formatted.replace(/\b(if|for|while|switch|return)\s*\(/g, '$1 (');

        // 3b. else 前后添加空格: "}else{" -> "} else {"
        formatted = formatted.replace(/\}\s*else\s*\{/g, '} else {');
        formatted = formatted.replace(/\}\s*else\b(?!\s*\{)/g, '} else');
        formatted = formatted.replace(/\belse\s*\{/g, 'else {');
        
        // 4. 分号前去除空格: "a = b ;" -> "a = b;"
        formatted = formatted.replace(/\s+;/g, ';');
        
        // 4b. 分号后添加空格: "a;b" -> "a; b"（排除行尾分号）
        formatted = formatted.replace(/;(\S)/g, '; $1');
        
        // 5. 冒号后添加空格（用于 uniform hint）: ":filter" -> ": filter"
        // 排除三元运算符 ? : 和标签 case: default:
        formatted = formatted.replace(/(:\s*)(?!\s*\?)/g, ': ');
        // 冒号前统一为单空格: "name :type" -> "name : type"
        formatted = formatted.replace(/\s{2,}:/g, ' :');
        
        // 6. 预处理指令：移除 # 和指令名之间的空格: "# if" -> "#if"
        formatted = formatted.replace(/#\s+(if|else|endif|define|undef|include|warning|error|pragma|ifdef|ifndef|elif|version|extension)\b/ig, '#$1');
        
        // 7. 先处理复合赋值运算符（确保格式正确）
        // a/=b -> a /= b
        formatted = formatted.replace(/([a-zA-Z0-9_\)\]])\s*\/\s*=\s*([^;])/g, '$1 /= $2');
        formatted = formatted.replace(/([a-zA-Z0-9_\)\]])\s*\+\s*=\s*([^;])/g, '$1 += $2');
        formatted = formatted.replace(/([a-zA-Z0-9_\)\]])\s*-\s*=\s*([^;])/g, '$1 -= $2');
        formatted = formatted.replace(/([a-zA-Z0-9_\)\]])\s*\*\s*=\s*([^;])/g, '$1 *= $2');
        
        // 8. 处理简单赋值: a=b -> a = b
        // 排除复合运算符: += -= *= /= %= &= |= ^= 等
        formatted = formatted.replace(/([^<>!=\s+\-*\/%&|^])\s*=\s*([^=<>!\s])/g, '$1 = $2');
        
        // 保护科学计数法指数符号（避免被接下来的运算符规则拆散）
        formatted = formatted.replace(/([eEpP])([+-])(\d+)/g, '$1\x00SCI$2\x00$3');
        
        // 9. 在二元操作符 + - * / 两侧添加空格（排除一元操作符和复合赋值）
        // 排除前缀 ++ --
        formatted = formatted.replace(/([a-zA-Z0-9_\)\]])\s*\+\s*([a-zA-Z0-9_\(\[])/g, '$1 + $2');
        formatted = formatted.replace(/([a-zA-Z0-9_\)\]])\s*-\s*([a-zA-Z0-9_\(\[])/g, '$1 - $2');
        formatted = formatted.replace(/([a-zA-Z0-9_\)\]])\s*\*\s*([a-zA-Z0-9_\(\[])/g, '$1 * $2');
        // 注意：/ 运算符需要排除 /= 
        formatted = formatted.replace(/([a-zA-Z0-9_\)\]])\s*\/\s*([a-zA-Z0-9_\(\[])/g, '$1 / $2');
        
        // 恢复科学计数法指数符号
        formatted = formatted.replace(/\x00SCI([+-])\x00/g, '$1');
        
        // 9b. 比较/逻辑运算符两侧添加空格: == != >= <= > < && ||
        formatted = formatted.replace(/([a-zA-Z0-9_\)\]])\s*(&&|\|\||==|!=|>=|<=)\s*([a-zA-Z0-9_\(\!\-\~])/g, '$1 $2 $3');
        // 单字符 < > 需要排除位移运算符 << >> 
        formatted = formatted.replace(/([a-zA-Z0-9_\)\]])\s*<(?![<=])\s*([a-zA-Z0-9_\(\!\-\~])/g, '$1 < $2');
        formatted = formatted.replace(/([a-zA-Z0-9_\)\]])\s*>(?![>=])\s*([a-zA-Z0-9_\(\!\-\~])/g, '$1 > $2');
        
        // 10. 最后再次修复复合赋值运算符（防止被错误拆分）
        formatted = formatted.replace(/([a-zA-Z0-9_\)\]])\s*\/\s*=\s*([a-zA-Z0-9_\(\[])/g, '$1 /= $2');
        formatted = formatted.replace(/([a-zA-Z0-9_\)\]])\s*\+\s*=\s*([a-zA-Z0-9_\(\[])/g, '$1 += $2');
        formatted = formatted.replace(/([a-zA-Z0-9_\)\]])\s*-\s*=\s*([a-zA-Z0-9_\(\[])/g, '$1 -= $2');
        formatted = formatted.replace(/([a-zA-Z0-9_\)\]])\s*\*\s*=\s*([a-zA-Z0-9_\(\[])/g, '$1 *= $2');
        
        // 11. 修复 case/default 标签冒号（冒号规则可能误加空格）: "case 0 :" -> "case 0:"
        formatted = formatted.replace(/\b(case\s+\w+|default)\s*:\s*/g, '$1:');
        
        // 12. 最后折叠多余空格: "a  =  b  +  c" -> "a = b + c"
        formatted = formatted.replace(/\s{2,}/g, ' ');
        
        return formatted;
    }
    
    // 格式化文本（用于范围格式化）
    private formatText(text: string, options?: vscode.FormattingOptions): string {
        const tabSize = options?.tabSize ?? 4;
        const useSpaces = options?.insertSpaces ?? true;
        const indentChar = useSpaces ? ' '.repeat(tabSize) : '\t';
        const trimTrailing = this.shouldTrimTrailingWhitespace();

        return text.split('\n').map(line => {
            const trimmed = line.trim();
            
            // 跳过空行
            if (!trimmed) {
                return '';
            }
            
            // 预处理器指令不缩进（始终顶格）
            if (trimmed.startsWith('#')) {
                return trimmed;
            }
            
            // 注释保持原样
            if (this.isCommentLine(trimmed)) {
                return trimTrailing ? line.trimEnd() : line;
            }
            
            // 计算当前行的缩进层级（保留原始层级，仅转换空格/tab 风格）
            const existingIndent = line.match(/^\s*/)?.[0] || '';
            const indentLevel = this.computeIndentLevel(existingIndent, tabSize);
            const newIndent = indentChar.repeat(indentLevel);
            
            const formatted = newIndent + this.formatLine(trimmed);
            return trimTrailing ? formatted.trimEnd() : formatted;
        }).join('\n');
    }
    
    // 将任意空白缩进转换为"层级"数，兼容 空格 和 Tab 混合
    private computeIndentLevel(indent: string, tabSize: number): number {
        const tabs = (indent.match(/\t/g) || []).length;
        const spaces = (indent.match(/ /g) || []).length;
        return tabs + Math.round(spaces / tabSize);
    }

}
