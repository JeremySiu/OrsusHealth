import "dotenv/config";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getEmbeddings } from "../src/gemini-embeddings.js";
import {
  EMBEDDING_MODEL,
  ML_CLASSES,
  type MlClassEmbeddingsFile,
} from "../src/ml-classes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, "../src/data/ml-class-embeddings.json");

async function main() {
  const descriptions = ML_CLASSES.map((c) => c.description);
  const embeddings = await getEmbeddings(descriptions);

  const payload: MlClassEmbeddingsFile = {
    model: EMBEDDING_MODEL,
    generatedAt: new Date().toISOString(),
    classes: ML_CLASSES.map((mlClass, index) => ({
      key: mlClass.key,
      description: mlClass.description,
      embedding: embeddings[index] ?? [],
    })),
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(payload, null, 2));

  console.log(`Wrote ${payload.classes.length} ML class embeddings to ${outputPath}`);
}

main().catch((error) => {
  console.error("Failed to generate ML class embeddings:", error);
  process.exit(1);
});
