# AI Bold Snippet

优化 Obsidian **正文加粗**（`**概念名**`）在阅读模式与 Live Preview 下的展示：纯正文字重强调，不加底色、不下划线，避免与行内代码的 accent 色块争抢视线。

仅作用于段落、列表、表格单元格与引用块内的 `strong`，不影响标题。

与 [ai-inline-code](../obsidian-inline-code-snippet/) 视觉区分：

| 标记 | 语义 | 样式 |
| --- | --- | --- |
| `**加粗**` | 概念与机制名 | 正文色、`font-weight: 700`、极淡描边补强 |
| `` `反引号` `` | 工具名、API、配置键 | 等宽、accent 字色、浅底 + 边框 |

色彩高亮只留给行内代码；加粗靠字重融入正文，整页更干净。

## 安装

在仓库根目录执行：

```bash
bash tools/obsidian-bold-snippet/install.sh
```

若 Vault 不在本仓库，可指定路径：

```bash
VAULT=/path/to/your/vault bash tools/obsidian-bold-snippet/install.sh
```

然后在 Obsidian 中：

1. **设置 → 外观 → CSS 代码片段** → 点刷新图标
2. 确认 **ai-bold** 已开启
3. 打开含 `**加粗**` 与 `` `code` `` 混排的笔记查看效果

## 微调

编辑 `.obsidian/snippets/ai-bold.css` 顶部的 CSS 变量：

| 变量 | 默认 | 作用 |
| --- | --- | --- |
| `--ai-bold-weight` | `700` | 字重 |
| `--ai-bold-color` | `var(--text-normal)` | 字色（与正文一致） |
| `--ai-bold-shadow` | 极淡双向描边 | 中文字体粗体不明显时的补强；设为 `none` 可关闭 |

保存后 Obsidian 通常会自动热重载；若无变化，`Cmd+P` → **Reload app without saving**。

## 更新

修改 `tools/obsidian-bold-snippet/bold.css` 后重新执行 `install.sh` 覆盖 Vault 内 snippet 即可。
