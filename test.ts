#!/usr/bin/env bun

import { MemoryStore } from "./src/core/memory";
import { buildContext } from "./src/core/context";
import serviceAccount from "./admin.json" assert { type: "json" };
import admin from "firebase-admin";
import { buildPrompt, promptToMessages } from "./src/core/prompt";
import { GeminiProvider } from "./src/providers";
import { streamWithMutationCapture } from "./src/core/streaming";

// ------------------ CLI ARG PARSING ------------------

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Usage:
  bun test.ts embed                    # Refresh memory index
  bun test.ts search "your query"      # Search memory
  bun test.ts ask "your question"      # Full pipeline: search → context → Gemini
`);
  process.exit(1);
}

const command = args[0];

// ------------------ MAIN EXECUTION ------------------

async function main() {
  const store = new MemoryStore();

  if (command === "embed") {
    console.log("🔄 Refreshing memory index...\n");
    await store.refreshIndex();
    console.log("\n✅ Index refresh complete.");
    return;
  }

  if (command === "search") {
    const query = args.slice(1).join(" ").trim();

    if (!query) {
      console.error("❌ Please provide a search query.");
      process.exit(1);
    }

    console.log(`\n🔍 Query: "${query}"\n`);

    const results = await store.search(query);

    if (results.length === 0) {
      console.log("No results found.");
      return;
    }

    console.log("Top Results:\n");

    for (const result of results) {
      console.log(`${result.file}  |  ${result.score.toFixed(4)}`);
    }

    return;
  }

  if (command == "notify") {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(
          serviceAccount as admin.ServiceAccount,
        ),
      });
    }

    async function sendNotification(
      token: string,
      title: string,
      body: string,
    ) {
      return admin.messaging().send({
        token,
        notification: { title, body },
        webpush: {
          notification: {
            icon: "https://ai.karivarkey.in/icons/icon-192.png",
          },
        },
      });
    }
    sendNotification(
      "fXo9n7s8Qe2r5v0Zt3a:APA91bHj1mN8u9qLhXkKJzj6l5s8w7y9z0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1Z2",
      "Test Notification",
      "This is a test notification from the CLI.",
    )
      .then(() => console.log("✅ Notification sent successfully"))
      .catch((err) => console.error("❌ Error sending notification:", err));
    return;
  }
  if (command === "ask") {
    const question = args.slice(1).join(" ").trim();

    if (!question) {
      console.error("❌ Please provide a question.");
      process.exit(1);
    }

    console.log(`\n🧠 Question: "${question}"\n`);
    console.log("━".repeat(80));
    console.log("Searching memory...\n");

    // Step 1: Search
    const searchResults = await store.search(question);

    if (searchResults.length === 0) {
      console.log("❌ No relevant memory found.");
      return;
    }

    console.log(`Found ${searchResults.length} relevant memory files:\n`);
    for (const result of searchResults) {
      console.log(`  • ${result.file} (score: ${result.score.toFixed(4)})`);
    }

    // Step 2: Build context
    console.log("\n━".repeat(80));
    console.log("Building context block...\n");
    const context = await buildContext(searchResults, "./memory", 2);

    // Step 3: Build prompt
    const promptMsg = buildPrompt(question, context);

    console.log("📋 System Prompt:\n");
    console.log(promptMsg.system);
    console.log("\n" + "━".repeat(80));
    console.log("\n📚 Memory Context:\n");
    console.log(promptMsg.contextBlock);
    console.log("\n" + "━".repeat(80));
    console.log("\n💬 User Message:\n");
    console.log(promptMsg.user);
    console.log("\n" + "━".repeat(80));
    console.log("\n🔄 Streaming Response from Gemini:\n");

    // Step 4: Create provider and stream with mutation capture
    try {
      const provider = new GeminiProvider();
      const messages = promptToMessages(promptMsg);

      console.log(`Using: ${provider.getName()}\n`);

      await streamWithMutationCapture(provider, messages, {
        onToken: (token) => process.stdout.write(token),
        onMemoryMutation: async (mutation) => {
          console.error("\n\n✨ Memory mutation captured:");
          console.error(`   Action: ${mutation.action}`);
          console.error(`   File: ${mutation.file}`);
          console.error(`   Changes:`, mutation.changes);
          console.error("   ✅ Applied to memory\n");
        },
      });

      console.log("\n\n" + "━".repeat(80));
      console.log("✅ Conversation complete.\n");
    } catch (e) {
      if (
        e instanceof Error &&
        (e.message.includes("GEMINI_API_KEY") ||
          e.message.includes("GOOGLE_API_KEY"))
      ) {
        console.error(
          "\n\n❌ Gemini API Key not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.",
        );
        console.error(
          "   For demo purposes, this shows the prompt structure.\n",
        );
      } else {
        throw e;
      }
    }

    return;
  }

  console.error(`❌ Unknown command: ${command}`);
  process.exit(1);
}

main().catch((err) => {
  console.error("🔥 Fatal Error:", err);
  process.exit(1);
});
