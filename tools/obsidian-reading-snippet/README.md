# AI Reading Snippet

放宽 Obsidian 正文阅读排版：略增字间距与行高，减轻「挤在一起」的观感。阅读模式与 Live Preview 均生效；代码块/行内代码保持 `letter-spacing: normal`。

## 安装

```bash
bash tools/obsidian-reading-snippet/install.sh
```

## 微调

编辑 `.obsidian/snippets/ai-reading.css`：

| 变量 | 默认 | 作用 |
| --- | --- | --- |
| `--ai-body-letter-spacing` | `0.03em` | 正文字间距 |
| `--ai-body-line-height` | `1.72` | 正文行高 |

## 更新

修改 `tools/obsidian-reading-snippet/reading.css` 后重新执行 `install.sh`。
