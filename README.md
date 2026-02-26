# Brain2 - Memory-Augmented Cognitive Assistant

A modular framework for building memory-augmented AI assistants with long-term continuity.

## 🎯 Features

- **Semantic Memory Search**: Vector-based search using Ollama embeddings
- **Memory Mutations**: LLM-driven memory updates with validation
- **Streaming Support**: Token streaming with automatic mutation capture
- **Modular Architecture**: Clean separation of concerns
- **Provider Abstraction**: Swappable LLM backends (Gemini, etc.)
- **Type Safety**: Full TypeScript support with comprehensive types

## 🚀 Quick Start

```typescript
import {
  MemoryStore,
  buildContext,
  buildPrompt,
  promptToMessages,
} from "./src";
import { GeminiProvider } from "./src/providers";
import { streamWithMutationCapture } from "./src/core/streaming";

// Initialize memory
const store = new MemoryStore();
await store.refreshIndex();

// Search and build context
const results = await store.search("user's recent projects");
const context = await buildContext(results);

// Build prompt and stream response
const prompt = buildPrompt("What am I working on?", context);
const messages = promptToMessages(prompt);
const provider = new GeminiProvider();

const response = await streamWithMutationCapture(provider, messages, {
  onToken: (token) => process.stdout.write(token),
  memoryDir: "./memory",
});
```

## 📁 Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.

```
src/
├── core/           # Core functionality
│   ├── types/      # TypeScript definitions
│   ├── memory/     # Memory management
│   ├── context/    # Context building
│   ├── prompt/     # Prompt construction
│   ├── llm/        # LLM abstraction
│   └── streaming/  # Streaming handlers
├── providers/      # LLM implementations
└── utils/          # Shared utilities
```

## 📚 Documentation

- [Architecture Guide](./ARCHITECTURE.md) - Detailed module documentation
- [Example Usage](./example.ts) - Code examples

## 🔧 Development

```bash
# Install dependencies
bun install

# Run example
bun run example.ts

# Run tests (if available)
bun test
```

## 📝 License

Private project

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
