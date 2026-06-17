import * as vscode from 'vscode';

export class GodotShaderColorProvider implements vscode.DocumentColorProvider {

    // 扫描文档中的所有颜色值
    public provideDocumentColors(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.ColorInformation[]> {
        // 检查设置：是否启用颜色选择器
        const enabled = vscode.workspace.getConfiguration('godot-shader')
            .get<boolean>('colorPicker.enabled', true);
        if (!enabled) return [];

        const colors: vscode.ColorInformation[] = [];

        for (let line = 0; line < document.lineCount; line++) {
            const text = document.lineAt(line).text;
            const trimmed = text.trim();
            
            // 跳过注释行
            if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
                continue;
            }

            // 匹配 vec3(r, g, b)  和 vec4(r, g, b, a)
            this.findColors(text, line, /vec3\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/g, colors, false);
            this.findColors(text, line, /vec4\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/g, colors, true);

            // 匹配十六进制颜色: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
            this.findHexColors(text, line, colors);
        }

        return colors;
    }

    // 用户选择颜色后，生成新的代码
    public provideColorPresentations(
        color: vscode.Color,
        context: { document: vscode.TextDocument; range: vscode.Range },
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.ColorPresentation[]> {
        const lineText = context.document.lineAt(context.range.start.line).text;
        const match = lineText.substring(context.range.start.character, context.range.end.character);

        const r = this.fmt(color.red);
        const g = this.fmt(color.green);
        const b = this.fmt(color.blue);
        const a = this.fmt(color.alpha);

        const isVec4 = match.startsWith('vec4') || lineText.includes('vec4');
        const isHex = match.startsWith('#');

        if (isHex) {
            // 十六进制颜色格式
            const hex = this.rgbToHex(color.red, color.green, color.blue);
            const hexA = this.rgbToHex(color.red, color.green, color.blue, color.alpha);
            return [
                new vscode.ColorPresentation(hex),
                new vscode.ColorPresentation(hexA),
                new vscode.ColorPresentation('#000000')
            ];
        }

        return [
            new vscode.ColorPresentation(
                isVec4 ? `vec4(${r}, ${g}, ${b}, ${a})` : `vec3(${r}, ${g}, ${b})`
            ),
            new vscode.ColorPresentation(
                isVec4 ? `vec4(${r}, ${g}, ${b}, 1.0)` : `vec3(${r}, ${g}, ${b})`
            ),
            new vscode.ColorPresentation(
                isVec4 ? `vec4(0.0, 0.0, 0.0, 1.0)` : `vec3(0.0, 0.0, 0.0)`
            )
        ];
    }

    private findColors(
        text: string, 
        line: number, 
        regex: RegExp, 
        colors: vscode.ColorInformation[],
        hasAlpha: boolean
    ) {
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
            const r = this.parseFloat(match[1]);
            const g = this.parseFloat(match[2]);
            const b = this.parseFloat(match[3]);
            const a = hasAlpha ? this.parseFloat(match[4]) : 1.0;

            const color = new vscode.Color(
                Math.max(0, Math.min(1, r)),
                Math.max(0, Math.min(1, g)),
                Math.max(0, Math.min(1, b)),
                Math.max(0, Math.min(1, a))
            );

            const range = new vscode.Range(
                line, match.index,
                line, match.index + match[0].length
            );
            colors.push(new vscode.ColorInformation(range, color));
        }
    }

    // 匹配十六进制颜色: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
    private findHexColors(text: string, line: number, colors: vscode.ColorInformation[]) {
        const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;
        let match: RegExpExecArray | null;
        while ((match = hexRegex.exec(text)) !== null) {
            const hex = match[1];
            let r = 0, g = 0, b = 0, a = 1;

            if (hex.length === 3) {
                // #RGB → #RRGGBB
                r = parseInt(hex[0] + hex[0], 16) / 255;
                g = parseInt(hex[1] + hex[1], 16) / 255;
                b = parseInt(hex[2] + hex[2], 16) / 255;
            } else if (hex.length === 4) {
                // #RGBA
                r = parseInt(hex[0] + hex[0], 16) / 255;
                g = parseInt(hex[1] + hex[1], 16) / 255;
                b = parseInt(hex[2] + hex[2], 16) / 255;
                a = parseInt(hex[3] + hex[3], 16) / 255;
            } else if (hex.length === 6) {
                // #RRGGBB
                r = parseInt(hex.substring(0, 2), 16) / 255;
                g = parseInt(hex.substring(2, 4), 16) / 255;
                b = parseInt(hex.substring(4, 6), 16) / 255;
            } else if (hex.length === 8) {
                // #RRGGBBAA
                r = parseInt(hex.substring(0, 2), 16) / 255;
                g = parseInt(hex.substring(2, 4), 16) / 255;
                b = parseInt(hex.substring(4, 6), 16) / 255;
                a = parseInt(hex.substring(6, 8), 16) / 255;
            }

            const color = new vscode.Color(
                Math.max(0, Math.min(1, r)),
                Math.max(0, Math.min(1, g)),
                Math.max(0, Math.min(1, b)),
                Math.max(0, Math.min(1, a))
            );

            const range = new vscode.Range(
                line, match.index,
                line, match.index + match[0].length
            );
            colors.push(new vscode.ColorInformation(range, color));
        }
    }

    // RGB(A) → 十六进制字符串
    private rgbToHex(r: number, g: number, b: number, a?: number): string {
        const toHex = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255)
            .toString(16).padStart(2, '0');
        if (a !== undefined && a < 0.999) {
            return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
        }
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    private parseFloat(s: string): number {
        const val = parseFloat(s);
        return isNaN(val) ? 0.0 : val;
    }

    private fmt(v: number): string {
        // 保留 3 位小数，去掉多余的 0
        return parseFloat(v.toFixed(3)).toString();
    }
}
