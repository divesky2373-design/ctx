# CTX Protocol v0

> 跨 Agent 项目上下文协议

## 设计原则

- **文件即协议** — `.context/` 目录就是全部，无需服务端
- **YAML 格式** — 人可读、机可解析、diff 友好
- **零依赖** — 纯 Node.js ESM，内置 YAML parser
- **跨工具** — 任何 agent/IDE/CI 都能读写
- **CLI-first** — 命令行即接口

## 目录结构

```
.context/
├── status.yaml      # 项目当前状态
├── decisions.yaml   # 决策日志
├── tasks.yaml       # 任务列表
└── handoff.yaml     # 交接摘要
```

## 文件格式

### status.yaml

```yaml
project: my-project
goal: "一句话描述项目目标"
phase: planning | building | testing | shipping | maintaining
status: green | yellow | red
stack:
  - node
  - react
blockers: []
updated_at: 2026-03-19T10:00:00Z
updated_by: claude
```

### decisions.yaml

```yaml
decisions:
  - id: d001
    what: "使用 SQLite 而非 PostgreSQL"
    why: "零运维，项目规模不需要分布式数据库"
    made_by: human
    date: 2026-03-19
    status: active | superseded | revisit
```

### tasks.yaml

```yaml
tasks:
  - id: t001
    title: "实现用户认证"
    status: todo | doing | done | blocked
    assignee: claude | human | ""
    created_at: 2026-03-19T10:00:00Z
    updated_at: 2026-03-19T10:00:00Z
```

### handoff.yaml

```yaml
handoff:
  summary: "一句话总结当前状态"
  what_was_done:
    - "完成了用户认证模块"
    - "修复了 3 个测试"
  what_needs_doing:
    - "实现邮件通知"
  key_context:
    - "认证用了 JWT，密钥在 .env"
  generated_at: 2026-03-19T10:00:00Z
  generated_by: claude
```

## CLI 命令

| 命令 | 说明 |
|------|------|
| `ctx init` | 创建 `.context/` 目录和模板文件 |
| `ctx status` | 显示项目状态 |
| `ctx status set --phase building --status green` | 更新状态 |
| `ctx decide "决策内容" --why "原因"` | 记录一条决策 |
| `ctx task add "任务标题"` | 添加任务 |
| `ctx task doing <id>` | 标记任务进行中 |
| `ctx task done <id>` | 标记任务完成 |
| `ctx task block <id>` | 标记任务阻塞 |
| `ctx task list` | 列出所有任务 |
| `ctx handoff` | 生成交接摘要 |
| `ctx briefing` | 输出给 agent 的完整简报 |
| `ctx log` | 时间线展示所有变更 |

## Agent 集成

Agent 在开始工作前应执行 `ctx briefing` 获取项目上下文。
工作完成后应执行 `ctx handoff` 生成交接摘要。

```
# Agent 工作流
ctx briefing          # 1. 了解上下文
# ... 执行任务 ...
ctx task doing t001   # 2. 标记正在做的任务
ctx decide "..." --why "..."  # 3. 记录决策
ctx task done t001    # 4. 完成任务
ctx handoff           # 5. 生成交接
```
