// JSON output contract for providers that do not natively enforce
// the same structured-output schema as Gemini.
//
// This prompt must stay fully aligned with:
// - backend Zod Evaluation Schema
// - Gemini responseSchema
// - frontend EvaluationResult type
//
// IMPORTANT:
// `coverage` is evidence availability from REFERENCE images,
// not the number of candidate views.

export const JSON_OUTPUT_SCHEMA_PROMPT = `输出必须是且只能是一个合法 JSON 对象。

禁止：
- markdown 代码块
- JSON 前后的解释文字
- 注释
- 额外字段
- NaN
- Infinity
- 字符串形式的数字

JSON 结构必须严格如下：

{
  "dimensions": [
    {
      "id": "identity_fidelity",
      "score": 0 到 5 的数字，步长必须为 0.5；证据不足时为 null,
      "coverage": 0 到 1 的数字,
      "confidence": 0 到 1 的数字,
      "summary": "该维度的一句话中文结论",
      "evidence": [
        {
          "view": "front" | "left45" | "right45" | "left_profile" | "right_profile" | "back" | "full_body" | "unknown",
          "region": "具体区域名称，例如 global_face、face_contour、eyes、nose、jaw、chin、shoulders、torso、arms、hands、legs、hair、clothing、accessory、silhouette",
          "observation": "必须具体描述 Reference 中实际可见结构、Candidate 中对应结构以及二者的具体差异",
          "severity": "minor" | "moderate" | "major" | "critical",
          "effect": "positive" | "negative" | "neutral"
        }
      ]
    },
    {
      "id": "facial_geometry_fidelity",
      "score": 0 到 5 的数字，步长必须为 0.5；证据不足时为 null,
      "coverage": 0 到 1 的数字,
      "confidence": 0 到 1 的数字,
      "summary": "该维度的一句话中文结论",
      "evidence": []
    },
    {
      "id": "global_morphology_proportion",
      "score": 0 到 5 的数字，步长必须为 0.5；证据不足时为 null,
      "coverage": 0 到 1 的数字,
      "confidence": 0 到 1 的数字,
      "summary": "该维度的一句话中文结论",
      "evidence": []
    },
    {
      "id": "pose_silhouette_fidelity",
      "score": 0 到 5 的数字，步长必须为 0.5；证据不足时为 null,
      "coverage": 0 到 1 的数字,
      "confidence": 0 到 1 的数字,
      "summary": "该维度的一句话中文结论",
      "evidence": []
    },
    {
      "id": "structural_detail_fidelity",
      "score": 0 到 5 的数字，步长必须为 0.5；证据不足时为 null,
      "coverage": 0 到 1 的数字,
      "confidence": 0 到 1 的数字,
      "summary": "该维度的一句话中文结论",
      "evidence": []
    }
  ],

  "strongestPoints": [
    {
      "title": "准确还原的具体结构",
      "description": "必须能够由 dimensions 中的 positive evidence 直接支持"
    }
  ],

  "mainProblems": [
    {
      "title": "明确存在的具体结构问题",
      "description": "必须能够由 dimensions 中的 negative evidence 直接支持",
      "severity": "minor" | "moderate" | "major" | "critical"
    }
  ],

  "summary": "基于 Reference 可见证据，对候选模型整体还原程度及主要误差的简洁总结",

  "recommendation": "仅针对已经由 negative evidence 确认的问题给出可执行优化建议"
}

必须同时满足以下约束：

1. dimensions 必须恰好包含 5 个元素。

2. dimensions 的顺序必须固定为：
   1) identity_fidelity
   2) facial_geometry_fidelity
   3) global_morphology_proportion
   4) pose_silhouette_fidelity
   5) structural_detail_fidelity

3. 每个 id 必须且只能出现一次。

4. score：
   - 只能是 null，或以下数值之一：
     0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
   - 不得输出其他小数。

5. coverage：
   - 范围 0~1。
   - 表示 Reference 对该维度实际可验证信息的覆盖程度。
   - Candidate 图片数量不得提高 coverage。
   - Reference 缺少侧面/背面时，相应不可见区域不得算入 coverage。
   - 如果 score = null，coverage 通常应很低。

6. confidence：
   - 范围 0~1。
   - 表示在当前可见证据范围内，该评分有多可靠。
   - confidence 与 coverage 是不同概念。
   - 如果 score = null，则 confidence 必须为 0。

7. evidence：
   - score 非 null 时必须有 2~4 条。
   - score 为 null 时必须是空数组。
   - 不得为了凑数量制造 Evidence。
   - 每条 Evidence 必须来自 Reference 可直接观察的视觉事实。
   - Candidate 中额外存在的视角不得作为 Reference 不可见区域的 Ground Truth。

8. observation：
   必须明确表达：
   Reference 中看到了什么；
   Candidate 中看到了什么；
   二者具体差异是什么。

   禁止只写：
   “比较接近”
   “整体不错”
   “存在差异”
   “基本一致”。

9. Evidence 与 score 必须一致：
   - score < 5 时，通常至少存在一条 negative evidence。
   - score >= 3 时，通常至少存在一条 positive evidence。
   - 出现 major negative evidence 时必须产生明显扣分。
   - 出现 critical negative evidence 时不得给出高分。
   - 不得出现多个 Major/Critical 问题但 score 仍为 4.5 或 5。

10. strongestPoints：
    - 数量 0~3。
    - 必须来自 dimensions 中已有的 positive evidence。
    - 如果可靠优点不足 3 条，可以少于 3 条。
    - 不得凭空创建优点。

11. mainProblems：
    - 数量 0~3。
    - 必须来自 dimensions 中已有的 negative evidence。
    - 优先输出影响 Identity、Facial Geometry 或整体还原度最大的错误。
    - 如果可靠问题不足 3 条，可以少于 3 条。
    - 不得评价 Reference 不可见区域。

12. recommendation：
    - 只能针对 mainProblems 或已有 negative evidence 中确认的问题。
    - 不得针对无法观察的结构提出修复建议。

13. 所有自然语言字段默认输出简体中文。
    projection、jaw width、chin、silhouette 等专业术语可保留英文。

14. 不要根据场景和常识进行语义补全。
    例如看到游泳运动员，不代表可以自动认定泳镜、泳裤、泳帽或特定动作已经正确还原。

15. 最终只输出 JSON，不要输出任何其他文字。`;