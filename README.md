# AI Tell AI — AI 教你学 AI

> 用 AI 生成、人工校验的方式，构建 Agent 学习知识图谱。  
> 每个概念都是一个可链接的节点，所有节点共同构成一张可以漫游的知识地图。

---

## 这个项目是什么

一份**不一样的 AI 学习笔记**：

- 内容由 AI 生成初稿，人工校验 + 注入个人理解
- 每个知识点是独立文档，通过双链形成网状图谱
- 配套 30 天 Agent 学习路线，学习过程即内容产出
- 用 Obsidian 打开，可视化浏览整个知识图谱

普通学习笔记是线性的流水账，这里是**可以漫游的知识地图**。

---

## 快速开始

**第一步：clone 项目**

```bash
git clone https://github.com/your-username/ai-tell-ai.git
```

**第二步：用 Obsidian 打开**

1. 打开 Obsidian → Open folder as vault
2. 选择 `ai-tell-ai/` 根目录
3. 点击左侧图谱视图（Graph View）

你会看到这样的知识图谱：

```
concept-agent ─── pattern-tool-use
      │                  │
concept-workflow    pattern-planning
      │                  │
   concept-llm    pattern-reflection
                         │
                  pattern-multi-agent
```

**第三步：开始学习**

按 `30天-agent学习路线/README.md` 的日历执行，每天学完后：
1. 用 `templates/template-daily-note.md` 写当日笔记
2. 用 `templates/template-knowledge-node.md` 生成新的知识节点
3. 在图谱中确认新节点已连接

---

## 项目结构

```
ai-tell-ai/
├── README.md                        ← 你在这里
├── 30天-agent学习路线/
│   ├── README.md                    ← 30 天学习日历
│   ├── PROJECT-PLAN.md              ← 项目设计规划
│   └── notes/                       ← 每日学习笔记
│
├── trends/                          ← AI 趋势日报（YYYY-MM-DD/index.md + index.html）
│   ├── README.md                    ← SOP 与主源清单
│   ├── weekly/                      ← 周报（可选）
│   └── prompts/                     ← Cursor Agent 生成提示词
│
├── concepts/                        ← 概念类：是什么
├── principles/                      ← 原理类：为什么
├── techniques/                      ← 技术类：怎么做
├── tools/                           ← 工具类：用什么
├── patterns/                        ← 模式类：套路
├── resources/                       ← 资源类：去哪学
└── templates/                       ← 文档模板
```

### 知识节点分类

| 类型 | 目录 | 例子 |
|------|------|------|
| concept | concepts/ | Agent、LLM、Context Window |
| principle | principles/ | Attention 机制、Token 预测 |
| technique | techniques/ | Prompt Engineering、RAG、CoT |
| tool | tools/ | MCP、LangChain、vLLM |
| pattern | patterns/ | Reflection、Tool Use、Planning |
| resource | resources/ | Karpathy 课程、Anthropic 文档 |

---

## 知识节点格式

每个节点文档统一结构，**从上到下越来越深**：

```
⚡ 30 秒速览    ← 3 句话，独立可读
🧠 深入理解    ← 完整讲解
💡 示例        ← 具体例子
⚠️ 常见误区    ← 容易踩的坑
💬 我的理解    ← 个人注释，AI 生成内容里的人味
🔗 关联概念    ← 双链，构成图谱边
📚 延伸阅读    ← 指向 resource 节点或外部链接
```

---

## AI 教 AI 的工作方式

每个节点的生产流程：

```
1. 学习日历触发某个概念
2. 让 AI 按模板生成初稿
3. 对照原始资料校验，标注不准确的地方
4. 写入「我的理解」——这是最不能省的一步
5. 补充 related 字段，在图谱中连线
6. 学到更深时回来迭代
```

---

## 当前进度

```
学习进度：D__ / 30
开始日期：____-__-__
知识节点：__ 个
图谱连接：__ 条
```

---

## 贡献指南

欢迎提 PR 补充或修正知识节点：

1. fork 本仓库
2. 按 `templates/template-knowledge-node.md` 新建节点，或修正已有节点
3. 确保 `related` 字段正确链接到相关节点
4. commit message 格式：`add: concept-xxx` 或 `fix: pattern-xxx 误区描述`
5. 提 PR，说明新增节点解决了什么学习问题

**不接受的贡献：**
- 没有 30 秒速览的节点
- 没有任何 related 链接的孤立节点
- 纯转载，没有个人理解或校验

---

## License

MIT
