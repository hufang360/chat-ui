<p align="center">
  <a href="./README.md"><strong>简体中文</strong></a> ·
  <a href="./README.en.md">English</a> ·
</p>

## 技术栈
简单Chatbot小页面，双击html在浏览器中打开，即可使用。
99% vibe coding 产物。

自备 API 密钥，支持 OpenAI 兼容格式的 API 端点。
支持自定义系统提示词，可在多个供应商之间切换。数据可导入导出。
无遥测，不收集任何数据，除 AI 请求外无其他网络请求。
提供夜间模式。

---

## 功能点

### 供应商
- 支持 OpenAI 兼容格式的 API 端点。供应商预设支持导入导出。
- 供应商预设：
  - OpenAI
  - DeepSeek
  - 通义千问
  - Moonshot
  - 硅基流动
  - 魔搭
  - 智谱
  - MiMo
  - OpenRouter
  - Groq
  - Ollama（本地）
- 余额查询：目前支持 DeepSeek、Moonshot、硅基流动 和 OpenRouter。

### 模型支持
- 视觉模型：支持选择上传图片文件，支持从剪贴板直接粘贴图片。
- 推理模型：支持开关 deepseek-v4-flash 思考模式。

### 会话和消息
- 会话管理：支持 新建、删除、复制 会话。可在设置里导入导出全部对话。
- 系统提示词：可设置对话系统提示词。
- 发送消息：支持文本、图片输入，可编辑任意已发送消息，且支持重新生成。
- markdown支持：支持表格和代码块，但不支持mermaid渲染。

### 其他
- 语言支持 中文 和 English。
- 有暗色主题，支持跟随系统。
- 移动端的基础适配。

---

## 技术栈
React 18 + TypeScript + Vite + Tailwind CSS + Zustand (状态管理) + React Markdown + Lucide Icons
