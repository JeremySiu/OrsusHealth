import { extractCodedFeatures, extractClinicalSnippets } from "../src/fhir-coded-extract.js";

const sampleBundle = {
  resourceType: "Bundle",
  type: "collection",
  entry: [
    {
      resource: {
        resourceType: "Patient",
        birthDate: "1959-08-09",
        gender: "female",
      },
    },
    {
      resource: {
        resourceType: "Observation",
        status: "final",
        code: {
          coding: [{ system: "http://loinc.org", code: "55284-4", display: "Blood Pressure" }],
        },
        effectiveDateTime: "2016-05-13T09:03:20-04:00",
        component: [
          {
            code: {
              coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic Blood Pressure" }],
            },
            valueQuantity: { value: 120, unit: "mmHg" },
          },
        ],
      },
    },
    {
      resource: {
        resourceType: "Observation",
        status: "final",
        code: {
          coding: [{ system: "http://loinc.org", code: "2093-3", display: "Total Cholesterol" }],
        },
        effectiveDateTime: "2014-07-16T11:06:12-04:00",
        valueQuantity: { value: 190, unit: "mg/dL" },
      },
    },
    {
      resource: {
        resourceType: "Condition",
        code: {
          coding: [{ system: "http://snomed.info/sct", code: "68496003", display: "Polyp of colon" }],
        },
      },
    },
  ],
};

const coded = extractCodedFeatures(sampleBundle);
const snippets = extractClinicalSnippets(sampleBundle);

console.log("Coded features:", JSON.stringify(coded.values, null, 2));
console.log("Coded provenance:", JSON.stringify(coded.provenance, null, 2));
console.log("Clinical snippets:", snippets.map((s) => s.text));
