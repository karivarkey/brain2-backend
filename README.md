# Brain2 - Memory-Augmented Cognitive Assistant

A sophisticated TypeScript framework for building memory-augmented AI assistants with long-term continuity, featuring JARVIS-style conversational intelligence and persistent memory management.

## 🎯 Features

### Core Capabilities

- **Semantic Memory Search**: Vector-based similarity search using Ollama embeddings (qwen3-embedding:0.6b)
- **Memory Mutations**: LLM-driven memory updates with validation and automatic file system persistence
- **Streaming Support**: Real-time token streaming with automatic mutation capture from LLM responses
- **JARVIS Persona**: Professional, proactive AI assistant with psychological modeling and task tracking
- **Conversation Management**: Chat history with automatic summarization and session state management
- **Memory CRUD API**: RESTful endpoints for creating, reading, updating, and deleting memory files

### Technical Features

- **Modular Architecture**: Clean separation of concerns with barrel exports
- **Provider Abstraction**: Swappable LLM backends (Gemini, Ollama, extensible to others)
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Vector Database**: SQLite-based vector embeddings with automatic indexing
- **Smart Date/Time Handling**: Automatic date normalization and deadline tracking
- **JSON Mode Responses**: Structured LLM outputs with response and mutation arrays
- **Auto-Summarization**: Conversation compression when token limits are reached
- **Express REST API**: Production-ready HTTP server with middleware support

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime (v1.3.9+)
- [Ollama](https://ollama.ai) running locally for embeddings
- Google Gemini API key (for chat functionality)

### Installation

```bash
# Install dependencies
bun install

# Initialize databases
bun run init

# Pull the embedding model (if not already installed)
ollama pull qwen3-embedding:0.6b
```

### Environment Setup

Create a `.env` file or export the following:

```bash
export GEMINI_API_KEY="your-gemini-api-key"
export GEMINI_JSON_MODE="true"  # Enable/disable JSON mode responses
```

### Running the Server

```bash
# Start the Express server
bun run index.ts

# Server will run on http://localhost:3000
```

### Core Library Usage

```typescript
import {
  MemoryStore,
  buildContext,
  buildPrompt,
  promptToMessages,
} from "./src";
import { GeminiProvider } from "./src/providers";
import { streamWithMutationCapture } from "./src/core/streaming";

// Initialize memory store with configuration
const store = new MemoryStore({
  memoryDir: "./memory",
  dbPath: "./memory_index.db",
  ollamaUrl: "http://localhost:11434/api/embeddings",
  model: "qwen3-embedding:0.6b",
  chunkSize: 800,
  topK: 6,
});

// Refresh the vector index
await store.refreshIndex();

// Search for relevant memories
const results = await store.search("user's recent projects");
const context = await buildContext(results);

// Build prompt with context and stream response
const prompt = buildPrompt("What am I working on?", context);
const messages = promptToMessages(prompt);
const provider = new GeminiProvider({
  apiKey: process.env.GEMINI_API_KEY!,
  modelId: "gemini-2.0-flash",
});

const response = await streamWithMutationCapture(provider, messages, {
  onToken: (token) => process.stdout.write(token),
  onMemoryMutation: async (mutation) => {
    console.log("Memory updated:", mutation);
  },
  memoryDir: "./memory",
});
```

## 📁 Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.

```
src/
├── core/                    # Core functionality
│   ├── types/              # TypeScript definitions
│   ├── memory/             # Memory management (store, mutations, embeddings, database)
│   ├── context/            # Context building (loader, builder, formatter)
│   ├── prompt/             # Prompt construction (templates, builder, converter)
│   ├── llm/                # LLM abstraction (registry, provider interface)
│   └── streaming/          # Streaming handlers (mutation parser, stream handler)
├── features/               # API features
│   ├── chat/              # Chat conversation API (controller, service, router, database)
│   └── memory/            # Memory CRUD API (controller, service, router, database)
├── providers/             # LLM implementations (Gemini, Ollama summarizer)
└── utils/                 # Shared utilities (crypto, vector ops, text processing)
```

### Key Components

- **MemoryStore**: Main interface for indexing and searching markdown memory files
- **EmbeddingService**: Ollama-based vector embedding generation
- **MemoryDatabase**: SQLite persistence for vector embeddings
- **StreamHandler**: Captures memory mutations from LLM streaming responses
- **JARVIS Protocol**: Advanced system prompt with psychological modeling and task tracking
- **Chat Service**: Conversation management with automatic summarization at 50K tokens
- **Memory Mutations**: Validated filesystem operations (create, update, delete) from LLM

## 🔌 REST API

### Chat Endpoints

#### POST `/chat`

Start or continue a conversation with memory-augmented context.

**Request:**

```json
{
  "conversation_id": "unique-session-id",
  "message": "What tasks do I have this week?"
}
```

**Response:**

```json
{
  "response": "Based on your schedule, you have...",
  "mutations": [
    {
      "action": "update",
      "file": "user",
      "changes": {
        "append": "\n- [2026-02-27] Task added"
      }
    }
  ]
}
```

#### GET `/chat/:conversation_id`

Retrieve message history for a conversation.

#### GET `/dashboard`

Get comprehensive dashboard statistics including memory counts, session information, and recent activity.

**Response:**

```json
{
  "memories": {
    "total": 7,
    "byType": {
      "identity_model": 1,
      "person": 2,
      "event": 1,
      "project": 3
    },
    "recent": [
      {
        "id": "user",
        "filename": "user.md",
        "type": "identity_model",
        "preview": "## Core Identity & Emotional Modeling...",
        "last_updated": "2026-02-26"
      }
    ]
  },
  "sessions": {
    "total": 5,
    "all": [
      {
        "conversation_id": "session-123",
        "message_count": 12,
        "last_message_at": "2026-02-26T10:30:05.000Z",
        "recent_messages": [
          {
            "role": "user",
            "content": "What's on my schedule today?",
            "created_at": "2026-02-26T10:29:58.000Z"
          },
          {
            "role": "assistant",
            "content": "You have a team meeting at 3 PM...",
            "created_at": "2026-02-26T10:30:05.000Z"
          }
        ]
      },
      {
        "conversation_id": "session-122",
        "message_count": 8,
        "last_message_at": "2026-02-25T15:20:10.000Z",
        "recent_messages": [
          {
            "role": "user",
            "content": "Remember to buy groceries",
            "created_at": "2026-02-25T15:20:00.000Z"
          },
          {
            "role": "assistant",
            "content": "I've added that to your reminders...",
            "created_at": "2026-02-25T15:20:10.000Z"
          }
        ]
      }
    ]
  }
}
```

### Memory Endpoints

#### GET `/api/memory`

List all memory files. Supports optional `type` and `limit` query parameters.

#### GET `/api/memory/:id`

Get a single memory file by ID (filename without .md).

#### POST `/api/memory`

Create a new memory file.

**Request:**

```json
{
  "filename": "project-name",
  "type": "project",
  "content": "## Project Details\nDescription here...",
  "metadata": {
    "related_entities": ["user"],
    "emotional_intensity": 0.5
  }
}
```

#### PATCH `/api/memory/:id`

Update an existing memory file.

#### DELETE `/api/memory/:id`

Delete a memory file.

**Note:** All memory endpoints automatically refresh the vector embeddings index via middleware.

## 🧠 How It Works

### Memory System

1. **Markdown Files**: Memories are stored as markdown files in the `./memory` directory
2. **Frontmatter Metadata**: Each file contains YAML frontmatter with structured metadata
3. **Vector Indexing**: Files are chunked (800 chars) and embedded using Ollama
4. **SQLite Storage**: Embeddings stored in `memory_index.db` with file hash tracking
5. **Incremental Updates**: Only re-indexes files when content changes

### Chat Flow

1. User sends message to `/chat` endpoint
2. System searches memory for relevant context using semantic similarity
3. Context + message formatted into prompt with JARVIS system instructions
4. LLM (Gemini) generates streaming response with optional mutations
5. Mutations parsed and validated, then applied to filesystem
6. Response and metadata returned to client
7. Conversation history stored in SQLite (`chat.db`)
8. Auto-summarization at 50K token threshold

### Memory Mutations

LLM can modify memory files through structured mutations:

```json
{
  "action": "create" | "update" | "delete",
  "file": "filename_without_extension",
  "changes": {
    "metadata": { "key": "value" },
    "append": "Content to add",
    "delete_lines": ["lines to remove"]
  }
}
```

Mutations are validated and safely applied with error handling.

## 🎭 JARVIS Persona

The system prompt configures the LLM as "JARVIS" - a professional digital majordomo with:

- **Psychological Modeling**: Tracks user stress, behavior patterns, identity
- **Active Task Tracking**: Monitors reminders, deadlines, and priorities
- **Date/Time Awareness**: Converts relative dates ("tomorrow") to absolute dates
- **Proactive Assistance**: Mentions upcoming deadlines and pending tasks
- **Emotional Intelligence**: Adjusts tone based on user state
- **Memory Persistence**: Automatically saves important information to appropriate files

## 🛠️ Technologies

- **Runtime**: [Bun](https://bun.sh) - Fast JavaScript/TypeScript runtime
- **Language**: TypeScript with full type safety
- **Web Framework**: Express.js v5
- **Database**: SQLite (for embeddings and chat history)
- **Embeddings**: Ollama with qwen3-embedding:0.6b model
- **LLM**: Google Gemini 2.0 Flash API
- **Vector Search**: Cosine similarity with normalized embeddings

## 📚 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed module documentation and design patterns
- [Bruno API Collection](./Bruno%20API/) - API testing collection with example requests

### Memory File Format

Memory files use markdown with YAML frontmatter:

```markdown
---
id: user
type: identity_model
related_entities: []
emotional_intensity: 0.5
stress_flag: false
last_updated: 2026-02-26
---

## Core Identity & Emotional Modeling

[User's psychological patterns and recurring themes]

## Active Reminders & Tasks

- [ ] Complete project proposal (Stored: 2026-02-26)

## Schedule & Events

- [2026-02-27 (Thursday)] Team meeting - 3:00 PM - [Priority: High]
```

## 🔧 Development

```bash
# Install dependencies
bun install

# Initialize databases (first time setup)
bun run init

# Start the development server
bun run index.ts

# Clean databases (reset chat and embeddings)
bun run clean

# Re-embed all memory files
bun run embed
```

### Project Scripts

- `bun run init` - Initialize chat.db and memory_index.db with required tables
- `bun run clean` - Clears chat messages and embedding database
- `bun run embed` - Re-indexes all memory files with vector embeddings

### Testing with Bruno

The project includes a Bruno API collection in `./Bruno API/` for testing:

- Chat endpoints (`CHAT/`)
- Memory CRUD operations (`MEMORY/`)
- Environment configurations (`environments/`)

## 🏗️ Extending the Framework

### Adding a New LLM Provider

```typescript
import type {
  ILLMProvider,
  LLMMessage,
  StreamCallbacks,
} from "./src/core/types";

export class MyProvider implements ILLMProvider {
  async stream(
    messages: LLMMessage[],
    callbacks: StreamCallbacks,
  ): Promise<void> {
    // Implementation
  }
}
```

### Custom Memory Processing

```typescript
import { MemoryStore } from "./src/core/memory";

const store = new MemoryStore({
  chunkSize: 1000, // Adjust chunk size
  topK: 10, // Return more results
});

// Custom search with filtering
const results = await store.search("project deadline");
const filtered = results.filter((r) => r.score > 0.7);
```

## 🔐 Security Notes

- API keys should be stored in environment variables, never committed to version control
- The `.env` file is gitignored by default
- Memory files may contain sensitive personal information - protect the `./memory` directory
- SQLite databases (`chat.db`, `memory_index.db`) contain conversation history

## 📊 Performance Considerations

- **Embedding Generation**: First-time indexing may take time depending on memory file count
- **Incremental Updates**: Only changed files are re-embedded (hash-based tracking)
- **Token Management**: Conversations auto-summarize at 50K tokens to maintain context window
- **Vector Search**: Cosine similarity computed in-memory; suitable for small-to-medium datasets
- **Chunk Size**: Default 800 chars balances specificity vs. context coverage

## 🎯 Use Cases

- **Personal AI Assistant**: Long-term memory for context across conversations
- **Knowledge Management**: Semantic search over personal notes and documents
- **Task Tracking**: AI-driven reminder and deadline management
- **Project Documentation**: Automatic context retrieval for ongoing work
- **Psychological Modeling**: Track patterns, preferences, and behavioral insights
- **Event Planning**: Schedule management with intelligent date handling

## 🗂️ File Structure

```
brain2-backend/
├── memory/                  # Memory markdown files
│   ├── user.md             # User identity and state
│   ├── aarya.md            # Person memory
│   ├── chennai_trip.md     # Event memory
│   └── ...
├── src/
│   ├── core/               # Framework core
│   ├── features/           # API features
│   ├── providers/          # LLM providers
│   └── utils/              # Utilities
├── Bruno API/              # API testing collection
├── index.ts                # Server entry point
├── chat.db                 # SQLite chat history
├── memory_index.db         # SQLite vector embeddings
├── package.json
├── tsconfig.json
└── README.md
```

## 🤝 Contributing

This is a private project, but the modular architecture makes it easy to:

- Add new LLM providers
- Extend memory mutation capabilities
- Create custom context builders
- Implement new API endpoints

## 📝 License

Private project - All rights reserved

---

**Built with Bun** 🥟

This project was created using `bun init` in Bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
