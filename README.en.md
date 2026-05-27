<p align="center">
  <a href="./README.md">简体中文</a> ·
  <a href="./README.en.md"><strong>English</strong></a>
</p>

A lightweight Chatbot — a single HTML file is all you need.
Download: [./dist/index.html](./dist/index.html)
Double-click to launch, no install, no server, no complex deployment — just open in your browser and start chatting.
Built with 99% vibe coding, simple yet powerful.

Bring your own API key, supports OpenAI-compatible API endpoints.
Customizable system prompts, switch between multiple providers. Data import/export supported.
No telemetry, no data collection, no network requests except AI calls.
Dark mode included.

## Highlights
- Ultra-lightweight deployment: single HTML file, copy-and-go, works offline (except for AI requests).
- Flexible LLM integration: BYOK, OpenAI-compatible API, one-click provider switching.
- Fully customizable system prompts: define any persona or conversation style.
- Your data, your control: import/export conversations anytime for backup or migration.
- Zero-compromise privacy: no telemetry, no data collection — network requests only when you chat.
- Dark mode: easier on the eyes at night.
- HashTag: pass parameters via URL for quick chat, prompt activation, or provider import.

## Screenshots

<p align="center">
  <img src="./assets/pic1.png" width="80%" />
</p>
<p align="center">
  <img src="./assets/pic2.png" width="80%" />
</p>
<p align="center">
  <img src="./assets/pic3.png" width="80%" />
</p>

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
