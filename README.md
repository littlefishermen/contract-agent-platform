# 🤖 AI Contract Agent

**Web3 Vibe Coding Platform** — 让产品经理通过自然语言输入或上传合同照片，自动生成智能合约 Demo。

---

## 架构

5-Agent 流水线：

```
用户输入 → Doc Agent → Tech Agent → (Dev + UI + Test) 并行 → Demo
 OCR ↑        ↓              ↓              ↓                ↓
 照片/PDF   需求文档       技术设计      合约+后端+前端    测试用例+预览
```

### Agent 职责

| Agent | 模型 | 职责 |
|---|---|---|
| **Doc Agent** | MiniMax-M2.7 | 解析用户需求，提取合同条款，生成结构化需求文档 |
| **Tech Agent** | MiniMax-M2.7 | 可行性评估，合约架构设计，识别需用户确认的条款 |
| **Dev Agent** | MiniMax-M2.7 | 生成 Solidity 合约 + Python Flask 后端模拟器 |
| **UI Agent** | MiniMax-M2.7 | 生成 Next.js 前端交互页面 |
| **Test Agent** 🆕 | MiniMax-M2.7 | 根据需求+技术文档生成结构化测试用例，前端可浏览 |

### 流水线执行流程

```
phase 1 ─── Doc Agent (串行) ───→ 需求文档
                ↓
phase 2 ─── Tech Agent (串行) ──→ 技术设计（可含确认项）
                ↓
phase 3 ─── Dev Agent ──→ Solidity 合约 + 后端模拟器
         ├── UI Agent  ──→ Next.js 前端页面
         └── Test Agent ──→ 结构化测试用例（24+ 条）
                ↓
          Demo 预览页面（Tab 切换所有产物）
```

## 技术栈

| 层 | 技术 | 端口 |
|---|---|---|
| **前端** | Next.js 14 + React 18 + Zustand | `3000` |
| **后端** | Flask + Waitress (SSE 流式传输) | `5000` |
| **OCR** | DashScope qwen-vl-ocr | — |
| **Agent** | Hermes Agent (多 Profile 隔离) | — |
| **存储** | 本地文件系统 | — |
| **通信** | REST API + SSE (Server-Sent Events) | — |
| **合约** | Solidity 0.8.19+ (OpenZeppelin) | — |

## 核心功能

### 实时生成

- **SSE 实时流** — Agent 思考过程逐行推送
- **Agent 思考日志** — 每个 Agent 的思考过程实时展示
- **产物即时预览** — 每个 Agent 完成即展示其产物
- **并行执行** — Dev + UI + Test 三 Agent 并行，大幅缩短生成时间

### 产物预览（6 个 Tab）

| Tab | 内容 | 渲染方式 |
|---|---|---|
| 🎬 **演示预览** | 交互式合约 Demo 页面 | iframe 嵌入 |
| 📄 **需求文档** | 结构化需求（参与方、条款、可合约化分类） | Markdown 渲染 |
| 📐 **技术设计** | 合约架构、模式、风险评估 | Markdown 渲染 |
| 📜 **合约代码** | Solidity 源码（语法高亮 + 行号 + 文件切换） | SolidityViewer |
| 🎨 **前端代码** | 生成的前端源码（文件切换 + 一键复制） | 源码面板 |
| 🧪 **测试用例** 🆕 | 结构化测试用例（按模块分组 + 彩标分类） | Markdown 渲染 |

### 测试用例展示 🆕

Test Agent 自动生成包含以下维度的测试用例：

- **场景类型**：🟢 normal / 🟡 boundary / 🔴 exception / 🟣 security
- **优先级**：🔴 high / 🟡 medium / ⚪ low
- **标签体系**：`web3` `contract` `library` `security` `pattern`
- **概览统计**：总用例数、模块数、类型分布、优先级分布
- **每用例详情**：前置条件、测试步骤（有序列表）、预期结果

### OCR 合同识别

支持上传合同照片/扫描件自动填写表单：

- **引擎**: DashScope qwen-vl-ocr（阿里云百炼）
- **预处理**: CLAHE 对比度增强 + 锐化
- **形近字提示**: "三/子"、"6/0"、"已/己"等优化
- **多页支持**: Ctrl+点击多选或拖拽，逐页识别后合并
- **成本**: ≈ ¥0.007/张

### 合同模板

