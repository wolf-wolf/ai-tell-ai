# Agent 概念拆解蓝图

HTML 场景式概念图谱：总成拆解图、车间工位、生产流水线、协作拓扑。绑定仓库 `docs/` 文章，随阅读进度点亮。

## 打开

```bash
cd tools/agent-concept-map
python3 -m http.server 8765
```

## 场景类型（`data.json` 的 `visual` 或自动推断）

| 类型 | 适用 | 示意 |
| --- | --- | --- |
| `exploded` | Agent 根 **总成拆解图** | 中心 Agent Core + 四向零件标注卡 + 引线 |
| `workshop` | Harness、模型等 **车间工位** | 工位网格 + 传送带 |
| `pipeline` | 生产流程、RAG 管线 | 横向流水线 |
| `hub` | 多 Agent **协作拓扑** | 中心枢纽 + 轨道卫星 |

`compose` 会自动映射为 `workshop`；根节点 `agent` 固定为 `exploded`。

## 交互（单页聚焦）

| 操作 | 效果 |
| --- | --- |
| **点击有子节点的模块** | FLIP 动画移到画布中心，同级缩到边缘，子模块在下方展开 |
| **点击边缘同级** | 切换聚焦到该同级模块 |
| **点击叶子** | 打开绑定文章 |
| 面包屑 / 「返回上层」 | 聚焦到祖先节点 |
| 根全景 | `agent` 层显示四域拆解总览 |

## 文件

| 文件 | 作用 |
| --- | --- |
| `data.json` | 概念树 + visual 类型 + 文章绑定 |
| `scenes.js` | HTML 场景渲染 |
| `progress.js` | 阅读进度 / 点亮 |
| `app.js` | 导航、侧栏 |
| `styles.css` | 蓝图工坊视觉 |
