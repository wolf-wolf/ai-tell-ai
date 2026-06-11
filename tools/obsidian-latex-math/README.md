# AI LaTeX Math（Obsidian 插件）

## 问题

Obsidian **内置** MathJax，但只识别：

- 行内：`$...$`
- 块级：`$$...$$`

仓库知识节点常用 LaTeX 标准写法：

```markdown
\[
\text{Recall@K} = \frac{...}{...}
\]
```

Markdown 会把 `\[`、`\]` **当作转义**，预览里变成纯文本 `[ \text{Recall@K} = ... ]`，不会走公式渲染。

## 本插件做什么

1. **阅读/预览模式**：用 `loadMathJax()` 后处理，识别并渲染：
   - 被转义后的 `[ ... ]` 块（内含 `\frac`、`\text` 等 LaTeX 命令）
   - 若源码写 `\\[` / `\\]` 或 `\\(` / `\\)` 也能识别
2. **命令「转换当前笔记为 Obsidian 公式」**：把 `\[` `\]` → `$$`，`\(` `\)` → `$`，改源码后可用原生公式（不依赖插件）

## 安装

```bash
./tools/obsidian-latex-math/install.sh
```

Obsidian → 设置 → 社区插件 → 启用 **AI LaTeX Math**。

## 推荐写法（长期）

新建笔记优先直接用 Obsidian 原生语法：

```markdown
$$
\text{Recall@K} = \frac{|\{\text{相关文档}\} \cap \{\text{Top-K 返回}\}|}{|\{\text{相关文档}\}|}
$$
```

已有 `\[` 笔记可运行命令批量转换，或靠本插件自动渲染。

## 命令

| 命令 | 说明 |
|------|------|
| LaTeX Math: 重新加载本插件 | 热重载 |
| LaTeX Math: 转换当前笔记为 Obsidian 公式 | 改源码为 `$$` / `$` |
| LaTeX Math: 刷新当前页公式 | 重跑后处理 |

## 开发

与 `obsidian-mermaid-preview` 相同：改 `main.js` 后执行 `install.sh`，Obsidian 内 Cmd+P 重载。
