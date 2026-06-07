# AI Table Snippet

让 Obsidian 表格字号比正文**小一号**（默认 `0.875em`），阅读模式与 Live Preview 均生效。

## 安装

```bash
bash tools/obsidian-table-snippet/install.sh
```

Vault 不在本仓库时：

```bash
VAULT=/path/to/your/vault bash tools/obsidian-table-snippet/install.sh
```

然后在 Obsidian：**设置 → 外观 → CSS 代码片段** → 刷新 → 确认 **ai-table** 已开启。

## 微调

编辑 `.obsidian/snippets/ai-table.css`：

| 变量 | 默认 | 作用 |
| --- | --- | --- |
| `--ai-table-size` | `0.875em` | 相对正文的表格字号 |

## 更新

修改 `tools/obsidian-table-snippet/table.css` 后重新执行 `install.sh`。
