# Brain2 - Modular Architecture

A memory-augmented cognitive assistant framework with clean, modular architecture.

## 📁 Project Structure

```
src/
├── core/                    # Core functionality modules
│   ├── types/              # TypeScript type definitions
│   │   ├── context.types.ts
│   │   ├── llm.types.ts
│   │   ├── memory.types.ts
│   │   ├── prompt.types.ts
│   │   ├── streaming.types.ts
│   │   └── index.ts        # Barrel export
│   │
│   ├── memory/             # Memory management
│   │   ├── parser.ts       # Parse memory file frontmatter
│   │   ├── mutations.ts    # Memory mutation validation & application
│   │   ├── database.ts     # SQLite wrapper for embeddings
│   │   ├── embedding.service.ts  # Ollama embedding service
│   │   ├── store.ts        # Main memory store (indexing & search)
│   │   └── index.ts        # Barrel export
│   │
│   ├── context/            # Context building
│   │   ├── loader.ts       # File system loading
│   │   ├── builder.ts      # Context block builder
│   │   ├── formatter.ts    # Format context for LLM
│   │   └── index.ts        # Barrel export
│   │
│   ├── prompt/             # Prompt construction
│   │   ├── templates.ts    # System prompt template
│   │   ├── builder.ts      # Prompt builder
│   │   ├── converter.ts    # Message format converter
│   │   └── index.ts        # Barrel export
│   │
│   ├── llm/                # LLM provider abstraction
│   │   ├── registry.ts     # Provider registry & factory
│   │   └── index.ts        # Barrel export
│   │
│   ├── streaming/          # Streaming functionality
│   │   ├── mutation-parser.ts  # Parse mutations from stream
│   │   ├── stream-handler.ts   # Main streaming handler
│   │   └── index.ts        # Barrel export
│   │
│   └── index.ts            # Core barrel export
│
├── providers/              # LLM provider implementations
│   ├── gemini.provider.ts  # Google Gemini implementation
│   ├── ollama.summarizer.ts # Ollama conversation summarizer
│   └── index.ts            # Barrel export
│
├── utils/                  # Utility functions
│   ├── type-guards.ts      # Runtime type validation
│   ├── vector.ts           # Vector operations
│   ├── text.ts             # Text processing
│   ├── crypto.ts           # Cryptographic utilities
│   └── index.ts            # Barrel export
│
└── index.ts                # Main barrel export
```

## 🎯 Module Responsibilities

### Types Module (`src/core/types`)

- Centralized TypeScript type definitions
- All interfaces and types used across the application
- Organized by domain (context, llm, memory, prompt, streaming)

### Memory Module (`src/core/memory`)

- **Parser**: Extract frontmatter metadata from markdown files
- **Mutations**: Validate and apply filesystem changes
- **Database**: SQLite wrapper for vector embeddings
- **Embedding Service**: Generate embeddings via Ollama
- **Store**: Main interface for indexing and searching memory

### Context Module (`src/core/context`)

- **Loader**: Load memory files from filesystem
- **Builder**: Combine search results into context blocks
- **Formatter**: Format context for LLM injection

### Prompt Module (`src/core/prompt`)

- **Templates**: System prompt and instructions
- **Builder**: Construct complete prompts
- **Converter**: Convert to LLM message format

### LLM Module (`src/core/llm`)

- **Registry**: Provider registration and factory
- Abstract interface for swappable LLM backends

### Streaming Module (`src/core/streaming`)

- **Mutation Parser**: Extract mutations from streamed content
- **Stream Handler**: Handle streaming with mutation capture

### Providers (`src/providers`)

- Concrete LLM provider implementations
- Gemini, Ollama, and future providers

### Utils (`src/utils`)

- Shared utility functions
- Type guards, vector operations, text processing, crypto

## 📦 Usage Examples

### Import Everything

```typescript
import * from "./src";
```

### Import Specific Modules

```typescript
// Types only
import type { MemoryConfig, LLMMessage } from "./src/core/types";

// Memory operations
import { MemoryStore, parseMemoryFile } from "./src/core/memory";

// Context building
import { buildContext, formatContextBlock } from "./src/core/context";

// Prompt construction
import { buildPrompt, promptToMessages } from "./src/core/prompt";

// LLM providers
import { registerProvider, getProvider } from "./src/core/llm";
import { GeminiProvider } from "./src/providers";

// Streaming
import { streamWithMutationCapture } from "./src/core/streaming";

// Utilities
import { sha256, cosineSimilarity } from "./src/utils";
```

### Initialize Memory Store

```typescript
import { MemoryStore } from "./src/core/memory";

const store = new MemoryStore({
  memoryDir: "./memory",
  dbPath: "./memory_index.db",
  ollamaUrl: "http://localhost:11434/api/embeddings",
  model: "qwen3-embedding:0.6b",
  chunkSize: 800,
  topK: 6,
});

// Refresh index
await store.refreshIndex();

// Search
const results = await store.search("user's recent projects");
```

### Build Context and Prompt

```typescript
import { buildContext } from "./src/core/context";
import { buildPrompt, promptToMessages } from "./src/core/prompt";

// Build context from search results
const context = await buildContext(results, "./memory", 6);

// Build prompt
const prompt = buildPrompt("What am I working on?", context);

// Convert to LLM messages
const messages = promptToMessages(prompt);
```

### Stream with Mutation Capture

```typescript
import { getProvider } from "./src/core/llm";
import { GeminiProvider } from "./src/providers";
import { streamWithMutationCapture } from "./src/core/streaming";

// Register and get provider
const provider = new GeminiProvider({
  apiKey: process.env.GEMINI_API_KEY,
});

// Stream with automatic mutation handling
const response = await streamWithMutationCapture(provider, messages, {
  onToken: (token) => process.stdout.write(token),
  onMemoryMutation: async (mutation) => {
    console.log("Mutation applied:", mutation);
  },
  memoryDir: "./memory",
});
```

## 🔧 Benefits of This Structure

1. **Modularity**: Each module has a single, clear responsibility
2. **Testability**: Small, focused modules are easy to test
3. **Type Safety**: Centralized type definitions prevent inconsistencies
4. **Discoverability**: Barrel exports make imports clean and simple
5. **Extensibility**: Easy to add new providers or features
6. **Maintainability**: Changes are isolated to specific modules
7. **Encapsulation**: Internal implementation details are hidden

## 🚀 Adding New Features

### Adding a New LLM Provider

1. Create `src/providers/your-provider.ts`
2. Implement `ILLMProvider` interface
3. Export from `src/providers/index.ts`
4. Register in your application code

### Adding New Memory Features

1. Add function to appropriate file in `src/core/memory/`
2. Export from module's `index.ts`
3. Automatically available via barrel export

### Adding New Types

1. Add to appropriate file in `src/core/types/`
2. Export from `src/core/types/index.ts`
3. Automatically available everywhere

## 📝 Notes

- All features from the original codebase are preserved
- No functionality has been removed
- Import paths are more intuitive
- Better IDE autocomplete and IntelliSense support
