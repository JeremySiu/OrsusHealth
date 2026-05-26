export const EMBEDDING_MODEL = "gemini-embedding-001";

// Keys match the /predict API schema
export const ML_CLASSES = [
  { key: "Age", description: "Patient's chronological age in years" },
  { key: "Sex", description: "Patient's biological sex or gender (M/F)" },
  {
    key: "ChestPainType",
    description:
      "Chest pain type classification: Typical Angina, Atypical Angina, Non-Anginal Pain, or Asymptomatic",
  },
  { key: "RestingBP", description: "Resting blood pressure in mm Hg" },
  { key: "Cholesterol", description: "Serum cholesterol level in mm/dl" },
  {
    key: "FastingBS",
    description: "Fasting blood sugar level greater than 120 mg/dl",
  },
  { key: "RestingECG", description: "Resting electrocardiogram (ECG/EKG) results" },
  { key: "MaxHR", description: "Maximum heart rate achieved during exercise" },
  {
    key: "ExerciseAngina",
    description: "Exercise-induced angina present (Y/N)",
  },
  {
    key: "Oldpeak",
    description: "ST depression induced by exercise relative to rest",
  },
  {
    key: "ST_Slope",
    description: "The slope of the peak exercise ST segment (Up, Flat, Down)",
  },
] as const;

export type MlClassKey = (typeof ML_CLASSES)[number]["key"];

export interface StoredMlClassEmbedding {
  key: MlClassKey;
  description: string;
  embedding: number[];
}

export interface MlClassEmbeddingsFile {
  model: string;
  generatedAt: string;
  classes: StoredMlClassEmbedding[];
}
