# AI Read Tracker（本地 Obsidian 插件）

为 `ai-tell-ai` Vault 记录：

- **打开次数**（默认 2 秒内同一笔记重复打开只计 1 次；切换不同笔记会分别累计）
- **滚动位置**（编辑 / 阅读模式分别记忆）
- **全库总览**：侧边栏表格 + **活动热力图** + **热门笔记条形图** + 可生成 Markdown 总览笔记

数据存在 `.obsidian/plugins/ai-read-tracker/data.json`（由 Obsidian 的 `loadData` / `saveData` 维护）。

## 安装

在仓库根目录执行：

```bash
bash tools/obsidian-read-tracker/install.sh
```

然后在 Obsidian 中：

1. **设置 → 社区插件** → 关闭「限制模式」
2. 找到 **AI Read Tracker** 并启用
3. 若界面没更新，用下面任一方式重载（**不要用 Cmd+R**，新版 Obsidian 默认未绑定，且常被「在导航中显示当前文件」占用）：
   - **推荐**：`Cmd+P` → **`Read Tracker: 重新加载本插件`**
   - **设置 → 社区插件**：关闭再打开 **AI Read Tracker**
   - **整库重载**：`Cmd+P` → **`Reload app without saving`**（可在 **设置 → 快捷键** 里绑定，例如 `Cmd+Shift+R`）

## 使用

- **状态栏**（点击打开总览）：`阅读 12篇/48次 · 当前 xxx.md ×3`
- **左侧 ribbon 书本图标** 或命令 **`Read Tracker: 打开全库阅读统计`**：热力图 + 热门笔记排行 + 全库表格
- **设置 → 热门笔记显示条数**：默认 Top 15
- 热力图从 **v0.3.0** 起按日累计；升级前的历史无法回填，需重新打开笔记后才会着色
- 命令 **`Read Tracker: 更新总览笔记`**：写入 `_meta/read-tracker-dashboard.md`
- 命令面板：`显示当前笔记统计` / `清除当前笔记记录`
- **设置 → AI Read Tracker**：去重秒数、总览笔记路径、恢复滚动参数

## 开发

源码即 `main.js`（CommonJS，无构建步骤）。改完后运行 `install.sh`，再在 Obsidian 里 **`Cmd+P` →「Read Tracker: 重新加载本插件」**。若装了 Hot Reload 插件，`install.sh` 会写入 `.hotreload` 以便保存后自动重载。

## 说明

- 仅跟踪 `.md` 文件
- Live Preview / 源码模式走编辑器滚动；纯阅读模式走 preview 滚动
- `.obsidian/plugins/` 已在 `.gitignore` 中，插件源码在 `tools/obsidian-read-tracker/` 纳入版本管理
