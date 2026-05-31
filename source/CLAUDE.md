# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# UI开发规范

## 核心原则
本项目采用 **双层设计系统架构**：
- **基础层**：Base UI（无样式组件，提供完整交互逻辑和无障碍支持）
- **表现层**：SHACN New York 设计系统（基于 Base UI 构建，提供统一视觉风格）

**严禁自行编写样式或交互逻辑**，必须优先使用设计系统提供的组件。

## 架构关系
```
Base UI（逻辑层）  →  SHACN New York（表现层）  →  业务组件
     ↓                      ↓
  交互行为              视觉样式
  无障碍支持            设计规范
  键盘导航              响应式布局
```

## 使用方式

### 优先级顺序
1. **首选**：直接使用 SHACN New York 组件（如 `Button`, `Input`, `Tooltip`, `Card` 等）
2. **备选**：当 SHACN 无对应组件时，使用 Base UI 组件并应用 New York 设计系统样式
3. **禁止**：自行编写交互逻辑或样式

### 组件使用规范
```tsx
// ✅ 正确：直接使用 SHACN 组件
import { Button } from "@/components/ui/button"
<Button variant="primary">提交</Button>

// ✅ 正确：SHACN 无对应组件时，使用 Base UI + 设计系统样式
import { Dialog } from "@base-ui-components/react/dialog"
import { nyDialogStyles } from "@/lib/design-system"
<Dialog className={nyDialogStyles}>...</Dialog>

// ❌ 错误：自行编写交互逻辑
<div onClick={handleClick} onKeyDown={handleKeyDown}>...</div>
```

## 代码要求

### 组件使用
- ✅ 优先使用 SHACN New York 组件库
- ✅ SHACN 缺失时，使用 Base UI 组件并应用设计系统样式
- ✅ 组件找不到时，先查阅 [Base UI 文档](https://base-ui.com) 和 SHACN 文档

### 样式控制
- ✅ 使用组件的 props/属性控制外观和行为
- ✅ 使用设计系统 tokens：`var(--ny-color-primary)` 等
- ✅ 使用设计系统提供的 CSS 变量和工具类
- ❌ 不要写自定义 CSS
- ❌ 不要硬编码颜色、字体、间距等样式值

### 交互逻辑
- ✅ 使用 Base UI 提供的交互原语（hooks、组件）
- ✅ 依赖组件内置的无障碍支持和键盘导航
- ❌ 不要自行实现焦点管理、ARIA 属性等

## 移动端
所有组件默认响应式，无需额外处理。必要时使用组件自带的响应式 props。

## 扩展组件流程
当需要新增 UI 组件时：
1. 检查 SHACN New York 是否已有该组件
2. 若无，检查 Base UI 是否提供对应原语
3. 基于 Base UI 原语，应用 New York 设计系统样式进行封装
4. 保持与现有组件一致的 API 设计