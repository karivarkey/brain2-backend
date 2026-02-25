#!/usr/bin/env bun

import { MemoryStore } from "./src/lib/memory_store";

// ------------------ CLI ARG PARSING ------------------

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Usage:
  bun test.ts embed
  bun test.ts search "your query here"
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
      console.log(`${result.file}  |  ${result.score.toFixed(2)}`);
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
