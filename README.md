# 3D Person Restoration Evaluator

Evaluate how accurately a 3D person reconstruction matches the original reference images.

通过 Google Gemini 多模态模型，对「原始人物参考图片」与「候选 3D 人物模型渲染图」进行**结构还原度评估**，输出五维评分、Confidence、具体 Evidence 与可执行的优化建议。

## 工作流程

```
上传 Reference Images
↓
上传 Candidate 3D Renders
↓
点击 Evaluate
↓
Backend 收到图片（multipart/form-data）
↓
Gemini 3.7 Flash 多模态分析（Structured JSON Output）
↓
Backend Zod Validation
↓
Backend 重新计算 weighted score（不信任模型算术）
↓
Frontend Result Dashboard
```

## 评分维度

| 维度 | 英文名 | 权重 |
| --- | --- | --- |
| 人物身份还原度 | Identity Fidelity | 30% |
| 面部几何还原度 | Facial Geometry Fidelity | 30% |
| 整体形态与比例还原度 | Global Morphology & Proportion | 20% |
| 姿态与轮廓还原度 | Pose & Silhouette Fidelity | 10% |
| 局部结构细节还原度 | Structural Detail Fidelity | 10% |

- 每个维度 0~5 分（步长 0.5）或 `N/A`（Reference 证据不足，禁止猜测）
- Identity 或 Facial Geometry 为 `N/A` → `status = INSUFFICIENT_EVIDENCE`，`overallScore = null`
- 其他维度 `N/A` → 权重重归一化，并输出 `evidenceCoverage`（剩余可评权重）
- 每条 Evidence 包含 view / region / observation / severity / effect

## Requirements

```text
Node.js 20+
npm
Gemini API Key
```

## 项目结构

```text
├── frontend/                  # React + TypeScript + Vite + Tailwind CSS
│   └── src/
│       ├── components/       # 上传区、评分卡、Evidence、对比 Gallery 等
│       ├── hooks/            # useImageList（前端图片校验）
│       ├── services/         # /api/evaluate 调用
│       └── types/            # 评估结果类型
├── backend/                   # Node.js + TypeScript + Express
│   ├── src/
│   │   ├── routes/           # /api/health, /api/evaluate
│   │   ├── services/         # GeminiService（唯一调用 Gemini 的位置）
│   │   ├── prompts/          # 系统级评估 Prompt（仅后端）
│   │   ├── schemas/          # Zod 校验（Gemini 返回结果）
│   │   ├── utils/            # ScoreCalculator（权重归一化）、图片校验
│   │   └── types/
│   └── tests/                # vitest：评分计算 + Zod Schema
├── .env 相关见下方
└── package.json              # npm workspaces
```

## Install

```bash
# 在项目根目录（同时安装 frontend + backend）
npm install
```

## Configure

```bash
cp backend/.env.example backend/.env
```

然后编辑 `backend/.env`，填入你的真实 API Key：

```text
GEMINI_API_KEY=your_real_key_here
GEMINI_MODEL=gemini-3.7-flash
PORT=3001
```

> 安全规则：真实 API Key 只能存在 `backend/.env`（已被 `.gitignore` 忽略），
> 只能由 Node 后端读取，不会进入前端 bundle、API 响应或日志。

## Run

```bash
# 根目录一键启动 frontend + backend
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

健康检查：

```bash
curl http://localhost:3001/api/health
# {"status":"ok","model":"gemini-3.7-flash"}
```

## Test

```bash
# 后端测试（评分计算、N/A 归一化、Zod Schema 校验）
npm test

# 前端构建验证
npm run build
```

## API

### `GET /api/health`

```json
{ "status": "ok", "model": "gemini-3.7-flash" }
```

### `POST /api/evaluate`

`multipart/form-data`：

- `referenceImages[]`：1~8 张，JPG / JPEG / PNG / WEBP，单张 ≤ 10 MB
- `candidateImages[]`：1~8 张，同一限制

成功返回（简化）：

```json
{
  "status": "SUCCESS",
  "overallScore": 84,
  "evidenceCoverage": 1,
  "candidate": { "candidateId": "candidate-1", "candidateName": "Candidate Model" },
  "dimensions": [
    {
      "id": "identity_fidelity",
      "name": "人物身份还原度",
      "nameEn": "Identity Fidelity",
      "weight": 0.3,
      "score": 4.5,
      "score100": 90,
      "confidence": 0.91,
      "summary": "…",
      "evidence": [
        {
          "view": "front",
          "region": "jaw",
          "observation": "…",
          "severity": "moderate",
          "effect": "negative"
        }
      ]
    }
  ],
  "strongestPoints": [{ "title": "…", "description": "…" }],
  "mainProblems": [{ "title": "…", "description": "…", "severity": "moderate" }],
  "summary": "…",
  "recommendation": "…"
}
```

错误返回格式：

```json
{ "error": { "code": "GEMINI_KEY_MISSING", "message": "Gemini API Key 未配置，请检查 backend/.env。" } }
```

常见错误码：`MISSING_OR_INVALID_IMAGES`（缺少/非法图片）、`GEMINI_KEY_MISSING`、`GEMINI_ERROR`（调用失败）、`MODEL_RESPONSE_INVALID`（Schema 校验失败）。

## 使用建议

- Reference 建议覆盖正面 + 45° + 侧面等多视角清晰照片
- Candidate Renders 应来自**同一个** 3D 模型的多个视角
- 评估只看结构还原度，忽略美观、光照、渲染质量
- 证据不足时模型会输出 `N/A` 而不是猜测，前端会显示 Evidence Coverage

## 安全说明

- Gemini API Key 仅存于 `backend/.env`，`.gitignore` 已忽略 `.env` / `.env.local` / `backend/.env`
- 所有 Gemini 调用只发生在后端（`backend/src/services/geminiService.ts`）
- 日志只记录错误 message，不记录 Key 与图片内容
- 系统评估 Prompt 仅存在于后端（`backend/src/prompts/evaluationPrompt.ts`），前端无法修改

## V2 展望（当前未实现）

- 多 Candidate 并排排名（类型已预留 `candidateId` / `candidateName`）
- GLB/OBJ/PLY 解析与 Blender 自动渲染
- Raw vs Refined 自动对比
- 历史任务、数据库、多用户
