import * as vscode from 'vscode';
import { GodotShaderCompletionProvider } from './features/completion';
import { GodotShaderHoverProvider } from './features/hover';
import { GodotShaderFormatter } from './features/formatting';
import { GodotShaderDiagnosticProvider } from './features/diagnostics';
import { GodotShaderSignatureHelpProvider } from './features/signature-help';
import { GodotShaderCodeActionProvider } from './features/code-actions';
import { GodotShaderFoldingRangeProvider } from './features/folding';
import { GodotShaderSemanticTokensProvider, getSemanticTokensLegend } from './features/semantic-tokens';
import { GodotShaderDefinitionProvider } from './features/definition';
import { GodotShaderReferenceProvider } from './features/references';
import { GodotShaderColorProvider } from './features/color-picker';
import { GodotShaderWorkspaceSymbolProvider } from './features/workspace-symbols';
import { GodotShaderRenameProvider } from './features/rename';
import { GodotShaderHighlightProvider } from './features/highlight';
import { GodotShaderDocumentSymbolProvider } from './features/symbol-provider';
import { GodotShaderInlayHintsProvider } from './features/inlay-hints';
import { GodotShaderCodeLensProvider } from './features/code-lens';
import { GodotShaderDocumentLinkProvider } from './features/document-links';
import { GodotShaderSelectionRangeProvider } from './features/selection-range';
import { t } from './i18n';

export function activate(context: vscode.ExtensionContext) {
    console.log('Godot Shader extension is now active!');

    // 状态栏
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right, 100
    );
    statusBarItem.command = undefined;
    statusBarItem.tooltip = t('statusbar.tooltip');
    context.subscriptions.push(statusBarItem);

    const updateStatusBar = () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'godot-shader') {
            statusBarItem.hide();
            return;
        }
        const match = editor.document.getText().match(/^shader_type\s+(\w+)/m);
        statusBarItem.text = `$(symbol-namespace) ${match ? match[1] : t('statusbar.unknown')}`;
        statusBarItem.show();
    };

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(updateStatusBar),
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.languageId === 'godot-shader') updateStatusBar();
        })
    );
    updateStatusBar();

    // Provider 注册辅助
    const LANG = { language: 'godot-shader', scheme: 'file' } as const;
    const push = (d: vscode.Disposable) => context.subscriptions.push(d);

    // 监听 .gdshader 文件变化以失效工作区符号缓存
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.gdshader');
    watcher.onDidChange(() => GodotShaderWorkspaceSymbolProvider.invalidateCache());
    watcher.onDidCreate(() => GodotShaderWorkspaceSymbolProvider.invalidateCache());
    watcher.onDidDelete(() => GodotShaderWorkspaceSymbolProvider.invalidateCache());
    push(watcher);

    // 代码补全
    push(vscode.languages.registerCompletionItemProvider(LANG,
        new GodotShaderCompletionProvider(),
        ...GodotShaderCompletionProvider.triggerCharacters));

    // 悬停提示
    push(vscode.languages.registerHoverProvider(LANG, new GodotShaderHoverProvider()));

    // 格式化
    const formatter = new GodotShaderFormatter();
    push(vscode.languages.registerDocumentFormattingEditProvider(LANG, formatter));
    push(vscode.languages.registerDocumentRangeFormattingEditProvider(LANG, formatter));

    // 诊断
    new GodotShaderDiagnosticProvider().activate(context);

    // 函数签名
    push(vscode.languages.registerSignatureHelpProvider(LANG,
        new GodotShaderSignatureHelpProvider(), '(', ','));

    // 快速修复
    push(vscode.languages.registerCodeActionsProvider(LANG,
        new GodotShaderCodeActionProvider(),
        { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }));

    // 代码折叠
    push(vscode.languages.registerFoldingRangeProvider(LANG, new GodotShaderFoldingRangeProvider()));

    // 语义着色
    push(vscode.languages.registerDocumentSemanticTokensProvider(LANG,
        new GodotShaderSemanticTokensProvider(), getSemanticTokensLegend()));

    // 跳转定义
    push(vscode.languages.registerDefinitionProvider(LANG, new GodotShaderDefinitionProvider()));

    // 查找引用
    push(vscode.languages.registerReferenceProvider(LANG, new GodotShaderReferenceProvider()));

    // 颜色选择器 — 配置变更时重新注册以即时刷新
    let colorProviderDisposable = vscode.languages.registerColorProvider(LANG, new GodotShaderColorProvider());
    push(colorProviderDisposable);
    push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('godot-shader.colorPicker.enabled')) {
            colorProviderDisposable.dispose();
            colorProviderDisposable = vscode.languages.registerColorProvider(LANG, new GodotShaderColorProvider());
            push(colorProviderDisposable);
        }
    }));

    // 工作区符号
    push(vscode.languages.registerWorkspaceSymbolProvider(new GodotShaderWorkspaceSymbolProvider()));

    // 重命名
    push(vscode.languages.registerRenameProvider(LANG, new GodotShaderRenameProvider()));

    // 文档高亮
    push(vscode.languages.registerDocumentHighlightProvider(LANG, new GodotShaderHighlightProvider()));

    // 大纲符号
    push(vscode.languages.registerDocumentSymbolProvider(LANG, new GodotShaderDocumentSymbolProvider()));

    // Inlay Hints — 函数调用时显示参数名提示
    push(vscode.languages.registerInlayHintsProvider(LANG, new GodotShaderInlayHintsProvider()));

    // CodeLens — 显示 uniform/varying/const 引用计数
    const codeLensProvider = new GodotShaderCodeLensProvider();
    push(vscode.languages.registerCodeLensProvider(LANG, codeLensProvider));
    // 当文档变化时刷新 CodeLens
    push(vscode.workspace.onDidChangeTextDocument(e => {
        if (e.document.languageId === 'godot-shader') {
            codeLensProvider.refresh();
        }
    }));

    // Document Links — #include "path" 可点击跳转
    push(vscode.languages.registerDocumentLinkProvider(LANG, new GodotShaderDocumentLinkProvider()));

    // Selection Range — 智能选区逐级扩展（Alt+Shift+→）
    push(vscode.languages.registerSelectionRangeProvider(LANG, new GodotShaderSelectionRangeProvider()));
}

export function deactivate() {
    console.log('Godot Shader extension is now deactivated!');
}
