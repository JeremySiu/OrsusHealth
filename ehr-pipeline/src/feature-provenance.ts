import type { MlClassKey } from "./ml-classes.js";

export type FeatureSource = "coded" | "embedding" | null;

export interface FeatureProvenance {
  source: FeatureSource;
  className: string;
  codeSystem?: "LOINC" | "SNOMED" | "FHIR";
  code?: string;
  display?: string;
  matchedSnippet?: string | null;
  cosineSimilarity?: number | null;
}

export interface MapFhirResult {
  features: Record<MlClassKey, unknown>;
  featureProvenance: Record<MlClassKey, FeatureProvenance>;
}

export interface CodedFeatureProvenance {
  source: "coded";
  codeSystem: "LOINC" | "SNOMED" | "FHIR";
  code?: string;
  display?: string;
}