| 模板 | 适用场景 | 合约特点 |
|---|---|---|
| 🏠 住房租赁合同 | 房东-租客租赁协议 | 租金托管、押金锁定、时间锁、提前解约 |
| 💳 预付卡合同 | 商家-消费者预付卡协议 | 资金托管、服务核销、有效期、退款策略 |
| ⇄ 商品交易合同 | 买卖双方交易协议 | 资金托管、交付确认、争议仲裁 |
| ✦ 自定义合同 | 上传合同文本或描述需求 | 按需分析、全自动合约化 |

## 快速启动

```bash
# 1. 进入项目目录
cd contract-agent-platform

# 2. 一键启动所有服务
bash ctl.sh start

# 3. 查看状态
bash ctl.sh status

# 4. 访问前端
open http://localhost:3000
```

### 手动启动

```bash
# 后端 (Flask 开发服务器)
cd contract-agent-platform
/usr/bin/python3.12 backend_server.py &

# 验证后端
curl http://localhost:5000/api/health

# 前端 (另一个终端)
cd contract-agent-platform/frontend
npm run dev
```

### 停止服务

```bash
bash ctl.sh stop
```

## 项目结构

```
contract-agent-platform/
├── backend_server.py           # Flask API 入口 (SSE + Polling + OCR)
├── ctl.sh                      # 一键启停脚本
├── shared/
│   ├── protocol.py             # 数据模型 (AgentType, Term, TechDesign...)
│   ├── storage.py              # 文件存储管理
│   └── events.py               # SSE 事件存储
├── agents/
│   └── orchestrator/
│       ├── orchestrator.py     # 旧版 Orchestrator (fallback)
│       └── nested_orchestrator.py  # NestedOrchestrator (5-Agent 异步流水线)
├── frontend/
│   └── src/
│       ├── store/index.ts      # Zustand 状态管理
│       ├── styles/globals.css  # Future Minimalism 设计系统
│       ├── components/
│       │   ├── MarkdownView.tsx     # Markdown 渲染 (预览/源码切换)
│       │   ├── SolidityViewer.tsx   # Solidity 语法高亮
│       │   └── ArtifactPreview.tsx  # 产物预览容器
│       └── pages/
│           ├── index.tsx       # 主页面 (OCR + SSE + 5-Agent 展示)
│           ├── _document.tsx   # Geist 字体配置
│           └── demo/[projectId].tsx  # Demo 交互页面
├── storage/projects/           # 生成的项目文件
└── assets/                     # 截图、素材
```

## 工作流程

1. **选择模板** — 住房租赁 / 预付卡 / 商品交易 / 自定义
2. **填写需求** — 手动输入 或 **上传合同照片自动填充**
3. **AI 生成** — 5-Agent 流水线实时展示思考过程
   - 📄 Doc Agent → 提取条款，生成需求文档
   - 📐 Tech Agent → 合约架构设计，识别确认项
   - ⚙️ Dev Agent → Solidity 合约 + 后端模拟器
   - 🎨 UI Agent → Next.js 前端交互页面
   - 🧪 Test Agent → 结构化测试用例集合
4. **确认条款** — 对条件可合约化的条款进行选择确认
5. **Demo** — 6 个 Tab 切换浏览所有产物

## 设计系统

- **风格**: Future Minimalism（未来极简）
- **配色**: 雾白 `#FAFAFA` / 纯白 `#FFFFFF` / 电光蓝 `#2563EB`
- **渐变**: 紫 `#8B5CF6` → 青 `#06B6D4`
- **字体**: Geist Sans + Geist Mono
- **圆角**: 锐利 2-6px / 精密卡片 22px
- **磨砂玻璃**: 毛玻璃层次 + slate 文字层级

## 近期更新

### v1.2.0 — Test Agent 集成 + 稳定性修复

- **🆕 Test Agent** — 第 5 个 Agent，与 Dev/UI 并行执行，自动生成 24+ 条结构化测试用例
- **🆕 测试用例前端展示** — 6 个产物 Tab，按模块/场景/优先级分组，彩色徽章渲染
- **🐛 Dev Agent JSON 转义修复** — 修复 Solidity 代码中 `\x`、`\_` 等非法转义导致 Agent 崩溃的问题
- **🐛 代码保存修复** — `run_full_pipeline` 未调用 `save_code()` 导致生成的代码不保存
- **🐛 Step key 不匹配** — `run_nested_pipeline` 中 step key 名称不一致修正
- **🐛 合约文件后缀** — Solidity 文件自动补 `.sol` 后缀

## 许可证

MIT
