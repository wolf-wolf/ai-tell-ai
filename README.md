# AI Tell AI — AI 教你学 AI

> 个人 AI 知识库：用 Obsidian 双链组织**可长期迭代的 wiki**，并用 `trends/` 记录**可验证的每日生态信号**。  
> 内容由 AI 辅助起草，人工校验；「我的理解」与图谱连线是不可省略的一步。

---

## 这个仓库里有什么

两套内容，分工不同：

| 体系 | 位置 | 时效 | 读什么 |
|------|------|------|--------|
| **知识图谱** | `docs/` + [map.md](map.md) | 长期（按 `stability` 标注） | 模型 → 方法论 → Agent 的因果链与机制 |
| **趋势日报** | `trends/YYYY-MM-DD/` | 短（按日归档） | GitHub / HF / 大厂 / 论文等多源信号；**日常看 `index.html`** |

稳定、值得深挖的主题写在 `docs/`；同一主题在趋势里连续出现且边界清晰后，可升格为 `docs/latest/` 等节点。规则见 [trends/README.md](trends/README.md)。

---

## 快速开始

### 1. 用 Obsidian 打开本仓库

1. Obsidian → **Open folder as vault** → 选择仓库根目录  
2. 从 [map.md](map.md) 进入（知识地图骨架，不是文件树目录）  
3. 打开 **Graph View** 查看节点之间的双链关系  

### 2. 读知识节点

- 目录怎么分、新文章放哪：[docs/STRUCTURE.md](docs/STRUCTURE.md)  
- 单篇怎么写（frontmatter、章节顺序）：[writing-rules.md](writing-rules.md)  
- 尚无独立 wiki 的速览文：[docs/topic-overviews/map.md](docs/topic-overviews/map.md)  

新建节点可复制 [templates/template-knowledge-node.md](templates/template-knowledge-node.md)，但以 `writing-rules.md` 为准（当前正文多用 Obsidian callout，而非旧版 emoji 小节标题）。

### 3. 看趋势日报

```bash
# 浏览器阅读（推荐）
open trends/$(date +%Y-%m-%d)/index.html

# 或读 Markdown 源稿
open trends/$(date +%Y-%m-%d)/index.md
```

生成、校验、定时任务说明见 [trends/README.md](trends/README.md)。本地一键生成：

```bash
./scripts/generate-trends.sh              # 今天
./scripts/install-trends-schedule.sh    # macOS：可选，每天定时（需 Cursor CLI）
```

---

## 知识分层（因果链）

```
模型层 docs/model/     →  LLM 是什么、怎么训练、机制与边界
方法论 docs/methodology/ →  怎么和模型协作（Prompt / Context / Harness …）
应用层 docs/agent/     →  怎么做成 Agent 系统（RAG、Tool、Skill、多 Agent …）
```

此外还有：

- **算法与度量** — `docs/algorithms/`（BM25、余弦相似度、RRF、ANN …）  
- **前沿产品** — `docs/latest/`（演化快，版本敏感）  
- **工具笔记** — `docs/tools/`（如 Obsidian 用法）  

完整索引与稳定性标注（`permanent` / `long` / `mid` / `short`）见 [map.md](map.md)。

---

## 仓库结构

```
ai-tell-ai/
├── README.md                 # 本文件
├── map.md                    # 知识地图总入口（Obsidian 内优先打开）
├── writing-rules.md          # 知识节点写作规范
├── docs/                     # 知识节点正文
│   ├── STRUCTURE.md          # 目录决策树与 wikilink 约定
│   ├── model/                # 概念、机制、训练 …
│   ├── methodology/
│   ├── agent/                # core / pattern / retrieval / skill / tool …
│   ├── algorithms/
│   ├── latest/
│   ├── topic-overviews/      # 模式速览（map.md 索引）
│   ├── data/                 # 数据工程（占位扩展）
│   └── tools/
├── trends/                   # 每日趋势（index.md + index.html）
│   ├── README.md             # SOP、主源、升格规则
│   ├── prompts/              # Agent 生成与检索提示词
│   ├── schema/               # 信号 JSON 契约
│   └── YYYY-MM-DD/
├── templates/                # 知识节点、趋势日报、周报等模板
├── scripts/                  # 趋势流水线（generate / validate / render …）
├── tools/                    # 自研 Obsidian 插件源码
│   ├── obsidian-read-tracker/  # 阅读统计、热力图、雷达图
│   └── obsidian-cursor-chat/   # 侧栏对接 Cursor Agent CLI
└── assets/                   # 配图等静态资源
```

**默认不纳入版本库**（见 [.gitignore](.gitignore)）：`.obsidian/plugins/`、`_meta/`、`30天-agent学习路线/`、`new-idea/`、`resources/`、`trends/.logs/`、`trends/*/.research/` 等。克隆后插件需本地安装，见各 `tools/*/README.md`。

---

## 可选：Obsidian 插件

在仓库根目录安装到当前 Vault：

```bash
bash tools/obsidian-read-tracker/install.sh   # 阅读次数、热力图、Top 笔记雷达
bash tools/obsidian-cursor-chat/install.sh    # 侧栏 Cursor Agent（需本机 agent CLI）
```

启用：**设置 → 社区插件** → 关闭限制模式 → 打开对应插件。改代码后 `Cmd+P` →「重新加载本插件」。

| 插件 | 作用 |
|------|------|
| AI Read Tracker | 侧栏阅读统计；热力图按日打开次数；笔记雷达 Top N |
| AI Cursor Chat | 在 Obsidian 内对当前 Vault 发 Agent 任务，可附带选区/当前笔记 |

---

## 知识节点怎么产出

```
选定主题（阅读、趋势升格、或 map 上的缺口）
    → AI 按 writing-rules + 模板起草
    → 对照来源校验
    → 写清「我的理解」/ callout 里的个人判断
    → 维护 related / prerequisites，在图谱中连线
    → 学到更深时迭代；stability 标短的主题优先跟 trends 对齐更新
```

---

## 贡献

欢迎 PR 修正或补充 **docs/** 下的节点：

1. 遵守 [writing-rules.md](writing-rules.md) 与 [docs/STRUCTURE.md](docs/STRUCTURE.md)  
2. 新节点需有 `related`（或 `prerequisites`），避免孤立页  
3. 标明 `stability` / `layer`；勿把未核实传闻写成 `long`  
4. Commit 建议：`add: docs/agent/foo.md`、`fix: algorithms/bm25 误区`  

**趋势日报**由本地 Agent 流水线生成，一般不通过 PR 批量提交当日 `.research/` 底稿。

---

## License

MIT
