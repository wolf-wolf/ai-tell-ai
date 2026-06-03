---
tags: [trends, daily-insight]
aliases: []
date: YYYY-MM-DD
stability: short
related: []
---

# AI 趋势日报 — YYYY-MM-DD

> 观测窗口：YYYY-MM-DD（本地日历日）  
> 阅读目标：约 15–25 分钟  

---

## 一、GitHub 动态增长（看增速，非总 Star）

```json
{
  "schema_version": 2,
  "kind": "github-growth",
  "signals": [
    {
      "tier": "选型级",
      "title": "owner/repo",
      "url": "https://github.com/owner/repo",
      "metric": "",
      "hook": "",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "2–3 句自然段：事实、对比、来源。可用无标题 `-` 列表，禁止「机制：」式标签。",
      "action": ""
    }
  ]
}
```

**数据源**：GitHub Trending（today/weekly）；Star 经 API 核对。

---

## 二、GitHub 新颖探索（< 5k ★ 或新发布，含社区讨论）

```json
{
  "schema_version": 2,
  "kind": "github-novel",
  "signals": []
}
```

---

## 三、HuggingFace 动态

```json
{
  "schema_version": 2,
  "kind": "huggingface",
  "signals": []
}
```

---

## 四、大公司动态

### 4.1 英文大厂

```json
{
  "schema_version": 2,
  "kind": "bigtech",
  "signals": []
}
```

### 4.2 中文生态

```json
{
  "schema_version": 2,
  "kind": "bigtech",
  "signals": []
}
```

---

## 五、论文速览（arxiv 近 1–3 日）

```json
{
  "schema_version": 2,
  "kind": "papers",
  "signals": []
}
```

---

## 六、今日关键判断

（2–3 段自然段：今日主线如何收敛、对 Agent 栈的含义；勿用编号、[方向级]、层级/一句话 等小标题）

---

## 七、深读 1 条

- **分级**：`[方向级]`
- **对象**：论文/项目标题（含 arXiv 编号）
- **链接**：主链 · 实现仓库 · 其他
- **正文**：（2–4 段自然段，勿用「背景/做了什么/关键数字/学习路径」等小标题）
  - 第 1 段：这是什么、解决什么问题
  - 第 2 段：核心做法与关键数字（数字写在句子里）
  - 第 3 段：对 Agent / 行业技术栈的影响与局限
  - 可用无标题 `-` 列表，但不要「机制：」式标签
- **知识库节点**：待建 `节点名`（可选单行）

---

## 八、跟进

- [ ] 观察 —
- [ ] 升格 — [[待建文件名]]

---

## 九、与昨日衔接

- 昨日：[[YYYY-MM-DD]]
- 周信号：

---

## 十、疑问 / 待查

- 
