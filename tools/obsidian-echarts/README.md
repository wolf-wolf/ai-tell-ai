# AI ECharts

在 Obsidian **阅读模式 / Live Preview** 中渲染 ` ```echarts ` 代码块（JSON 配置）。适合知识库里的**散点图、折线图、坐标系教学图**——不必再用 ASCII 字符画。

与 [AI Mermaid Preview](../obsidian-mermaid-preview/README.md) 分工：

| 类型 | 用法 |
| --- | --- |
| 流程、架构、数据流 | ` ```mermaid ` |
| 散点、折线、柱状、坐标轴数值图 | ` ```echarts ` |

## 安装

```bash
bash tools/obsidian-echarts/install.sh
```

脚本会：

1. 复制插件到 `.obsidian/plugins/ai-echarts/`
2. 下载 [Apache ECharts](https://echarts.apache.org/) 到同目录 `echarts.min.js`（约 1MB，仅本地使用，不走社区插件市场）
3. 写入 `community-plugins.json`

Obsidian：**设置 → 社区插件** → 启用 **AI ECharts**。

## 用法

````markdown
**图 1 — 示例**

```echarts
// @height 360
{
  "grid": { "left": 56, "right": 24, "top": 40, "bottom": 48 },
  "xAxis": { "name": "dim₁", "min": -1, "max": 1 },
  "yAxis": { "name": "dim₂", "min": -1, "max": 1 },
  "series": [
    {
      "type": "scatter",
      "symbolSize": 14,
      "data": [
        { "value": [-0.8, 0.6], "label": { "show": true, "formatter": "A", "position": "right" } }
      ]
    }
  ]
}
```
````

- 首行可选 `// @height 360` 控制图表高度（默认 360px）。
- JSON 为标准 [ECharts option](https://echarts.apache.org/en/option.html)。
- GitHub / Cursor 预览仍显示源码；**Obsidian 内**才渲染成图。坐标表可保留作 fallback。

## 更新

```bash
bash tools/obsidian-echarts/install.sh
# 或强制重下 ECharts：
FORCE_ECHARTS=1 bash tools/obsidian-echarts/install.sh
```

`Cmd+P` → **ECharts: 重新加载本插件**

## 为何不用社区插件

Obsidian 官方市场里**没有**稳定的通用 `echarts` 代码块插件（此前示例的 BrazilAmando 等未上架或已停更）。Bases Charts、Diagrammo 等要么绑定 Bases/专用语法，要么不是「JSON echarts 块」。本插件与 vault 内其他 `ai-*` 工具一样**本地安装、可版本管理**。
