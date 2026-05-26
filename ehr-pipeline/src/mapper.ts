import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { similarity } from "ml-distance";
import {
  extractClinicalSnippets,
  extractCodedFeatures,
} from "./fhir-coded-extract.js";
import {
  type FeatureProvenance,
  type MapFhirResult,
} from "./feature-provenance.js";
import { getEmbeddings } from "./gemini-embeddings.js";
import {
  ML_CLASSES,
  type MlClassEmbeddingsFile,
  type MlClassKey,
  type StoredMlClassEmbedding,
} from "./ml-classes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const embeddingsPath = join(__dirname, "data/ml-class-embeddings.json");

const EMBEDDING_MATCH_THRESHOLD = 0.65;

function loadMlClassEmbeddings(): StoredMlClassEmbedding[] {
  let payload: MlClassEmbeddingsFile;

  try {
    payload = JSON.parse(readFileSync(embeddingsPath, "utf-8")) as MlClassEmbeddingsFile;
  } catch {
    throw new Error(
      `Missing ML class embeddings at ${embeddingsPath}. Run: npm run generate:ml-embeddings`
    );
  }

  if (payload.classes.length !== ML_CLASSES.length) {
    throw new Error(
      `Expected ${ML_CLASSES.length} stored ML class embeddings but found ${payload.classes.length}. Run: npm run generate:ml-embeddings`
    );
  }

  return payload.classes;
}

const ML_CLASS_EMBEDDINGS = loadMlClassEmbeddings();

function normalizeFeatureValue(key: MlClassKey, value: unknown): unknown {
  if (key === "Age" && typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const birthDate = new Date(value);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    return age;
  }

  if (key === "Sex" && typeof value === "string") {
    const g = value.toLowerCase();
    if (g === "male" || g === "m") return "M";
    if (g === "female" || g === "f") return "F";
  }

  return value;
}

function emptyFeatureMap(): Record<MlClassKey, unknown> {
  return Object.fromEntries(ML_CLASSES.map((c) => [c.key, null])) as Record<
    MlClassKey,
    unknown
  >;
}

function emptyProvenanceMap(): Record<MlClassKey, FeatureProvenance> {
  return Object.fromEntries(
    ML_CLASSES.map((c) => [
      c.key,
      {
        source: null,
        className: c.description,
        matchedSnippet: null,
        cosineSimilarity: null,
      },
    ])
  ) as Record<MlClassKey, FeatureProvenance>;
}

async function fillViaEmbeddings(
  result: Record<MlClassKey, unknown>,
  provenance: Record<MlClassKey, FeatureProvenance>,
  fhirJson: unknown
): Promise<void> {
  const missingClasses = ML_CLASS_EMBEDDINGS.filter((c) => result[c.key] == null);
  if (missingClasses.length === 0) return;

  const facts = extractClinicalSnippets(fhirJson);
  if (facts.length === 0) return;

  const snippetTexts = facts.map((f) => f.text);
  const snippetEmbeddings = await getEmbeddings(snippetTexts);

  for (const mlClass of missingClasses) {
    const mlVector = mlClass.embedding;
    let bestIndex = -1;
    let highestSimilarity = -1;

    for (let j = 0; j < snippetEmbeddings.length; j++) {
      const snippetVector = snippetEmbeddings[j];
      if (!mlVector?.length || !snippetVector?.length) continue;

      const similarityValue = similarity.cosine(mlVector, snippetVector);
      if (similarityValue > highestSimilarity) {
        highestSimilarity = similarityValue;
        bestIndex = j;
      }
    }

    const bestFact = bestIndex >= 0 ? facts[bestIndex] : null;
    provenance[mlClass.key] = {
      source:
        highestSimilarity > EMBEDDING_MATCH_THRESHOLD && bestFact ? "embedding" : null,
      className: mlClass.description,
      matchedSnippet: bestFact?.text ?? null,
      cosineSimilarity: bestIndex >= 0 ? highestSimilarity : null,
    };

    if (highestSimilarity > EMBEDDING_MATCH_THRESHOLD && bestFact) {
      result[mlClass.key] = normalizeFeatureValue(mlClass.key, bestFact.value);
    }
  }
}

export async function mapFhirToFeatures(fhirJson: unknown): Promise<MapFhirResult> {
  const features = emptyFeatureMap();
  const featureProvenance = emptyProvenanceMap();

  const coded = extractCodedFeatures(fhirJson);
  for (const mlClass of ML_CLASSES) {
    const raw = coded.values[mlClass.key];
    const codedProvenance = coded.provenance[mlClass.key];

    if (raw != null) {
      features[mlClass.key] = normalizeFeatureValue(mlClass.key, raw);
    }

    if (codedProvenance) {
      featureProvenance[mlClass.key] = {
        ...codedProvenance,
        className: mlClass.description,
        matchedSnippet: null,
        cosineSimilarity: null,
      };
    }
  }

  await fillViaEmbeddings(features, featureProvenance, fhirJson);

  return { features, featureProvenance };
}

export type { FeatureProvenance, MapFhirResult } from "./feature-provenance.js";
