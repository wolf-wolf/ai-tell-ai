# Fixture — trailing comma

## 一、GitHub 动态增长

```json
{
  "schema_version": 2,
  "kind": "github-growth",
  "signals": [
    {
      "tier": "选型级",
      "title": "acme/demo",
      "url": "https://github.com/acme/demo",
      "metric": "1k ★",
      "hook": "演示仓库",
      "layer": "Harness",
      "body": "演示用 Markdown 正文，至少四十个字以满足校验规则，包含机制与差异描述。",
      "action": "可试用",
    },
    {
      "tier": "工具级",
      "title": "acme/demo2",
      "url": "https://github.com/acme/demo2",
      "metric": "500 ★",
      "hook": "第二条",
      "layer": "Model",
      "body": "第二条信号的 Markdown 正文，同样满足最小长度要求以便通过 validate。"
    },
  ],
}
```
