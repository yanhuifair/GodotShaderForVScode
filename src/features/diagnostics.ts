import * as vscode from 'vscode';
import { GODOT_SHADER_BUILTINS, GODOT_SHADER_RENDER_MODES, GODOT_SHADER_HINTS, getVariableShaderTypes } from '../shader-data';
import { t } from '../i18n';
import { isInCommentOrString } from '../utils';

export class GodotShaderDiagnosticProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private debounceTimer: NodeJS.Timeout | undefined;

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('godot-shader');
    }

    public activate(context: vscode.ExtensionContext) {
        context.subscriptions.push(this.diagnosticCollection);

        // 监听文档变化
        vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document.languageId === 'godot-shader') {
                this.debouncedValidate(event.document);
            }
        }, null, context.subscriptions);

        // 监听文档打开
        vscode.workspace.onDidOpenTextDocument((document) => {
            if (document.languageId === 'godot-shader') {
                this.validate(document);
            }
        }, null, context.subscriptions);

        // 监听文档保存
        vscode.workspace.onDidSaveTextDocument((document) => {
            if (document.languageId === 'godot-shader') {
                this.validate(document);
            }
        }, null, context.subscriptions);

        // 初始化时检查所有已打开的文档
        vscode.workspace.textDocuments.forEach((document) => {
            if (document.languageId === 'godot-shader') {
                this.validate(document);
            }
        });
    }

    private debouncedValidate(document: vscode.TextDocument) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.validate(document);
        }, 500); // 500ms 防抖
    }

    private validate(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        // 1. 检查是否有 shader_type 声明
        this.checkShaderType(lines, diagnostics, document);

        // 2. 检查大括号匹配
        this.checkBraceMatching(lines, diagnostics, document);

        // 3. 检查分号
        this.checkSemicolons(lines, diagnostics, document);

        // 4. 检查 render_mode 语法
        this.checkRenderMode(lines, diagnostics, document);

        // 5. 检查函数声明
        this.checkFunctionDeclarations(lines, diagnostics, document);

        // 6. 检查变量声明
        this.checkVariableDeclarations(lines, diagnostics, document);

        // 7. 检查保留字使用
        this.checkReservedWords(lines, diagnostics, document);

        // 8. 检查内置变量范围
        this.checkBuiltinVariableScope(lines, diagnostics, document);

        // 9. 检查重复变量声明
        this.checkDuplicateDeclarations(lines, diagnostics, document);

        // 10. 检查 const 初始化
        this.checkConstInit(lines, diagnostics, document);

        // 11. 检查 varying 类型
        this.checkVaryingType(lines, diagnostics, document);

        // 12. 检查 discard / break / continue 上下文
        this.checkControlFlow(lines, diagnostics, document);

        // 13. 检查 stencil_mode read 是否在透明通道
        this.checkStencilReadPass(lines, diagnostics, document);

        // 14. 检查数字写法是否合法
        this.checkNumberFormat(lines, diagnostics, document);

        // 15. 检查 shader_type 对应函数是否匹配（如 spatial 中写了 sky()）
        this.checkShaderFuncAvailability(lines, diagnostics, document);

        // 16. 检查未使用的 uniform/varying 声明
        this.checkUnusedDeclarations(lines, diagnostics, document);

        // 17. 性能提示诊断（strictMode 下启用）
        this.checkPerformanceHints(lines, diagnostics, document);

        // 18. 检查 uniform hint 是否合法
        this.checkUniformHints(lines, diagnostics, document);

        // 19. 检查变量赋值类型是否匹配内置变量类型
        this.checkTypeMismatch(lines, diagnostics, document);

        // 20. 检查无效构造函数（高维截断如 vec2(vec3)）
        this.checkInvalidConstructor(lines, diagnostics, document);

        // 21. 检查不存在的函数调用（如 atan2 → 应使用 atan(y, x)）
        this.checkDeprecatedFunctions(lines, diagnostics, document);

        // 22. 检查只读内置变量被赋值（如 LIGHT = xxx）
        this.checkReadonlyBuiltins(lines, diagnostics, document);

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    private checkShaderType(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        // .gdshaderinc 包含文件不需要 shader_type 声明
        if (document.fileName.endsWith('.gdshaderinc')) {
            return;
        }

        let found = false;
        const validTypes = ['canvas_item', 'fog', 'particles', 'sky', 'spatial'];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('shader_type')) {
                found = true;
                const match = line.match(/^shader_type\s+(\w+)\s*;/);
                if (!match) {
                    diagnostics.push({
                        severity: vscode.DiagnosticSeverity.Error,
                        range: new vscode.Range(i, 0, i, lines[i].length),
                        message: t('diag.invalid_syntax_shader_type'),
                        source: 'godot-shader'
                    });
                } else {
                    const type = match[1];
                    if (!validTypes.includes(type)) {
                        diagnostics.push({
                            severity: vscode.DiagnosticSeverity.Error,
                            range: new vscode.Range(i, 0, i, lines[i].length),
                            message: t('diag.invalid_shader_type', type, validTypes.join(', ')),
                            source: 'godot-shader'
                        });
                    }
                }
                break;
            }
        }

        if (!found) {
            diagnostics.push({
                severity: vscode.DiagnosticSeverity.Warning,
                range: new vscode.Range(0, 0, 0, 0),
                message: t('diag.missing_shader_type'),
                source: 'godot-shader'
            });
        }
    }

    private checkBraceMatching(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        let braceCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                // 跳过注释和字符串内的大括号
                if ((char === '{' || char === '}') && isInCommentOrString(line, j)) {
                    continue;
                }
                if (char === '{') {
                    braceCount++;
                } else if (char === '}') {
                    braceCount--;
                    if (braceCount < 0) {
                        diagnostics.push({
                            severity: vscode.DiagnosticSeverity.Error,
                            range: new vscode.Range(i, j, i, j + 1),
                            message: t('diag.extra_closing_brace'),
                            source: 'godot-shader'
                        });
                        braceCount = 0;
                    }
                }
            }
        }

        if (braceCount > 0) {
            diagnostics.push({
                severity: vscode.DiagnosticSeverity.Error,
                range: new vscode.Range(lines.length - 1, 0, lines.length - 1, 0),
                message: t('diag.missing_braces', braceCount),
                source: 'godot-shader'
            });
        }
    }

    private checkSemicolons(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 跳过空行、纯注释行、预处理指令
            if (!line || line.startsWith('//') || line.startsWith('/*') || 
                line.startsWith('*') || line.startsWith('#')) {
                continue;
            }

            // 剥离行尾 // 注释，得到纯代码部分
            const commentIdx = this.indexOfLineComment(line);
            const codeOnly = commentIdx >= 0 ? line.substring(0, commentIdx).trimEnd() : line;

            // ── 跳过不需要分号的结构 ──

            // 1) 声明行：shader_type / render_mode / stencil_mode
            if (line.startsWith('shader_type') || line.startsWith('render_mode') ||
                line.startsWith('stencil_mode')) {
                continue;
            }

            // 2) switch 标签
            if (line.startsWith('case ') || line.startsWith('default:')) {
                continue;
            }

            // 3) 块边界：{ } 以及标签冒号
            if (codeOnly === '{' || codeOnly === '}' ||
                codeOnly.endsWith('{') || codeOnly.endsWith('}') || codeOnly.endsWith(':')) {
                continue;
            }

            // 4) 多行表达式续行特征 — 行尾以下符号表示语句未结束
            //    算术运算符: + - * / %
            //    赋值: =
            //    比较: == != <= >= < >
            //    逻辑: && ||
            //    三元: ?
            //    参数/构造续行: ( , )
            const continuationRegex = /[+\-*\/%=(,?)]$/;
            if (continuationRegex.test(codeOnly)) {
                continue;
            }
            //    二元运算符需要特殊处理（避免误匹配单字符行）
            if (/[<>!]=$/.test(codeOnly) || /&&$/.test(codeOnly) || /\|\|$/.test(codeOnly)) {
                continue;
            }

            // 5) 单独的 ) 闭合括号（可能跟分号，也可能只是多行表达式结尾）
            if (codeOnly === ')' || codeOnly === ');') {
                continue;
            }

            // ── 分号检查 ──
            if (this.shouldHaveSemicolon(codeOnly) && !codeOnly.endsWith(';')) {
                diagnostics.push({
                    severity: vscode.DiagnosticSeverity.Error,
                    range: new vscode.Range(i, lines[i].length, i, lines[i].length),
                    message: t('diag.missing_semicolon'),
                    source: 'godot-shader'
                });
            }
        }
    }

    // 返回行中第一个 // 注释的位置（排除字符串内的 //），无注释返回 -1
    private indexOfLineComment(line: string): number {
        let inString = false;
        for (let i = 0; i < line.length - 1; i++) {
            if (line[i] === '"' && (i === 0 || line[i - 1] !== '\\')) {
                inString = !inString;
            }
            if (!inString && line[i] === '/' && line[i + 1] === '/') {
                return i;
            }
        }
        return -1;
    }

    private shouldHaveSemicolon(line: string): boolean {
        // 变量声明
        if (/^(uniform|varying|in|out|const)\s+/.test(line)) {
            return true;
        }
        
        // 赋值语句 (不包含 if/while/for 条件)
        if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*=/.test(line) && 
            !/^(if|while|for)\s*\(/.test(line)) {
            return true;
        }

        // 函数调用
        if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*\(/.test(line) && !/^(if|while|for|switch)\s*\(/.test(line)) {
            return true;
        }

        // return 语句
        if (/^return\s/.test(line)) {
            return true;
        }

        return false;
    }

    private checkRenderMode(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        let currentShaderType = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 获取 shader_type
            const shaderMatch = line.match(/^shader_type\s+(\w+)/);
            if (shaderMatch) {
                currentShaderType = shaderMatch[1];
            }

            // 检查 render_mode
            const renderMatch = line.match(/^render_mode\s+(.+);/);
            if (renderMatch && currentShaderType) {
                const modes = renderMatch[1].split(',').map(m => m.trim());
                const validList = GODOT_SHADER_RENDER_MODES[currentShaderType] || [];
                
                for (const mode of modes) {
                    if (!validList.includes(mode)) {
                        diagnostics.push({
                            severity: vscode.DiagnosticSeverity.Warning,
                            range: new vscode.Range(i, 0, i, lines[i].length),
                            message: t('diag.invalid_render_mode', mode, currentShaderType, validList.length > 0 ? validList.join(', ') : '—'),
                            source: 'godot-shader'
                        });
                    }
                }
            }
        }
    }

    private checkFunctionDeclarations(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        // 自定义 void 函数不再警告 — 仅检查着色器入口函数名是否在正确的 shader_type 中使用
        // （该检查已由 checkShaderFuncAvailability 负责，此处不再重复告警）
    }

    private checkVariableDeclarations(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 检查 uniform 声明
            const uniformMatch = line.match(/^uniform\s+(\w+)\s+(\w+)/);
            if (uniformMatch) {
                const type = uniformMatch[1];
                const validTypes = ['bool', 'bvec2', 'bvec3', 'bvec4', 'float', 'int', 'ivec2', 'ivec3', 'ivec4',
                                   'mat2', 'mat3', 'mat4',
                                   'sampler2D', 'sampler2DArray', 'sampler3D', 'samplerCube', 'samplerExternalOES',
                                   'uint', 'uvec2', 'uvec3', 'uvec4',
                                   'vec2', 'vec3', 'vec4'];
                
                if (!validTypes.includes(type)) {
                    diagnostics.push({
                        severity: vscode.DiagnosticSeverity.Error,
                        range: new vscode.Range(i, 0, i, lines[i].length),
                        message: t('diag.invalid_type', type, validTypes.join(', ')),
                        source: 'godot-shader'
                    });
                }
            }
        }
    }

    private checkReservedWords(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        // Godot Shader 保留字：GLSL 中有效但在 Godot Shader 中不允许的关键字
        const reservedWords = [
            'main', 'input', 'output', 'half', 'fixed', 'double',
            'hvec2', 'hvec3', 'hvec4', 'dvec2', 'dvec3', 'dvec4',
            'fvec2', 'fvec3', 'fvec4',
            'sampler1D', 'sampler3D', 'sampler1DShadow', 'sampler2DShadow',
            'samplerCubeShadow', 'sampler1DArray', 'sampler2DArrayShadow',
            'isampler1D', 'isampler2D', 'isampler3D', 'isamplerCube',
            'usampler1D', 'usampler2D', 'usampler3D', 'usamplerCube',
            'atomic_uint', 'patch', 'sample', 'subroutine',
            'common', 'partition', 'active', 'asm',
            'class', 'union', 'enum', 'typedef', 'template',
            'this', 'packed', 'goto', 'inline', 'noinline',
            'volatile', 'public', 'static', 'extern', 'interface',
            'long', 'short', 'precision', 'invariant'
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            // 跳过注释、预处理和声明行
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') ||
                trimmed.startsWith('*') || trimmed.startsWith('#')) {
                continue;
            }

            // 使用词边界匹配，避免误报（如 "domain" 中的 "main"）
            for (const word of reservedWords) {
                const regex = new RegExp('\\b' + word + '\\b');
                const match = regex.exec(line);
                if (match && !isInCommentOrString(line, match.index)) {
                    diagnostics.push({
                        severity: vscode.DiagnosticSeverity.Warning,
                        range: new vscode.Range(i, match.index, i, match.index + word.length),
                        message: t('diag.reserved_word', word),
                        source: 'godot-shader'
                    });
                }
            }
        }
    }

    // 根据 shader_type 检测内置变量范围
    private checkBuiltinVariableScope(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        // 获取当前着色器类型
        let shaderType = '';
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].trim().match(/^shader_type\s+(\w+)/);
            if (match) {
                shaderType = match[1];
                break;
            }
        }
        if (!shaderType) return;

        // 扫描每一行，查找内置变量名
        const varRegex = /\b[A-Z][A-Z0-9_]*(?:_[A-Z0-9]+)*\b/g;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            // 跳过注释行、预处理指令、声明行
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || 
                trimmed.startsWith('*') || trimmed.startsWith('#') ||
                trimmed.startsWith('shader_type') || trimmed.startsWith('render_mode') ||
                trimmed.startsWith('uniform') || trimmed.startsWith('varying') ||
                trimmed.startsWith('in ') || trimmed.startsWith('out ') || trimmed.startsWith('const ')) {
                continue;
            }

            // 提取行中的大写变量名
            let match;
            const regex = new RegExp(varRegex.source, 'g');
            while ((match = regex.exec(line)) !== null) {
                const name = match[0];
                
                // 忽略短名称
                if (name.length <= 2) continue;
                
                // 跳过常见 GLSL 关键字和函数名
                if (['IF', 'FOR', 'WHILE', 'INT', 'FLOAT', 'BOOL', 'TRUE', 'FALSE',
                     'RETURN', 'BREAK', 'CONTINUE', 'DISCARD', 'VOID', 'STRUCT',
                     'MAT2', 'MAT3', 'MAT4', 'VEC2', 'VEC3', 'VEC4',
                     'IVEC2', 'IVEC3', 'IVEC4', 'UVEC2', 'UVEC3', 'UVEC4',
                     'BVEC2', 'BVEC3', 'BVEC4',
                     'SIN', 'COS', 'TAN', 'ABS', 'MIN', 'MAX', 'POW', 'EXP', 'LOG',
                     'MOD', 'SIGN', 'FLOOR', 'CEIL', 'FRACT', 'SQRT', 'DOT', 'CROSS',
                     'NORMALIZE', 'LENGTH', 'DISTANCE', 'CLAMP', 'MIX', 'STEP',
                     'SMOOTHSTEP', 'RADIANS', 'DEGREES'].includes(name)) {
                    continue;
                }

                // 使用缓存的 getVariableShaderTypes 代替每次重建 lookup map
                const validTypes = getVariableShaderTypes(name);
                if (validTypes && !validTypes.includes(shaderType)) {
                    const validList = validTypes.join('、');
                    diagnostics.push({
                        severity: vscode.DiagnosticSeverity.Error,
                        range: new vscode.Range(i, match.index, i, match.index + name.length),
                        message: t('diag.not_available_in', name, validList, shaderType),
                        source: 'godot-shader'
                    });
                }
            }
        }
    }

    // 9. 检查重复变量声明
    private checkDuplicateDeclarations(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        const declaredNames = new Map<string, number>(); // name → first line index

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('//') || line.startsWith('/*')) continue;

            // 匹配 uniform/varying/in/out/const type name
            const declMatch = line.match(/^(uniform|varying|in|out|const)\s+(\w+)\s+(\w+)/);
            if (declMatch) {
                const name = declMatch[3];
                if (declaredNames.has(name)) {
                    const firstLine = declaredNames.get(name)!;
                    diagnostics.push({
                        severity: vscode.DiagnosticSeverity.Error,
                        range: new vscode.Range(i, lines[i].indexOf(name), i, lines[i].indexOf(name) + name.length),
                        message: t('diag.duplicate_declaration', name, String(firstLine + 1)),
                        source: 'godot-shader'
                    });
                } else {
                    declaredNames.set(name, i);
                }
            }
        }
    }

    // 10. 检查 const 必须初始化 + 全局变量无初始化（Godot 4 要求全局非 uniform/varying 变量必须初始化）
    private checkConstInit(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        let braceDepth = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const rawLine = lines[i];

            // 追踪大括号深度
            for (const ch of rawLine) {
                if (ch === '{') braceDepth++;
                else if (ch === '}') braceDepth--;
            }

            // 1) const 必须初始化
            const constMatch = line.match(/^const\s+(\w+)\s+(\w+)\s*;/);
            if (constMatch) {
                diagnostics.push({
                    severity: vscode.DiagnosticSeverity.Error,
                    range: new vscode.Range(i, 0, i, lines[i].length),
                    message: t('diag.const_must_init', constMatch[2]),
                    source: 'godot-shader'
                });
                continue;
            }

            // 2) 全局作用域 (braceDepth === 0) 中，非 uniform/varying/const 的类型声明需初始化
            if (braceDepth > 0) continue;
            if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*') || line.startsWith('#')) continue;
            if (/^(uniform|varying|const|void|struct|shader_type|render_mode|stencil_mode|group_uniforms?)/.test(line)) continue;

            // 匹配: type name; （无初始化的全局变量声明）
            const globalMatch = line.match(/^(\w+)\s+(\w+)\s*;$/);
            if (globalMatch) {
                const typeName = globalMatch[1];
                // 仅当 type 是有效着色器类型时才报错（排除函数声明等）
                if (['bool','bvec2','bvec3','bvec4','float','int','ivec2','ivec3','ivec4',
                     'mat2','mat3','mat4','sampler2D','sampler2DArray','samplerCube',
                     'samplerExternalOES','uint','uvec2','uvec3','uvec4','vec2','vec3','vec4'].includes(typeName)) {
                    diagnostics.push({
                        severity: vscode.DiagnosticSeverity.Error,
                        range: new vscode.Range(i, 0, i, lines[i].length),
                        message: t('diag.global_var_must_init', globalMatch[2]),
                        source: 'godot-shader'
                    });
                }
            }
        }
    }

    // 11. 检查 varying 类型
    private checkVaryingType(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        const validTypes = ['bvec2', 'bvec3', 'bvec4', 'bool', 'float', 'int', 'ivec2', 'ivec3', 'ivec4',
                            'mat2', 'mat3', 'mat4', 'sampler2D', 'sampler2DArray', 'samplerCube',
                            'uvec2', 'uvec3', 'uvec4',
                            'vec2', 'vec3', 'vec4'];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const match = line.match(/^varying\s+(\w+)\s+(\w+)/);
            if (match && !validTypes.includes(match[1])) {
                diagnostics.push({
                    severity: vscode.DiagnosticSeverity.Error,
                    range: new vscode.Range(i, 0, i, lines[i].length),
                    message: t('diag.invalid_varying_type', match[1], validTypes.join(', ')),
                    source: 'godot-shader'
                });
            }
        }
    }

    // 12. 检查 discard / break / continue 上下文
    private checkControlFlow(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        let inFragment = false;
        let inLight = false;
        // 栈：记录每个大括号层级中的上下文标记
        // each entry: { loop: boolean, switch: boolean }
        const contextStack: Array<{ loop: boolean; switch: boolean }> = [{ loop: false, switch: false }];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // 追踪着色器函数上下文（仅在外部层级有效）
            if (contextStack.length <= 1) {
                if (/^(void\s+)?fragment\s*\(/.test(trimmed)) inFragment = true;
                if (/^(void\s+)?light\s*\(/.test(trimmed)) inLight = true;
            }

            // 计算大括号变化
            for (let j = 0; j < line.length; j++) {
                const ch = line[j];
                if (ch === '{') {
                    // 检查当前行 { 之前的文本
                    const textBeforeBrace = line.substring(0, j);
                    let isLoop = /\b(for|while|do)\b/.test(textBeforeBrace);
                    let isSwitch = /\bswitch\b/.test(textBeforeBrace);

                    // 如果 { 单独成行（前一行可能是 switch/for/while/do）
                    if (!isLoop && !isSwitch && textBeforeBrace.trim() === '') {
                        // 回溯查找前一行非空非注释的关键字
                        for (let k = i - 1; k >= 0; k--) {
                            const prevLine = lines[k].trim();
                            if (!prevLine || prevLine.startsWith('//') || prevLine.startsWith('/*')) {
                                continue;
                            }
                            isLoop = /\b(for|while|do)\b/.test(prevLine);
                            isSwitch = /\bswitch\b/.test(prevLine);
                            break;
                        }
                    }

                    contextStack.push({
                        loop: contextStack[contextStack.length - 1].loop || isLoop,
                        switch: contextStack[contextStack.length - 1].switch || isSwitch
                    });
                } else if (ch === '}') {
                    if (contextStack.length > 1) contextStack.pop();
                }
            }

            const ctx = contextStack[contextStack.length - 1];

            // 检查 discard
            if (trimmed.includes('discard') && !inFragment && !inLight) {
                const idx = line.indexOf('discard');
                diagnostics.push({
                    severity: vscode.DiagnosticSeverity.Error,
                    range: new vscode.Range(i, idx, i, idx + 7),
                    message: t('diag.discard_outside_fragment'),
                    source: 'godot-shader'
                });
            }

            // 检查 break / continue
            const breakMatch = trimmed.match(/\b(break|continue)\b/);
            if (breakMatch && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
                const keyword = breakMatch[1];
                const idx = line.indexOf(keyword);
                if (keyword === 'break' && ctx.switch) {
                    continue; // break 在 switch 中是合法的
                }
                if (!ctx.loop && !ctx.switch) {
                    diagnostics.push({
                        severity: vscode.DiagnosticSeverity.Error,
                        range: new vscode.Range(i, idx, i, idx + keyword.length),
                        message: t('diag.keyword_outside_loop', keyword),
                        source: 'godot-shader'
                    });
                }
            }
        }
    }

    // 13. 检查 stencil_mode 读取时必须在透明通道
    private checkStencilReadPass(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        let stencilReads = false;
        let stencilLine = -1;
        let renderModeLine = -1;
        let renderModes: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 检测 stencil_mode 声明
            const stencilMatch = line.match(/^stencil_mode\s+(.+);/);
            if (stencilMatch) {
                const values = stencilMatch[1].split(',').map(v => v.trim());
                if (values.includes('read')) {
                    stencilReads = true;
                    stencilLine = i;
                }
            }

            // 检测 render_mode 声明
            const renderMatch = line.match(/^render_mode\s+(.+);/);
            if (renderMatch) {
                renderModeLine = i;
                renderModes = renderMatch[1].split(',').map(m => m.trim());
            }
        }

        if (!stencilReads) return;

        // 透明通道条件：blend 模式、depth_draw_never、depth_test_disabled
        const blendModes = ['blend_mix', 'blend_add', 'blend_sub', 'blend_mul', 'blend_premul_alpha'];
        const transparentModes = ['depth_draw_never', 'depth_draw_always', 'depth_test_disabled'];

        const hasBlend = renderModes.some(m => blendModes.includes(m));
        const hasTransparentMode = renderModes.some(m => transparentModes.includes(m));

        if (!hasBlend && !hasTransparentMode) {
            const line = stencilLine;
            diagnostics.push({
                severity: vscode.DiagnosticSeverity.Warning,
                range: new vscode.Range(line, 0, line, lines[line].length),
                message: t('diag.stencil_read_no_alpha'),
                source: 'godot-shader'
            });
        }
    }

    // 14. 检查数字写法是否合法（Godot/GLSL 数值格式校验）
    private checkNumberFormat(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        for (let i = 0; i < lines.length; i++) {
            const line = document.lineAt(i);
            const text = line.text;

            // 跳过注释行
            const trimmed = text.trim();
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
                continue;
            }

            // 查找所有疑似数字的 token
            const tokenRegex = /\b\d[\d.a-fA-FbBoOxXeEpPfFuU+-]*\b/g;
            let match: RegExpExecArray | null;

            while ((match = tokenRegex.exec(text)) !== null) {
                const token = match[0];

                // 跳过明显合法的简单数字
                if (/^\d+[uU]?$/.test(token)) continue;

                // 校验：是否是合法的数值格式
                if (!this.isValidNumber(token)) {
                    diagnostics.push({
                        severity: vscode.DiagnosticSeverity.Error,
                        range: new vscode.Range(i, match.index, i, match.index + token.length),
                        message: t('diag.invalid_number', token),
                        source: 'godot-shader'
                    });
                }
            }

            // 独立检测 . 开头的数字（如 .5, .5e3, .5f）
            const dotTokenRegex = /\B\.\d[\d.eEfF+-]*\b/g;
            while ((match = dotTokenRegex.exec(text)) !== null) {
                const token = match[0];
                if (!this.isValidNumber(token)) {
                    diagnostics.push({
                        severity: vscode.DiagnosticSeverity.Error,
                        range: new vscode.Range(i, match.index, i, match.index + token.length),
                        message: t('diag.invalid_number', token),
                        source: 'godot-shader'
                    });
                }
            }
        }
    }

    // 校验单个数字 token 是否为合法 Godot 4 / GLSL ES 3.0 数值
    private isValidNumber(token: string): boolean {
        // 1. 十六进制整数: 0xFF, 0xFFu（GLSL ES 3.0 不支持 0b 二进制和 0x 十六进制浮点）
        if (/^0[xX][0-9a-fA-F]+[uU]?$/.test(token)) return true;

        // 2. 科学计数法浮点数: 1.5e3, 1e3, 1.5e-2, 1e+2f
        if (/^\d+\.\d*[eE][+-]?\d+[fF]?$/.test(token)) return true;
        if (/^\d+[eE][+-]?\d+[fF]?$/.test(token)) return true;

        // 3. 常规浮点数: 1.0, 1., .5, 1f, .5f, 1.5f, 2.f
        if (/^\d+\.\d+[fF]?$/.test(token)) return true;
        if (/^\d+\.[fF]$/.test(token)) return true;     // 2.f
        if (/^\d+\.$/.test(token)) return true;
        if (/^\d+[fF]$/.test(token)) return true;
        if (/^\.\d+[eE][+-]?\d+[fF]?$/.test(token)) return true;
        if (/^\.\d+[fF]?$/.test(token)) return true;

        return false;
    }

    // 15. 检查 shader_type 与着色器入口函数是否匹配
    private checkShaderFuncAvailability(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        let shaderType = '';
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].trim().match(/^shader_type\s+(\w+)/);
            if (match) { shaderType = match[1]; break; }
        }
        if (!shaderType) return;

        const funcMap: Record<string, string[]> = {
            'canvas_item': ['fragment', 'vertex'],
            'fog': ['fog'],
            'particles': ['fragment', 'vertex'],
            'sky': ['sky'],
            'spatial': ['fragment', 'light', 'vertex']
        };

        const available = funcMap[shaderType] || [];
        // 仅对 Godot 内置着色器入口函数名做校验，自定义 void 函数不在此列
        const allShaderFuncs = ['fog', 'fragment', 'light', 'sky', 'vertex'];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const match = line.match(/^void\s+(\w+)\s*\(/);
            if (match) {
                const funcName = match[1];
                // 只有内置入口函数名才需要校验 shader_type 兼容性
                if (allShaderFuncs.includes(funcName) && !available.includes(funcName)) {
                    diagnostics.push({
                        severity: vscode.DiagnosticSeverity.Error,
                        range: new vscode.Range(i, 0, i, lines[i].length),
                        message: t('diag.shader_func_not_available', funcName, shaderType, available.join(', ')),
                        source: 'godot-shader'
                    });
                }
            }
        }
    }

    // 16. 检查未使用的 uniform/varying 声明
    private checkUnusedDeclarations(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        // 收集所有声明
        const decls: Array<{ name: string; keyword: string; line: number; col: number }> = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            const match = trimmed.match(/^(uniform|varying)\s+(\w+)\s+(\w+)/);
            if (match) {
                const name = match[3];
                // 跳过太短的名称（如 a, b 等测试变量）
                if (name.length <= 1) continue;
                const col = line.indexOf(name);
                decls.push({ keyword: match[1], name, line: i, col });
            }
        }

        if (decls.length === 0) return;

        // 对每个声明，在声明行之外搜索引用（排除注释和字符串内的引用）
        for (const decl of decls) {
            let refCount = 0;

            for (let i = 0; i < lines.length; i++) {
                if (i === decl.line) continue; // 跳过声明行自身

                const text = lines[i];
                // 使用词边界匹配
                const escaped = decl.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp('\\b' + escaped + '\\b', 'g');
                let match: RegExpExecArray | null;

                while ((match = regex.exec(text)) !== null) {
                    // 跳过注释和字符串内的引用
                    if (!isInCommentOrString(text, match.index)) {
                        refCount++;
                    }
                }
            }

            if (refCount === 0) {
                const key = decl.keyword === 'uniform' ? 'diag.unused_uniform' : 'diag.unused_varying';
                diagnostics.push({
                    severity: vscode.DiagnosticSeverity.Hint,
                    range: new vscode.Range(decl.line, decl.col, decl.line, decl.col + decl.name.length),
                    message: t(key, decl.name),
                    source: 'godot-shader'
                });
            }
        }
    }

    // 17. 性能提示诊断（strictMode 下启用额外性能警告）
    private checkPerformanceHints(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        const config = vscode.workspace.getConfiguration('godot-shader');
        if (!config.get<boolean>('diagnostics.strictMode', false)) return;

        // 追踪循环嵌套深度（按大括号层级）
        let loopDepth = 0;
        let braceDepth = 0;
        // 记录每层是否为循环块
        const loopAtBraceLevel: boolean[] = [false];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

            // 检测循环关键字（在同一行内开始循环）
            const hasLoopKeyword = /\b(for|while|do)\b/.test(trimmed);

            // 处理大括号变化
            let openCount = 0, closeCount = 0;
            for (const ch of line) {
                if (ch === '{') openCount++;
                else if (ch === '}') closeCount++;
            }

            // 先处理闭合（出块）
            for (let j = 0; j < closeCount; j++) {
                if (braceDepth > 0) {
                    if (loopAtBraceLevel[braceDepth]) {
                        loopDepth--;
                    }
                    loopAtBraceLevel.pop();
                    braceDepth--;
                }
            }

            // 检查循环内 texture 采样（在开启块之后、闭合之前）
            if (loopDepth > 0 && /\btexture\s*\(/.test(trimmed)) {
                const idx = line.indexOf('texture');
                diagnostics.push({
                    severity: vscode.DiagnosticSeverity.Warning,
                    range: new vscode.Range(i, idx, i, idx + 7),
                    message: t('diag.perf_texture_in_loop'),
                    source: 'godot-shader'
                });
            }

            // 再处理开始（入块）
            for (let j = 0; j < openCount; j++) {
                braceDepth++;
                const isLoop = hasLoopKeyword && j === 0; // 只在第一个 { 标记为循环
                loopAtBraceLevel.push(isLoop);
                if (isLoop) loopDepth++;
            }

            // discard 性能提示
            if (trimmed.includes('discard') && !isInCommentOrString(line, line.indexOf('discard'))) {
                const idx = trimmed.indexOf('discard');
                diagnostics.push({
                    severity: vscode.DiagnosticSeverity.Information,
                    range: new vscode.Range(i, idx, i, idx + 7),
                    message: t('diag.perf_discard_mobile'),
                    source: 'godot-shader'
                });
            }
        }
    }

    // 18. 检查 uniform 声明中 : 后面的 hint/flag 是否合法
    private checkUniformHints(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        const validHints: Set<string> = new Set(GODOT_SHADER_HINTS);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // 匹配 uniform type name : hint1, hint2, hint3 ...
            // 支持 : 后跟一个或多个逗号分隔的 hint
            const match = trimmed.match(/^uniform\s+\w+\s+\w+\s*:\s*(.+)/);
            if (!match) continue;

            const hintsPart = match[1];

            // 按 = 分割（hint 部分在 = 之前），取出 hint 列表
            const eqIdx = hintsPart.indexOf('=');
            let rawHints = eqIdx >= 0 ? hintsPart.substring(0, eqIdx) : hintsPart;

            // 去掉末尾分号
            rawHints = rawHints.replace(/;$/, '').trimEnd();

            // 用正则提取各个 hint 名（支持带括号参数如 hint_range(0, 1)）
            const hintRegex = /(\w+)(?:\([^)]*\))?/g;
            let hintMatch: RegExpExecArray | null;
            while ((hintMatch = hintRegex.exec(rawHints)) !== null) {
                const hint = hintMatch[1];
                if (!validHints.has(hint)) {
                    const col = line.indexOf(hint);
                    diagnostics.push({
                        severity: vscode.DiagnosticSeverity.Error,
                        range: new vscode.Range(i, col >= 0 ? col : 0, i, (col >= 0 ? col : 0) + hint.length),
                        message: t('diag.invalid_hint', hint),
                        source: 'godot-shader'
                    });
                }
            }
        }
    }

    // 19. 检查变量赋值时类型是否与内置变量类型匹配（如 uint x = VERTEX_ID; VERTEX_ID 是 int）
    private checkTypeMismatch(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        // 构建 内置变量名 → 类型 的映射
        const builtinTypeMap = new Map<string, string>();
        for (const cat of Object.values(GODOT_SHADER_BUILTINS)) {
            if (!Array.isArray(cat)) continue;
            for (const v of cat) {
                builtinTypeMap.set(v.name, v.type);
            }
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('#') || trimmed.startsWith('*')) continue;

            // 匹配: type name = IDENTIFIER; 或 type name = IDENTIFIER.xxx;
            const match = trimmed.match(/^(\w+)\s+(\w+)\s*=\s*([A-Za-z_]\w*)\s*;/);
            if (!match) continue;

            const declaredType = match[1];  // LHS: uint
            const rhsIdentifier = match[3]; // RHS: VERTEX_ID

            // 跳过非内置变量的赋值
            const builtinType = builtinTypeMap.get(rhsIdentifier);
            if (!builtinType) continue;

            // 类型完全一致 → 放行
            if (declaredType === builtinType) continue;

            // 标量类型兼容性：同族放行（vec2=vec2, mat3=mat3）
            // 明确的类型不匹配才报错
            const isScalar = ['float','int','uint','bool'].includes(declaredType)
                          && ['float','int','uint','bool'].includes(builtinType);

            // 标量不匹配 → 报错
            if (isScalar && declaredType !== builtinType) {
                const col = line.indexOf(rhsIdentifier);
                diagnostics.push({
                    severity: vscode.DiagnosticSeverity.Error,
                    range: new vscode.Range(i, col >= 0 ? col : 0, i, (col >= 0 ? col : 0) + rhsIdentifier.length),
                    message: t('diag.type_mismatch_assignment', declaredType, builtinType, rhsIdentifier),
                    source: 'godot-shader'
                });
            }
        }
    }

    // 20. 检查无效构造函数（Godot 4 不允许高维截断：vec2(vec3), mat2(mat3) 等）
    private checkInvalidConstructor(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        // 不允许的截断构造: type(highDimType)
        const invalidPatterns: Array<{from: string, to: string, regex: RegExp}> = [
            { from: 'vec3', to: 'vec2', regex: /\bvec2\s*\(\s*vec3\s*\(/ },
            { from: 'vec4', to: 'vec2', regex: /\bvec2\s*\(\s*vec4\s*\(/ },
            { from: 'vec4', to: 'vec3', regex: /\bvec3\s*\(\s*vec4\s*\(/ },
            { from: 'ivec3', to: 'ivec2', regex: /\bivec2\s*\(\s*ivec3\s*\(/ },
            { from: 'ivec4', to: 'ivec2', regex: /\bivec2\s*\(\s*ivec4\s*\(/ },
            { from: 'ivec4', to: 'ivec3', regex: /\bivec3\s*\(\s*ivec4\s*\(/ },
            { from: 'uvec3', to: 'uvec2', regex: /\buvec2\s*\(\s*uvec3\s*\(/ },
            { from: 'uvec4', to: 'uvec2', regex: /\buvec2\s*\(\s*uvec4\s*\(/ },
            { from: 'uvec4', to: 'uvec3', regex: /\buvec3\s*\(\s*uvec4\s*\(/ },
            { from: 'bvec3', to: 'bvec2', regex: /\bbvec2\s*\(\s*bvec3\s*\(/ },
            { from: 'bvec4', to: 'bvec2', regex: /\bbvec2\s*\(\s*bvec4\s*\(/ },
            { from: 'bvec4', to: 'bvec3', regex: /\bbvec3\s*\(\s*bvec4\s*\(/ },
            { from: 'mat3', to: 'mat2', regex: /\bmat2\s*\(\s*mat3\s*\(/ },
            { from: 'mat4', to: 'mat2', regex: /\bmat2\s*\(\s*mat4\s*\(/ },
            { from: 'mat4', to: 'mat3', regex: /\bmat3\s*\(\s*mat4\s*\(/ },
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;

            for (const p of invalidPatterns) {
                const match = p.regex.exec(line);
                if (match) {
                    const col = match.index;
                    diagnostics.push({
                        severity: vscode.DiagnosticSeverity.Error,
                        range: new vscode.Range(i, col, i, col + match[0].length),
                        message: t('diag.invalid_constructor_trunc', p.to, p.from),
                        source: 'godot-shader'
                    });
                    break; // 每行只报一个构造错误
                }
            }
        }
    }

    // 21. 检查不存在的函数（如 atan2 → 应使用 atan(y, x)）
    private checkDeprecatedFunctions(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        // 常见错误函数名 → 正确替代
        const deprecated: Array<{name: string, replace: string}> = [
            { name: 'atan2', replace: 'atan(y, x)' },
            { name: 'dfdx', replace: 'dFdx' },
            { name: 'dfdy', replace: 'dFdy' },
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;

            for (const d of deprecated) {
                const regex = new RegExp('\\b' + d.name + '\\s*\\(', 'g');
                let match;
                while ((match = regex.exec(line)) !== null) {
                    if (!isInCommentOrString(line, match.index)) {
                        diagnostics.push({
                            severity: vscode.DiagnosticSeverity.Error,
                            range: new vscode.Range(i, match.index, i, match.index + d.name.length),
                            message: t('diag.deprecated_function', d.name, d.replace),
                            source: 'godot-shader'
                        });
                    }
                }
            }
        }
    }

    // 22. 检查只读内置变量被赋值（如 LIGHT = xxx 在 spatial light() 中 LIGHT 是只读输入）
    private checkReadonlyBuiltins(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        // 构建"某个 shader 函数内只读"的内置变量集合
        // vertex_input + vertex_matrices(VIEW/INV_VIEW) + vertex_bones 在 vertex() 中只读
        // fragment_input 在 fragment() 中只读
        // light_input 在 light() 中只读
        const readonlyInVertex = new Set<string>();
        const readonlyInFragment = new Set<string>();
        const readonlyInLight = new Set<string>();

        for (const v of GODOT_SHADER_BUILTINS.vertex_input || []) readonlyInVertex.add(v.name);
        for (const v of GODOT_SHADER_BUILTINS.vertex_bones || []) readonlyInVertex.add(v.name);
        readonlyInVertex.add('VIEW_MATRIX');
        readonlyInVertex.add('INV_VIEW_MATRIX');
        readonlyInVertex.add('INV_PROJECTION_MATRIX');
        readonlyInVertex.add('MAIN_CAM_INV_VIEW_MATRIX');
        readonlyInVertex.add('OUTPUT_IS_SRGB');
        readonlyInVertex.add('VIEWPORT_SIZE');

        for (const v of GODOT_SHADER_BUILTINS.fragment_input || []) readonlyInFragment.add(v.name);

        for (const v of GODOT_SHADER_BUILTINS.light_input || []) readonlyInLight.add(v.name);

        // 追踪当前所在着色器函数
        let inVertex = false, inFragment = false, inLight = false;
        let braceDepth = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
                // 仍需要追踪大括号
                for (const ch of line) {
                    if (ch === '{') braceDepth++;
                    else if (ch === '}') braceDepth--;
                }
                continue;
            }

            // 追踪函数边界
            if (/^(void\s+)?vertex\s*\(/.test(trimmed)) inVertex = true;
            if (/^(void\s+)?fragment\s*\(/.test(trimmed)) inFragment = true;
            if (/^(void\s+)?light\s*\(/.test(trimmed)) inLight = true;

            for (const ch of line) {
                if (ch === '{') braceDepth++;
                else if (ch === '}') {
                    braceDepth--;
                    if (braceDepth <= 0) {
                        inVertex = inFragment = inLight = false;
                    }
                }
            }

            if (braceDepth <= 0) continue;

            // 检查赋值: BUILTIN = ... 或 BUILTIN += ... 等形式
            const assignMatch = trimmed.match(/^(\w+)\s*(\+|\-|\*|\/)?=\s*/);
            if (!assignMatch) continue;

            const name = assignMatch[1];
            let readonlySet: Set<string> | null = null;
            let context = '';
            if (inVertex && readonlyInVertex.has(name)) { readonlySet = readonlyInVertex; context = 'vertex()'; }
            if (inFragment && readonlyInFragment.has(name)) { readonlySet = readonlyInFragment; context = 'fragment()'; }
            if (inLight && readonlyInLight.has(name)) { readonlySet = readonlyInLight; context = 'light()'; }

            if (readonlySet) {
                const col = line.indexOf(name);
                diagnostics.push({
                    severity: vscode.DiagnosticSeverity.Error,
                    range: new vscode.Range(i, col, i, col + name.length),
                    message: t('diag.readonly_builtin', name, context),
                    source: 'godot-shader'
                });
            }
        }
    }

    // 23. 检查声明但未使用的局部变量
    private checkUnusedLocals(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        let braceDepth = 0;
        let inFunction = false;
        let funcStartLine = -1;
        // 当前函数内: 变量名 → {声明行, 列, 已使用}
        const localVars = new Map<string, {line: number, col: number, used: boolean}>();

        const flushLocals = () => {
            for (const [name, info] of localVars) {
                if (!info.used && name.length > 1) {
                    diagnostics.push({
                        severity: vscode.DiagnosticSeverity.Warning,
                        range: new vscode.Range(info.line, info.col, info.line, info.col + name.length),
                        message: t('diag.unused_local', name),
                        source: 'godot-shader'
                    });
                }
            }
            localVars.clear();
            inFunction = false;
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

            // 检测函数声明进入
            const funcMatch = trimmed.match(/^(void\s+)?\w+\s+(\w+)\s*\(([^)]*)\)\s*\{?/);
            if (funcMatch && !inFunction) {
                const paramStr = funcMatch[3] || '';
                inFunction = true;
                funcStartLine = i;
                localVars.clear();

                // 收集参数名（跳过类型和修饰符）
                const paramRegex = /(?:in\s+|out\s+|inout\s+)?\w+\s+(\w+)(?:\s*[\[\(][^)\]]*[\]\)])?\s*(?:,|$)/g;
                let pm;
                while ((pm = paramRegex.exec(paramStr)) !== null) {
                    localVars.set(pm[1], {line: i, col: line.indexOf(pm[1]), used: false});
                }
            }

            // 追踪大括号深度
            for (const ch of line) {
                if (ch === '{') braceDepth++;
                else if (ch === '}') {
                    braceDepth--;
                    if (braceDepth <= 0 && inFunction) {
                        flushLocals();
                    }
                }
            }

            if (!inFunction || braceDepth <= 0) continue;

            // 检测局部变量声明: type name = ...; 或 type name;
            // 跳过 uniform/varying/const/void/return 等
            const declMatch = trimmed.match(/^(\w+)\s+(\w+)\s*[=;]/);
            if (declMatch) {
                const typeName = declMatch[1];
                const varName = declMatch[2];
                // 排除关键字、类型名（避免误匹配）
                if (!['if','else','for','while','do','return','switch','case','default','discard','void','struct'].includes(typeName)) {
                    if (!localVars.has(varName)) {
                        const col = line.indexOf(varName);
                        localVars.set(varName, {line: i, col, used: false});
                    }
                    // RHS 中引用的变量标记为已使用（包括自身，如 a = a + 1）
                    const restAfter = trimmed.substring(declMatch[0].length);
                    for (const [name, info] of localVars) {
                        if (new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(restAfter)) {
                            info.used = true;
                        }
                    }
                }
            }

            // 检测变量使用：在非声明行中出现的变量名
            for (const [name, info] of localVars) {
                if (info.used) continue;
                const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const useRegex = new RegExp('\\b' + escaped + '\\b', 'g');
                let um;
                while ((um = useRegex.exec(line)) !== null) {
                    // 排除声明行自身 (该行已被 declMatch 处理)
                    if (declMatch && declMatch[2] === name) continue;
                    if (!isInCommentOrString(line, um.index)) {
                        info.used = true;
                        break;
                    }
                }
            }
        }

        // 文件末尾可能还有未刷新的函数
        if (inFunction) flushLocals();
    }

    public dispose() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = undefined;
        }
        this.diagnosticCollection.dispose();
    }
}
