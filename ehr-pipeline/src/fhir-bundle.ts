export type FhirResource = Record<string, unknown>;

export interface FhirBundleEntry {
  resource?: FhirResource;
  fullUrl?: string;
}

export interface FhirBundle {
  resourceType?: string;
  entry?: FhirBundleEntry[];
  type?: string;
}

/** Normalize upload shapes: Bundle, nested payload, or array of bundles. */
export function collectResources(fhirJson: unknown): FhirResource[] {
  const resources: FhirResource[] = [];

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;

    const obj = node as FhirBundle & FhirResource;

    if (obj.resourceType === "Bundle" && Array.isArray(obj.entry)) {
      for (const item of obj.entry) {
        if (item?.resource) resources.push(item.resource);
      }
      return;
    }

    if (obj.resourceType && obj.resourceType !== "Bundle") {
      resources.push(obj);
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) visit(item);
    }
  };

  visit(fhirJson);
  return resources;
}

export function resourcesByType(
  fhirJson: unknown,
  resourceType: string
): FhirResource[] {
  return collectResources(fhirJson).filter((r) => r.resourceType === resourceType);
}

export function parseFhirDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function mostRecent<T>(items: T[], getDate: (item: T) => Date | null): T | null {
  let best: T | null = null;
  let bestTime = -Infinity;

  for (const item of items) {
    const date = getDate(item);
    if (!date) continue;
    const time = date.getTime();
    if (time > bestTime) {
      bestTime = time;
      best = item;
    }
  }

  return best;
}
