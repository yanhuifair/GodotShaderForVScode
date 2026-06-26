<!-- markdownlint-disable MD033 MD041 -->
<div align="center">

![VS Code](https://img.shields.io/badge/VS%20Code-1.120%2B-007ACC?logo=visualstudiocode&logoColor=white)
![Version](https://img.shields.io/badge/version-1.0.103-2ea44f)
![Lang](https://img.shields.io/badge/language-zh%2Fen-ff9800)
![License](https://img.shields.io/badge/license-MIT-blue)
![Stars](https://img.shields.io/github/stars/yanhuifair/Godot-Shader-For-VScode?style=flat-square)
[![Marketplace](https://img.shields.io/badge/VS%20Code%20Marketplace-Install-blue?logo=visualstudio)](https://marketplace.visualstudio.com/items?itemName=fairyan.godot-shader-for-vscode)

</div>

<p align="center">
  <img alt="logo" src="images/logo.png" width="128" />
</p>

# Godot Shader for VS Code

> 🌐 [English](./README.md)

最佳的 Godot Shader 开发插件 —— 20 个供应器，160+ 内置变量，74 个函数，65 个代码片段，完整中英双语。

---

## 安装

[![Marketplace](https://img.shields.io/visual-studio-marketplace/v/fairyan.godot-shader-for-vscode?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=fairyan.godot-shader-for-vscode)

### 方式一：VS Code 扩展商店（推荐）

1. 访问 [VS Code Marketplace](https://marketplace.visualstudio.com/)，搜索 **Godot Shader for VS Code**，或直接打开：[https://marketplace.visualstudio.com/items?itemName=fairyan.godot-shader-for-vscode](https://marketplace.visualstudio.com/items?itemName=fairyan.godot-shader-for-vscode)
2. 或在 VS Code 中，点击活动栏的**扩展**图标（或按 `Ctrl+Shift+X`），搜索 **Godot Shader for VS Code**
3. 点击**安装**

### 方式二：从源码构建

```bash
git clone https://github.com/yanhuifair/Godot-Shader-For-VScode.git
cd Godot-Shader-For-VScode
npm install
npx vsce package
```

然后在 VS Code 中：`Ctrl+Shift+P` → **Extensions: Install from VSIX...** → 选择生成的 `.vsix` 文件。

> 安装后，`.gdshader` 和 `.gdshaderinc` 文件自动激活——无需额外配置。

---

## 功能

### 代码智能

#### 上下文感知补全 —— `shader_type`、`render_mode`、`stencil_mode`、`uniform` 类型、`void` 函数、hint、`#include` 路径——全部根据当前着色器类型过滤。

```glsl
shader_type spatial;                    // ← spatial / canvas_item / sky / fog / particles
render_mode blend_mix, cull_disabled;   // ← 自动补全当前类型的有效模式
uniform float strength : hint_range(    // ← hint 补全（source_color、filter_linear …）
#                                       // ← 预处理器：#ifdef、#include、#define …
#include "                              // ← 工作区 .gdshaderinc 路径补全
```

#### 悬停文档

类型、描述、可用着色器类型、返回值范围和使用示例。

```glsl
sin(                                  // 悬停 → 签名：sin(float x)
dot(normal, light_dir)                // 悬停 → 返回：标量 | 示例：dot(normal, light_dir)
COLOR                                 // 悬停 → 类型：vec4 | 可用：canvas_item、spatial
```

#### 签名帮助

所有内置函数的参数提示。

```glsl
mix(█                                 // mix(vecX a, vecX b, float|vecX t)
clamp(█                               // clamp(vecX x, vecX|float min, vecX|float max)
```

#### 内联提示

参数名内联显示，包括用户自定义函数。可开关配置。

```glsl
mix(x: color1, y: color2, t: 0.5)    // 内置函数
my_func(n: 10, flag: true)            // 用户自定义函数
```

#### CodeLens

引用计数。

```glsl
uniform float strength;               // 3 references
void fragment() { … }                 // 1 reference
```

### 诊断

**17 条规则** —— 智能过滤，跳过注释和字符串。

```glsl
shader_type spatial;                  // ✅ 有效
shader_type unknown;                  // ❌ 无效的 shader_type: unknown

render_mode invalid_mode;             // ❌ 'invalid_mode' 对 spatial 无效

uniform int value;                    // ❌ 无效类型 'int'（uniform 不能用 int）

// { " }                               // ✅ 注释和字符串中的大括号被忽略
```

| 规则 | 示例 |
|------|---------|
| `shader_type` 校验 | `shader_type unknown;` → 错误 |
| 大括号匹配 | `void f() {` 缺 `}` → 缺少闭合大括号 |
| 分号 | `COLOR = vec3(1.0)` → 缺少 `;` |
| render_mode | `render_mode bad_mode;` → 对当前类型无效 |
| 保留字 | `void main() {}` → `main` 是保留字 |
| 内置变量作用域 | `EYEDIR` 在 spatial 中 → 不可用 |
| 重复声明 | 两个 `uniform float x;` → 重复 |
| const 初始化 | `const float x;` → 必须初始化 |
| 控制流 | `break` 在循环/switch 外 → 错误 |
| stencil_mode | `stencil_mode read;` 无 alpha → 警告 |
| 数字格式 | `1.5.5` → 无效数字 |
| 函数可用性 | `void sky()` 在 spatial 中 → 错误 |
| 未使用变量 | `uniform float x;` 从未使用 → 提示 |
| 性能（严格模式） | `discard` 在 fragment 中 → 信息 |
| 纹理在循环中（严格） | `for(…){ texture(…); }` → 警告 |

### 格式化

**全文档和范围格式化**，支持 switch/case、运算符间距、块注释保护。

```glsl
// 格式化前
void fragment(){COLOR=vec3(1.0,0.5,0.2);}

// 格式化后（Shift+Alt+F）
void fragment() {
    COLOR = vec3(1.0, 0.5, 0.2);
}
```

**可配置大括号风格** —— 同行（默认）或另起一行。

```glsl
// "godot-shader.formatting.braceNewLine": false（默认）
void fragment() {
    // …
}

// "godot-shader.formatting.braceNewLine": true
void fragment()
{
    // …
}
```

**预处理指令**始终顶格：

```glsl
// 无论嵌套多深，始终顶格
#ifdef DEBUG
#define MAX_ITER 32
#endif
```

### 导航

| 动作 | 快捷键 | 示例 |
|--------|----------|---------|
| 转到定义 | `F12` | `uniform float x` → 跳转到声明 |
| 查找引用 | `Shift+F12` | 显示符号的所有使用 |
| 重命名 | `F2` | 同时重命名所有出现 |
| 工作区符号 | `Ctrl+T` | 跨所有 `.gdshader` 文件搜索 uniform/函数 |
| 文档链接 | Ctrl+点击 | `#include "common.gdshaderinc"` → 打开文件 |
| 选择范围 | `Alt+Shift+→` | `单词` → `行` → `{ 块 }` → `void f() {…}` → 全文 |
| 大纲 | 侧栏 | 树形视图显示 uniform、varying、函数 |

### 视觉效果

**语义高亮** —— 每种 token 类型使用不同颜色：

```glsl
uniform float strength;     // 关键词  | 类型  | 变量名
COLOR = vec3(1.0, 0.5, 0.2); // 内置变量 | 类型 | 数字 | 数字 | 数字
void fragment() { … }       // 关键词  | 函数名
```

**`#if 0` 块变灰** —— 禁用的代码视觉淡化：

```glsl
#if 0
// 这里的所有内容显示为灰色
vec3 disabled_color = vec3(1.0, 0.0, 0.0);
float disabled_value = 1.0;
#endif
```

**颜色选择器** —— 点击颜色值：

```glsl
vec3 sky = vec3(0.3, 0.5, 1.0);     // 点击 vec3 → 颜色选择器
vec4 col = vec4(1.0, 0.5, 0.2, 1.0); // 点击 vec4 → 颜色选择器
#define BG_COLOR #478cbf             // 点击十六进制 → 颜色选择器
```

**状态栏** —— 右下角显示当前着色器类型。

### 快速修复（`Ctrl+.`）

```glsl
// 修复前：缺少分号
vec3 col = vec3(1.0)
// 快速修复：添加 ;

// 修复前：无 shader_type
render_mode unshaded;
// 快速修复：添加 shader_type canvas_item;

// 修复前：缺少闭合大括号
void fragment() {
    COLOR = vec3(1.0);
// 快速修复：添加 }
```

---

## 使用

| 快捷键 | 动作 |
|----------|--------|
| `Ctrl+Space` | 触发补全 |
| `Shift+Alt+F` | 格式化文档 |
| `F12` | 转到定义 |
| `Shift+F12` | 查找引用 |
| `F2` | 重命名符号 |
| `Ctrl+T` | 工作区符号 |
| `Ctrl+.` | 快速修复 |
| `Alt+Shift+→` | 展开选择 |

<details>
<summary><b>代码片段</b>（65 个）</summary>

| 前缀 | 输出 |
|--------|--------|
| `shader-{canvas,spatial,sky,fog,particles}` | 完整着色器模板 |
| `shader-{canvas,spatial}-full` | 包含所有段的模板 |
| `func-{vertex,fragment,light}` `sky-func` `fog-func` | 函数桩 |
| `uniform` `uniform-{range,color,texture,filter}` | uniform 声明 |
| `varying` | varying 声明 |
| `if` `ifelse` `for` `switch` | 控制流 |
| `set-{color,albedo,metallic,roughness,emission}` | 输出赋值 |
| `ctor-{vec2,vec3,vec4,mat4}` | 构造函数 |
| `math-{clamp,lerp,normalize}` | 数学运算 |
| `sample-{texture,texturelod}` | 纹理采样 |
| `#ifdef` `#ifndef` `#include` | 预处理器（自动插入 `#endif`） |
</details>

---

## 配置

| 设置 | 默认值 | 描述 |
|---------|---------|-------------|
| `godot-shader.general.language` | `en` | 界面语言：`en` / `zh` |
| `godot-shader.diagnostics.checkBuiltinScope` | `true` | 按着色器类型校验内置变量作用域 |
| `godot-shader.diagnostics.strictMode` | `false` | 额外警告（discard 性能、循环内纹理） |
| `godot-shader.formatting.braceNewLine` | `false` | 大括号另起一行 |
| `godot-shader.inlayHints.showParameterNames` | `true` | 显示参数名提示 |
| `godot-shader.colorPicker.enabled` | `true` | 为颜色值显示颜色选择器 |

---

## 项目结构

```text
src/
  extension.ts              # 入口 —— 注册所有供应器
  shader-data.ts             # 160+ 内置变量、74 个函数、类型、关键词、渲染模式
  i18n.ts                    # 中英双语翻译
  en-descriptions.ts         # 380+ 英文描述
  utils.ts                   # 共享工具函数
  features/
    completion.ts            # 上下文感知补全 + #include 路径 + 预处理器
    hover.ts                 # 悬停文档 + 示例 + 返回值
    diagnostics.ts           # 17 条诊断规则
    formatting.ts            # 文档与范围格式化 + 大括号风格
    signature-help.ts        # 函数参数提示
    code-actions.ts          # 快速修复
    folding.ts               # 代码折叠（大括号 + 函数检测）
    semantic-tokens.ts       # 语义高亮 + #if 0 变灰
    definition.ts            # 转到定义 + #include 跳转
    references.ts            # 查找所有引用
    rename.ts                # 符号重命名
    highlight.ts             # 文档高亮
    color-picker.ts          # vec3/vec4/十六进制颜色选择器
    workspace-symbols.ts     # 跨文件符号搜索（缓存）
    symbol-provider.ts       # 大纲与面包屑
    inlay-hints.ts           # 参数名提示（内置 + 用户函数）
    code-lens.ts             # 引用计数 CodeLens
    document-links.ts        # #include 可点击链接
    selection-range.ts       # 智能选择展开
syntaxes/
  godot-shader.tmLanguage.json   # TextMate 语法
snippets/
  godot-shader.json              # 65 个代码片段
```

---

## 许可证

MIT © [Fair Yan](https://github.com/yanhuifair)

---

## 赞赏
<div align="left">
  <img alt="Appreciate" src="images/appreciate.JPG" width="300" />
</div>


## Star 历史

<a href="https://www.star-history.com/?repos=yanhuifair%2FGodot-Shader-For-VScode&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=yanhuifair/Godot-Shader-For-VScode&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=yanhuifair/Godot-Shader-For-VScode&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=yanhuifair/Godot-Shader-For-VScode&type=date&legend=top-left" />
 </picture>
</a>
