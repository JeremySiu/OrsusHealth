import { GoogleGenAI } from "@google/genai";
import { EMBEDDING_MODEL } from "./ml-classes.js";

const ai = new GoogleGenAI({});

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: texts,
  });

  const embeddings = response.embeddings?.map((e) => e.values ?? []) ?? [];
  if (embeddings.length !== texts.length) {
    throw new Error(
      `Expected ${texts.length} embeddings but received ${embeddings.length}`
    );
  }

  return embeddings;
}
