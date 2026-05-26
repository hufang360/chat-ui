<p align="center">
  <a href="./README.md">简体中文</a> ·
  <a href="./README.en.md"><strong>English</strong></a> ·
</p>

A minimalist Chatbot widget. 99% vibe coding result.

Single HTML output (via build), double-click to open in browser and start chatting.

Features custom system prompts, multiple provider support, data import/export. No telemetry, no background network requests except AI API calls. Dark mode included.

---

## Features

### Providers
- OpenAI-compatible API endpoint support. Provider presets are importable/exportable.
- Built-in provider presets:
  - OpenAI
  - DeepSeek
  - Qwen
  - Moonshot
  - SiliconFlow
  - ModelScope
  - Zhipu AI
  - MiMo
  - OpenRouter
  - Groq
  - Ollama (local)
- Balance inquiry: currently supports DeepSeek, Moonshot, SiliconFlow, and OpenRouter.

### Model Support
- Vision models: upload images or paste directly from clipboard.
- Reasoning models: toggleable thinking mode (e.g. deepseek-v4-flash).

### Conversations & Messages
- Conversation management: create, delete, duplicate conversations. Import/export all conversations in settings.
- System prompt: configurable per conversation.
- Message actions: send text and images, edit any sent message, regenerate responses.
- Markdown rendering: tables and code blocks supported (Mermaid not supported).

### Other
- Language support: Chinese and English.
- Dark theme with system preference follow.
- Basic mobile responsiveness.

---

## Tech Stack

React 18 + TypeScript + Vite + Tailwind CSS + Zustand (state management) + React Markdown + Lucide Icons

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build single HTML file
npm run build

# Preview build output
npm run preview
```

## Build Output

The project uses [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile) to bundle everything into a single `dist/index.html` file — no external assets required.
