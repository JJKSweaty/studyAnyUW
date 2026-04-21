import path from "node:path";
import { existsSync } from "node:fs";

import {
  createCourse,
  createWorkspace,
  getActiveProviderProfile,
  insertChunks,
  insertDocument,
  listProviderProfiles,
  listWorkspaces,
  replaceWorkspaceContent,
  upsertProviderProfile,
} from "./repository";
import { getDatabasePath, getSeedDir, writeTextFile } from "./storage";
import { analyzeWorkspaceText, buildChunkIndex, embedChunks } from "./study-pipeline";

const SAMPLE_TEXT = `# Arrays and Dynamic Arrays
Arrays store elements in contiguous memory and support O(1) indexed access.
Dynamic arrays amortize insertion at the back but resizing causes occasional O(n) work.

# Linked Lists
Linked lists trade contiguous storage for easier local insertion and deletion.
They have poor cache locality and require pointer traversal.

# Stacks and Queues
Stacks are LIFO. Queues are FIFO.
A queue implemented with a circular buffer avoids shifting elements.

# Trees and BSTs
A binary search tree supports ordered search when the tree stays balanced.
Degenerate trees behave like linked lists.

Question: What is the time complexity of searching in a balanced BST and why?
Answer: O(log n), because each comparison discards about half of the remaining search space.

Question: Compare a linked list to a dynamic array.
Answer: Linked lists are better for local insertions when the node is known, while dynamic arrays give O(1) indexed access and better cache locality.
`;

async function main() {
  if (!existsSync(getDatabasePath())) {
    // Force database creation through repository access.
    getActiveProviderProfile();
  }

  const providerProfiles = [
    {
      name: "Ollama Local",
      providerType: "ollama" as const,
      baseUrl: "http://127.0.0.1:11434/v1",
      modelName: "gpt-oss:20b",
      embeddingModel: "",
      temperature: 0.2,
      maxOutputTokens: 1400,
      chunkSize: 900,
      retrievalCount: 5,
      gradingStrictness: "balanced" as const,
      isActive: true,
    },
    {
      name: "LM Studio Local",
      providerType: "lmstudio" as const,
      baseUrl: "http://127.0.0.1:1234/v1",
      modelName: "local-model",
      embeddingModel: "",
      temperature: 0.2,
      maxOutputTokens: 1400,
      chunkSize: 900,
      retrievalCount: 5,
      gradingStrictness: "balanced" as const,
      isActive: false,
    },
  ];

  const existingProfiles = listProviderProfiles();
  providerProfiles.forEach((profile) => {
    if (!existingProfiles.some((existing) => existing.name === profile.name)) {
      upsertProviderProfile(profile);
    }
  });

  if (listWorkspaces().some((workspace) => workspace.name === "Midterm Drill Pack")) {
    return;
  }

  const courseId = createCourse({
    name: "ECE 250 Theory",
    code: "ECE250",
    description: "Seed workspace for data structures and algorithms theory drills.",
  });

  const workspaceId = createWorkspace({
    courseId,
    name: "Midterm Drill Pack",
    description: "Seeded local workspace for testing the study loop.",
    tags: ["midterm", "theory", "dsa"],
  });

  const storagePath = path.join(getSeedDir(), "ece250-theory.txt");
  writeTextFile(storagePath, SAMPLE_TEXT);

  const documentId = insertDocument({
    workspaceId,
    title: "ECE 250 theory notes",
    sourceType: "seed",
    kind: "txt",
    mimeType: "text/plain",
    originalName: "ece250-theory.txt",
    storagePath,
    extractedText: SAMPLE_TEXT,
    stats: {
      characters: SAMPLE_TEXT.length,
      sections: 4,
    },
  });

  const activeProfile = getActiveProviderProfile();
  const chunks = buildChunkIndex(SAMPLE_TEXT, activeProfile?.chunkSize ?? 900);
  const embeddings = await embedChunks(chunks.map((chunk) => chunk.text));

  insertChunks(
    workspaceId,
    documentId,
    chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index],
    })),
  );

  const pack = await analyzeWorkspaceText({
    workspaceName: "Midterm Drill Pack",
    text: SAMPLE_TEXT,
  });

  replaceWorkspaceContent(workspaceId, {
    conciseSummary: pack.conciseSummary,
    detailedSummary: pack.courseSummary,
    topics: pack.topics,
    flashcards: pack.flashcards,
    questions: pack.questions,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
