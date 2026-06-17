import * as vscode from 'vscode';

/**
 * 转义正则表达式中的特殊字符
 */
export function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 从文档中检测当前 shader_type（公共函数，供 completion/hover 等复用）
 * @returns shader_type 名称，未声明时返回 null
 */
export function getShaderType(document: vscode.TextDocument): string | null {
    const match = document.getText().match(/^shader_type\s+(\w+)/m);
    return match ? match[1] : null;
}

/**
 * 判断某个位置是否在注释或字符串内
 * 扫描从行首到 pos 列的所有字符，跟踪注释和字符串状态
 * @param lineText 当前行文本
 * @param pos 待检查的列位置
 * @returns true 表示在注释或字符串内，应跳过
 */
export function isInCommentOrString(lineText: string, pos: number): boolean {
    let inLineComment = false;
    let inBlockComment = false;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < pos && i < lineText.length; i++) {
        const ch = lineText[i];
        const next = i + 1 < lineText.length ? lineText[i + 1] : '';

        // 行注释
        if (!inString && !inBlockComment && ch === '/' && next === '/') {
            inLineComment = true;
            i++; // 跳过下一个 /
            continue;
        }

        // 块注释开始
        if (!inString && !inLineComment && ch === '/' && next === '*') {
            inBlockComment = true;
            i++;
            continue;
        }

        // 块注释结束
        if (!inString && inBlockComment && ch === '*' && next === '/') {
            inBlockComment = false;
            i++;
            continue;
        }

        // 字符串
        if (!inLineComment && !inBlockComment && (ch === '"' || ch === "'")) {
            if (!inString) {
                inString = true;
                stringChar = ch;
            } else if (ch === stringChar) {
                // 检查是否被反斜杠转义（如 "hello \"world"）
                let escaped = false;
                for (let k = i - 1; k >= 0; k--) {
                    if (lineText[k] === '\\') {
                        escaped = !escaped;
                    } else {
                        break;
                    }
                }
                if (!escaped) {
                    inString = false;
                }
            }
        }
    }

    return inLineComment || inBlockComment || inString;
}
