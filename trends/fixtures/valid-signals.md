# Fixture — valid JSON + matching research

## 一、GitHub 动态增长

```json
{
  "schema_version": 2,
  "kind": "github-growth",
  "signals": [
    {
      "tier": "选型级",
      "title": "acme/harness-runtime",
      "url": "https://github.com/acme/harness-runtime",
      "metric": "48h 7k→21k",
      "hook": "自托管 Workspace 增速爆发",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "acme/harness-runtime 在 Trending 上 48 小时内从约 7k 涨到 21k star，主打自托管 Agent workspace，内置 Chroma 记忆与 MCP。\n\n- 偏产品形态而非 IM 网关\n- 适合对照自托管 harness 合约层",
      "action": "评估 harness 合约层是否可接入现有栈"
    },
    {
      "tier": "工具级",
      "title": "acme/trace-replay",
      "url": "https://github.com/acme/trace-replay",
      "metric": "+1200 ★/周",
      "hook": "轨迹回放 CLI",
      "layer": "Context",
      "source_confidence": "中",
      "body": "轻量 CLI 记录 tool call 轨迹，HN 有讨论；比 LangSmith 更轻，适合本地调试 Agent 工具链。"
    }
  ]
}
```
