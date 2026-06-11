# AI Cursor Chat（Obsidian 插件）

在 Obsidian **侧栏**与 **Cursor Agent CLI**（`agent acp`）对话，工作区为当前 Vault。支持手动把**选区**或**当前笔记**加入上下文后再发送，便于边阅读边改知识库。

与 [`../obsidian-read-tracker/`](../obsidian-read-tracker/)（AI Read Tracker）联动：本插件负责**按笔记归档提问**；阅读进度加权由 Read Tracker 计算。

## 前置条件

1. 安装 [Cursor Agent CLI](https://cursor.com/docs/cli)（本机示例：`~/.local/bin/agent`）
2. 执行 `agent login`（需 Cursor 订阅）
3. **桌面版 Obsidian**（依赖子进程；移动端不支持）

验证：

```bash
agent status
```

## 安装

在仓库根目录执行：

```bash
bash tools/obsidian-cursor-chat/install.sh
```

然后在 Obsidian：**设置 → 社区插件** → 关闭「限制模式」→ 启用 **AI Cursor Chat**。

更新代码后：

- 再运行 `install.sh`，或
- 命令面板：**Cursor Chat: 重新加载本插件**

## 使用

1. 点击左侧功能区 **消息图标**，或命令 **Cursor Chat: 打开侧栏**
2. **加入选区**（类似 Cursor Add to Chat）：
   - 选中文字 → **⌘L**（Mac）/ **Ctrl+L**（Windows）
   - 或编辑器 **右键** → **加入 Cursor Chat 上下文**
3. **加入整篇笔记**：**⌘⇧L** / **Ctrl+Shift+L**，或右键 → **将当前笔记加入 Cursor Chat**
4. 侧栏会自动打开并显示上下文预览；不需要的块可点 **×** 删除
5. 输入问题并发送（Enter 发送，Shift+Enter 换行）；改文件时会弹出权限确认
6. **本篇历史**（v0.4.0）：侧栏显示当前笔记的提问次数与 Q/A 列表；成功回答后自动归档，并通知 Read Tracker 更新提问数
7. **点击打开文件**（v0.4.6）：回复中的库内路径（正文、`code`、Markdown 链接）、工具卡片路径、顶部当前笔记名均可点击，在 Obsidian 中直接打开

**不会**默认附带当前笔记；只有手动加入的上下文会随下一次发送带上。归档路径优先取上下文中的「笔记 · path」，否则取当前前台打开的 `.md`。若 **⌘L** 冲突，在 **设置 → 快捷键** 中搜索「Cursor Chat」改绑。

## 设置

| 项 | 说明 |
| --- | --- |
| Agent CLI 路径 | 默认可执行文件 `~/.local/bin/agent` |
| 模式 | `agent` / `ask` / `plan` |
| 模型 | 留空为 CLI 默认 |
| 信任工作区 | 向 CLI 传递 `--trust` |
| 上下文长度上限 | 「加入当前笔记」最大字符数（默认 32000） |

## 命令

- **Cursor Chat: 打开侧栏**
- **Cursor Chat: 加入选区到上下文** — 默认 **⌘L**
- **Cursor Chat: 加入当前笔记到上下文** — 默认 **⌘⇧L**
- **Cursor Chat: 重新加载本插件**

## 源码结构

```
tools/obsidian-cursor-chat/
  manifest.json
  main.js          # 侧栏 UI、上下文、设置
  acp-client.js    # agent acp JSON-RPC 客户端
  styles.css
  install.sh
```

ACP 实现参考社区 [obsidian-cursor-plugin](https://github.com/jspada200/obsidian-cursor-plugin)；协议见 [Cursor CLI ACP](https://cursor.com/docs/cli/acp)。

## 版本说明

- **v0.4.6**：Chat 回复中的 Vault 文件路径可点击打开（正文路径、行内代码、工具卡片、当前笔记名）
- **v0.4.0**：按笔记路径归档 `fileQA`（提问数 + Q/A 列表）、侧栏「本篇历史」、通知 Read Tracker 更新 `questionCount`

## 验收对照（MVP）

- [ ] 侧栏发送后流式看到回复
- [ ] 「加入选区」后回答能体现选区；未加入时不带选区
- [ ] 「加入当前笔记」后可引用路径与正文；清空上下文后不再携带
- [ ] 写文件权限可在插件内批准/拒绝
- [ ] CLI 未登录或缺失时有中文 Notice
