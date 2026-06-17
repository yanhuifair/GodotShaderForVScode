import * as vscode from 'vscode';
import { GODOT_SHADER_BUILTINS, GODOT_SHADER_RENDER_MODES, getVariableShaderTypes } from '../shader-data';
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

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    private checkShaderType(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
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
            
            // 跳过空行、注释、预处理指令
            if (!line || line.startsWith('//') || line.startsWith('/*') || 
                line.startsWith('*') || line.startsWith('#') || line.startsWith('//')) {
                continue;
            }

            // 跳过特定结构
            if (line.startsWith('shader_type') || line.startsWith('render_mode') ||
                line.endsWith('{') || line.endsWith('}') || line.endsWith(':') ||
                line === ')' || line.startsWith('case ') || line.startsWith('default:')) {
                continue;
            }

            // 检查变量声明、赋值、函数调用等是否需要分号
            if (this.shouldHaveSemicolon(line) && !line.endsWith(';')) {
                diagnostics.push({
                    severity: vscode.DiagnosticSeverity.Error,
                    range: new vscode.Range(i, lines[i].length, i, lines[i].length),
                    message: t('diag.missing_semicolon'),
                    source: 'godot-shader'
                });
            }
        }
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
        const validFunctions = ['fog', 'fragment', 'light', 'sky', 'vertex'];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const match = line.match(/^void\s+(\w+)\s*\(/);
            
            if (match) {
                const funcName = match[1];
                if (!validFunctions.includes(funcName)) {
                    diagnostics.push({
                        severity: vscode.DiagnosticSeverity.Warning,
                        range: new vscode.Range(i, 0, i, lines[i].length),
                        message: t('diag.unknown_function', funcName, validFunctions.join(', ')),
                        source: 'godot-shader'
                    });
                }
            }
        }
    }

    private checkVariableDeclarations(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 检查 uniform 声明
            const uniformMatch = line.match(/^uniform\s+(\w+)\s+(\w+)/);
            if (uniformMatch) {
                const type = uniformMatch[1];
                const validTypes = ['bool', 'float', 'int', 'mat2', 'mat3', 'mat4',
                                   'sampler2D', 'sampler2DArray', 'samplerCube', 'samplerExternalOES',
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
            'long', 'short', 'superp', 'precision', 'invariant'
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

    // 10. 检查 const 必须初始化
    private checkConstInit(lines: string[], diagnostics: vscode.Diagnostic[], document: vscode.TextDocument) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const match = line.match(/^const\s+(\w+)\s+(\w+)\s*;/);
            if (match) {
                diagnostics.push({
                    severity: vscode.DiagnosticSeverity.Error,
                    range: new vscode.Range(i, 0, i, lines[i].length),
                    message: t('diag.const_must_init', match[2]),
                    source: 'godot-shader'
                });
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

    // 校验单个数字 token 是否为合法 Godot/GLSL 数值
    private isValidNumber(token: string): boolean {
        // 1. 十六进制浮点数: 0x1.0p3, 0x1.ap4f
        if (/^0[xX][0-9a-fA-F]+(\.[0-9a-fA-F]+)?[pP][+-]?\d+[fF]?$/.test(token)) return true;

        // 2. 十六进制/二进制整数: 0xFF, 0b1010, 0xFFu, 0b1010u
        //    以及简单位十进制数字后缀
        if (/^(0[xX][0-9a-fA-F]+|0[bB][01]+)[uU]?$/.test(token)) return true;

        // 3. 科学计数法浮点数: 1.5e3, 1e3, 1.5e-2, 1e+2f
        if (/^\d+\.\d*[eE][+-]?\d+[fF]?$/.test(token)) return true;
        if (/^\d+[eE][+-]?\d+[fF]?$/.test(token)) return true;

        // 4. 常规浮点数: 1.0, 1., .5, 1f, .5f, 1.5f
        if (/^\d+\.\d+[fF]?$/.test(token)) return true;
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

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const match = line.match(/^void\s+(\w+)\s*\(/);
            if (match) {
                const funcName = match[1];
                if (!available.includes(funcName)) {
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
                const idx = line.indexOf('discard');
                diagnostics.push({
                    severity: vscode.DiagnosticSeverity.Information,
                    range: new vscode.Range(i, idx, i, idx + 7),
                    message: t('diag.perf_discard_mobile'),
                    source: 'godot-shader'
                });
            }
        }
    }

    public dispose() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = undefined;
        }
        this.diagnosticCollection.dispose();
    }
}
