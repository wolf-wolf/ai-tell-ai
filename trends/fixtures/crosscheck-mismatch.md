# Fixture — crosscheck should drop phantom URL

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
      "hook": "合法信号",
      "layer": "Harness",
      "source_confidence": "高",
      "body": "与 research 底稿一致的合法信号，crosscheck 应保留；正文长度满足 schema 最小字数要求。"
    }
  ]
}
```
