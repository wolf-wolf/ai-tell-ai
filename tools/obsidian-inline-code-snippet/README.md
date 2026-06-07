# AI Inline Code Snippet

优化 Obsidian **行内代码**（`` `like this` ``）在阅读模式与 Live Preview 下的展示：略小字号、muted 字色、浅底、无边框、**斜体**——低调技术标记，不与正文加粗争抢视线。代码块（` ``` `）不受影响。

不影响 fenced code block（` ``` `）与 Mermaid 块。

## 安装

在仓库根目录执行：

```bash
bash tools/obsidian-inline-code-snippet/install.sh
```

若 Vault 不在本仓库，可指定路径：

```bash
VAULT=/path/to/your/vault bash tools/obsidian-inline-code-snippet/install.sh
```

然后在 Obsidian 中：

1. **设置 → 外观 → CSS 代码片段** → 点刷新图标
2. 确认 **ai-inline-code** 已开启（`install.sh` 会尝试写入 `appearance.json` 自动启用）
3. 打开任意含 `` `术语` `` 的笔记查看效果

## 微调

编辑 `.obsidian/snippets/ai-inline-code.css` 顶部的 CSS 变量，例如：

| 变量 | 默认 | 作用 |
| --- | --- | --- |
| `--ai-inline-code-size` | `0.86em` | 相对正文字号 |
| `--ai-inline-code-fg` | `var(--text-muted)` | 字色 |
| `--ai-inline-code-bg` | `var(--background-modifier-form-field)` | 背景 |
| `--ai-inline-code-border` | `transparent` | 边框 |
| `--ai-inline-code-style` | `italic` | 字形（`normal` 可关斜体） |
| `--ai-inline-code-radius` | `3px` | 圆角 |

保存后 Obsidian 通常会自动热重载；若无变化，`Cmd+P` → **Reload app without saving**。

## 更新

修改 `tools/obsidian-inline-code-snippet/inline-code.css` 后重新执行 `install.sh` 覆盖 Vault 内 snippet 即可。
