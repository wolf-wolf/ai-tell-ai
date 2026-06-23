# AI Mermaid Preview

增强 Obsidian **阅读模式 / Live Preview** 里的 Mermaid 图：更大字号、跟随主题配色、卡片式留白、工具栏与全屏缩放查看。

## 安装

```bash
bash tools/obsidian-mermaid-preview/install.sh
```

Obsidian：**设置 → 社区插件** → 关闭限制模式 → 启用 **AI Mermaid Preview**。

## 功能

| 能力 | 说明 |
|------|------|
| 自定义渲染 | 以更高优先级接管 ` ```mermaid ` 代码块，使用 Obsidian 内置 `loadMermaid()` |
| 紧凑布局 | 默认收紧 `nodeSpacing` / `rankSpacing` / 字号，减少「内容少图却很大」 |
| 内联适应视口 | 按笔记栏宽 + 最大高度等比缩放，决策树类 TD 图尽量一屏可见 |
| 主题跟随 | `auto` 随明暗模式切换；颜色读取 `--text-normal` 等 CSS 变量 |
| 可读性 | 可调字号、略增线条粗细、裁切 SVG 多余留白 |
| 全屏 | 工具栏「全屏」或 **双击** 图表：滚轮缩放、拖拽平移 |
| 内置块增强 | 可选对 Obsidian 默认已渲染块加卡片样式与适应视口（不强制重绘） |

## 设置

**设置 → AI Mermaid Preview**：字号、紧凑布局、内联最大高度、主题、内边距、是否全屏等。

默认（v0.2.1）：字号 **12**、**紧凑布局** 开、**内联适应视口** 开、最大高度 **480px**、节点边框 **1.25px**。工具栏 **⊡** 可手动重新适应当前图。

## 更新插件代码后

```bash
bash tools/obsidian-mermaid-preview/install.sh
```

`Cmd+P` → **Mermaid Preview: 重新加载本插件**

## 说明

- 通过 Obsidian 官方 `loadMermaid()` 加载内置 Mermaid（**不是** `window.mermaid`）；需 Obsidian **1.5+**。
- 若某条语法报错，会显示错误信息并保留源码便于修改。
- 与 **AI Cursor Chat** 侧栏里的 Mermaid 缩放逻辑独立；本插件作用于 Vault 内所有笔记预览。
