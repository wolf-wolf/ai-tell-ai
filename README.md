# AI Tell AI — AI 教你学 AI

> 个人 AI 知识库：在 Obsidian 里用双链漫游 **docs/** 知识图谱。

---

## 用 Obsidian 打开

1. **Open folder as vault** → 选本仓库根目录  
2. 打开 [map.md](map.md) — 知识地图入口（比文件树更适合找主题）  
3. 侧边栏 **Graph view** — 看节点如何连成网  

在 Obsidian 里，`[[wikilink]]` 会在节点之间跳转；frontmatter 里的 `related` / `prerequisites` 与正文双链一起构成图谱边。

---

## 日常怎么用

### 读知识

| 你想… | 打开 |
|--------|------|
| 从骨架选主题 | [map.md](map.md) |
| 查目录规则 | [docs/STRUCTURE.md](docs/STRUCTURE.md) |
| 读模式速览（尚无独立 wiki） | [docs/topic-overviews/map.md](docs/topic-overviews/map.md) |
| 写/改节点格式 | [writing-rules.md](writing-rules.md) |

正文在 `docs/`：`model/` → `methodology/` → `agent/`，另有 `algorithms/`、`latest/` 等，详见 map。

---

## Obsidian 插件（可选）

仓库自带社区插件，装一次即可在本 Vault 使用：

```bash
bash tools/obsidian-read-tracker/install.sh
bash tools/obsidian-cursor-chat/install.sh
bash tools/obsidian-mermaid-preview/install.sh
```

然后在 Obsidian：**设置 → 社区插件** → 关闭限制模式 → 启用对应插件。

| 插件 | 怎么用 |
|------|--------|
| **AI Read Tracker** | 左侧书本图标或 `Cmd+P` →「打开全库阅读统计」：热力图、阅读雷达、笔记列表；状态栏可看当前笔记打开次数 |
| **AI Cursor Chat** | 侧栏与 Cursor Agent 对话，工作区即当前 Vault；可把选区或当前笔记带入上下文（需本机 [Cursor CLI](https://cursor.com/docs/cli) 且已 `agent login`） |
| **AI Mermaid Preview** | 阅读/预览模式下 Mermaid 更清晰：主题跟随、可调字号、全屏缩放；见 `tools/obsidian-mermaid-preview/README.md` |

改插件代码后重新执行对应 `install.sh`，再 `Cmd+P` →「重新加载本插件」。细节见 `tools/*/README.md`。

---

## 写新节点

1. 复制 [templates/template-knowledge-node.md](templates/template-knowledge-node.md)（或用 Cursor skill 模板 [`.cursor/skills/ai-tell-ai-knowledge-doc/templates/knowledge-article.md`](.cursor/skills/ai-tell-ai-knowledge-doc/templates/knowledge-article.md)）  
2. 按 [writing-rules.md](writing-rules.md) 写 frontmatter 与章节；在 Cursor 中可调用 skill **ai-tell-ai-knowledge-doc** 代写/扩写  
3. 在 `related` 和正文里连到已有节点，保存后在 Graph view 确认已入网  

---

## License

MIT
