import type { CodedFeatureProvenance } from "./feature-provenance.js";
import type { MlClassKey } from "./ml-classes.js";
import {
  mostRecent,
  parseFhirDate,
  resourcesByType,
  type FhirResource,
} from "./fhir-bundle.js";

/** LOINC codes → ML feature (vitals, labs). */
const LOINC_TO_FEATURE: Record<string, MlClassKey> = {
  "8480-6": "RestingBP",
  "55284-4": "RestingBP",
  "2093-3": "Cholesterol",
  "1558-6": "FastingBS",
  "2339-0": "FastingBS",
  "101692-2": "MaxHR",
  "91546-2": "Oldpeak",
};

/** Systolic BP component code inside LOINC 55284-4 panels. */
const LOINC_SYSTOLIC_BP = "8480-6";

/** SNOMED CT codes → ML feature or enum value. */
const SNOMED_CHEST_PAIN: Record<string, string> = {
  "425251007": "ATA",
  "194828000": "TA",
  "233896007": "TA",
  "161504007": "NAP",
  "426396005": "ASY",
};

const SNOMED_RESTING_ECG: Record<string, string> = {
  "164854002": "Normal",
  "55827005": "LVH",
  "59931005": "ST",
  "164861001": "ST",
  "164930006": "ST",
  "251135002": "ST",
};

const SNOMED_EXERCISE_ANGINA = new Set([
  "233819005",
  "194828000",
]);

const SNOMED_ST_SLOPE: Record<string, string> = {
  "251152005": "Up",
  "426561002": "Flat",
  "251155007": "Down",
};

const LOINC_OBSERVATION_FEATURES: MlClassKey[] = [
  "RestingBP",
  "Cholesterol",
  "FastingBS",
  "MaxHR",
  "Oldpeak",
];

function loincCodesForFeature(feature: MlClassKey): string[] {
  return Object.entries(LOINC_TO_FEATURE)
    .filter(([, mappedFeature]) => mappedFeature === feature)
    .map(([code]) => code);
}

function observationHasLoinc(obs: FhirResource, codes: readonly string[]): boolean {
  return codingsFrom(obs.code).some(
    (coding) => coding.code != null && codes.includes(coding.code)
  );
}

function isMappedLoinc(code: string): boolean {
  return code in LOINC_TO_FEATURE;
}

export interface ClinicalFact {
  text: string;
  value: unknown;
}

type PartialFeatures = Partial<Record<MlClassKey, unknown>>;
type PartialProvenance = Partial<Record<MlClassKey, CodedFeatureProvenance>>;

export interface CodedExtractionResult {
  values: PartialFeatures;
  provenance: PartialProvenance;
}

interface Coding {
  system?: string;
  code?: string;
  display?: string;
}

interface CodeableConcept {
  coding?: Coding[];
  text?: string;
}

function codingsFrom(concept: unknown): Coding[] {
  if (!concept || typeof concept !== "object") return [];
  const c = concept as CodeableConcept;
  return Array.isArray(c.coding) ? c.coding : [];
}

function displayFrom(concept: unknown): string | null {
  if (!concept || typeof concept !== "object") return null;
  const c = concept as CodeableConcept;
  const fromCoding = c.coding?.find((x) => x.display)?.display;
  return fromCoding ?? c.text ?? null;
}

function quantityValue(resource: FhirResource): number | null {
  const vq = resource.valueQuantity as { value?: number } | undefined;
  if (typeof vq?.value === "number") return vq.value;

  const component = resource.component as FhirResource[] | undefined;
  if (!Array.isArray(component)) return null;

  for (const part of component) {
    const partValue = quantityValue(part);
    if (partValue != null) return partValue;
  }

  return null;
}

function systolicFromObservation(obs: FhirResource): number | null {
  const components = obs.component as FhirResource[] | undefined;
  if (Array.isArray(components)) {
    for (const part of components) {
      for (const coding of codingsFrom(part.code)) {
        if (coding.code === LOINC_SYSTOLIC_BP) {
          const value = quantityValue(part);
          if (value != null) return value;
        }
      }
    }
  }

  for (const coding of codingsFrom(obs.code)) {
    if (coding.code === LOINC_SYSTOLIC_BP) {
      return quantityValue(obs);
    }
  }

  return null;
}

function observationEffectiveDate(obs: FhirResource): Date | null {
  return (
    parseFhirDate(obs.effectiveDateTime) ??
    parseFhirDate(obs.issued) ??
    parseFhirDate((obs.period as { start?: string } | undefined)?.start)
  );
}

function ageFromBirthDate(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

function normalizeSex(gender: unknown): "M" | "F" | null {
  if (typeof gender !== "string") return null;
  const g = gender.toLowerCase();
  if (g === "male" || g === "m") return "M";
  if (g === "female" || g === "f") return "F";
  return null;
}

function fastingBsFromGlucose(valueMgDl: number): 0 | 1 {
  return valueMgDl > 120 ? 1 : 0;
}

function recordSnomedMatch(
  features: PartialFeatures,
  provenance: PartialProvenance,
  feature: MlClassKey,
  value: unknown,
  coding: Coding
): void {
  if (features[feature] != null) return;

  features[feature] = value;
  provenance[feature] = {
    source: "coded",
    codeSystem: "SNOMED",
    ...(coding.code ? { code: coding.code } : {}),
    display: coding.display ?? coding.code ?? feature,
  };
}

function applySnomedCondition(
  features: PartialFeatures,
  provenance: PartialProvenance,
  condition: FhirResource
): void {
  for (const coding of codingsFrom(condition.code)) {
    const code = coding.code;
    if (!code) continue;

    const chestPain = SNOMED_CHEST_PAIN[code];
    if (chestPain) {
      recordSnomedMatch(features, provenance, "ChestPainType", chestPain, coding);
    }

    if (SNOMED_EXERCISE_ANGINA.has(code)) {
      recordSnomedMatch(features, provenance, "ExerciseAngina", "Y", coding);
    }

    const ecg = SNOMED_RESTING_ECG[code];
    if (ecg) {
      recordSnomedMatch(features, provenance, "RestingECG", ecg, coding);
    }

    const slope = SNOMED_ST_SLOPE[code];
    if (slope) {
      recordSnomedMatch(features, provenance, "ST_Slope", slope, coding);
    }
  }
}

function recordLoincMatch(
  features: PartialFeatures,
  provenance: PartialProvenance,
  feature: MlClassKey,
  value: unknown,
  coding: Coding
): void {
  if (features[feature] != null) return;

  features[feature] = value;
  provenance[feature] = {
    source: "coded",
    codeSystem: "LOINC",
    ...(coding.code ? { code: coding.code } : {}),
    display: coding.display ?? coding.code ?? feature,
  };
}

function applyLoincObservation(
  features: PartialFeatures,
  provenance: PartialProvenance,
  obs: FhirResource
): void {
  for (const coding of codingsFrom(obs.code)) {
    const code = coding.code;
    if (!code || !isMappedLoinc(code)) continue;

    const feature = LOINC_TO_FEATURE[code];

    if (feature === "RestingBP") {
      const systolic = systolicFromObservation(obs);
      if (systolic != null) {
        let systolicCoding: Coding = {
          system: "http://loinc.org",
          code: LOINC_SYSTOLIC_BP,
          display: "Systolic blood pressure",
        };

        const components = obs.component as FhirResource[] | undefined;
        if (Array.isArray(components)) {
          for (const part of components) {
            for (const coding of codingsFrom(part.code)) {
              if (coding.code === LOINC_SYSTOLIC_BP) {
                systolicCoding = coding;
                break;
              }
            }
          }
        }

        recordLoincMatch(features, provenance, "RestingBP", systolic, systolicCoding);
      }
      continue;
    }

    const numeric = quantityValue(obs);
    if (numeric == null || !feature) continue;

    if (feature === "FastingBS") {
      recordLoincMatch(
        features,
        provenance,
        "FastingBS",
        fastingBsFromGlucose(numeric),
        coding
      );
      continue;
    }

    recordLoincMatch(features, provenance, feature, numeric, coding);
  }
}

function applyLatestLoincObservations(
  features: PartialFeatures,
  provenance: PartialProvenance,
  observations: FhirResource[],
  feature: MlClassKey
): void {
  const loincCodes = loincCodesForFeature(feature);
  if (loincCodes.length === 0) return;

  const matching = observations.filter((obs) => observationHasLoinc(obs, loincCodes));
  const latest = mostRecent(matching, observationEffectiveDate);
  if (latest) applyLoincObservation(features, provenance, latest);
}

/** Deterministic SNOMED / LOINC extraction from a FHIR bundle. */
export function extractCodedFeatures(fhirJson: unknown): CodedExtractionResult {
  const values: PartialFeatures = {};
  const provenance: PartialProvenance = {};

  const patients = resourcesByType(fhirJson, "Patient");
  const patient = patients[0];
  if (patient) {
    if (typeof patient.birthDate === "string") {
      values.Age = ageFromBirthDate(patient.birthDate);
      provenance.Age = {
        source: "coded",
        codeSystem: "FHIR",
        display: "Patient.birthDate",
      };
    }
    const sex = normalizeSex(patient.gender);
    if (sex) {
      values.Sex = sex;
      provenance.Sex = {
        source: "coded",
        codeSystem: "FHIR",
        display: "Patient.gender",
      };
    }
  }

  const observations = resourcesByType(fhirJson, "Observation");

  for (const feature of LOINC_OBSERVATION_FEATURES) {
    applyLatestLoincObservations(values, provenance, observations, feature);
  }

  for (const condition of resourcesByType(fhirJson, "Condition")) {
    applySnomedCondition(values, provenance, condition);
  }

  return { values, provenance };
}

/** Human-readable clinical lines for embedding fallback (not raw JSON paths). */
export function extractClinicalSnippets(fhirJson: unknown): ClinicalFact[] {
  const facts: ClinicalFact[] = [];

  const patients = resourcesByType(fhirJson, "Patient");
  const patient = patients[0];
  if (patient) {
    if (typeof patient.birthDate === "string") {
      const age = ageFromBirthDate(patient.birthDate);
      facts.push({ text: `Patient age ${age} years`, value: age });
    }
    const sex = normalizeSex(patient.gender);
    if (sex) {
      facts.push({
        text: `Patient sex ${sex === "M" ? "male" : "female"}`,
        value: sex,
      });
    }
  }

  for (const obs of resourcesByType(fhirJson, "Observation")) {
    const label = displayFrom(obs.code);
    if (!label) continue;

    const systolic = systolicFromObservation(obs);
    if (systolic != null) {
      facts.push({
        text: `Systolic blood pressure ${systolic} mmHg`,
        value: systolic,
      });
      continue;
    }

    const numeric = quantityValue(obs);
    if (numeric != null) {
      const unit =
        (obs.valueQuantity as { unit?: string } | undefined)?.unit ?? "";
      facts.push({
        text: `${label} ${numeric}${unit ? ` ${unit}` : ""}`,
        value: numeric,
      });
    }
  }

  for (const condition of resourcesByType(fhirJson, "Condition")) {
    for (const coding of codingsFrom(condition.code)) {
      const label = coding.display ?? coding.code;
      if (!label) continue;
      facts.push({ text: `Diagnosis ${label}`, value: label });
      if (coding.code) {
        const chestPain = SNOMED_CHEST_PAIN[coding.code];
        if (chestPain) {
          facts.push({
            text: `Chest pain type ${chestPain}`,
            value: chestPain,
          });
        }
      }
    }
  }

  const seen = new Set<string>();
  return facts.filter((fact) => {
    if (seen.has(fact.text)) return false;
    seen.add(fact.text);
    return true;
  });
}
