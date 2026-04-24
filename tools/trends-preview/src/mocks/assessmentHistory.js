const FULL_HISTORY_RECORDS = [
  { id: 'mock-1', recordedAt: '2026-01-05T12:00:00Z', dateLabel: 'Jan 5, 2026', riskProbability: 58.2, restingBP: 142, cholesterol: 228, maxHR: 149 },
  { id: 'mock-2', recordedAt: '2026-01-14T12:00:00Z', dateLabel: 'Jan 14, 2026', riskProbability: 55.7, restingBP: 139, cholesterol: 221, maxHR: 151 },
  { id: 'mock-3', recordedAt: '2026-01-23T12:00:00Z', dateLabel: 'Jan 23, 2026', riskProbability: 53.9, restingBP: 137, cholesterol: 217, maxHR: 153 },
  { id: 'mock-4', recordedAt: '2026-02-02T12:00:00Z', dateLabel: 'Feb 2, 2026', riskProbability: 51.8, restingBP: 136, cholesterol: 214, maxHR: 154 },
  { id: 'mock-5', recordedAt: '2026-02-11T12:00:00Z', dateLabel: 'Feb 11, 2026', riskProbability: 49.6, restingBP: 134, cholesterol: 210, maxHR: 155 },
  { id: 'mock-6', recordedAt: '2026-02-20T12:00:00Z', dateLabel: 'Feb 20, 2026', riskProbability: 47.5, restingBP: 132, cholesterol: 206, maxHR: 157 },
  { id: 'mock-7', recordedAt: '2026-03-01T12:00:00Z', dateLabel: 'Mar 1, 2026', riskProbability: 46.1, restingBP: 131, cholesterol: 203, maxHR: 159 },
  { id: 'mock-8', recordedAt: '2026-03-10T12:00:00Z', dateLabel: 'Mar 10, 2026', riskProbability: 43.8, restingBP: 129, cholesterol: 198, maxHR: 160 },
  { id: 'mock-9', recordedAt: '2026-03-19T12:00:00Z', dateLabel: 'Mar 19, 2026', riskProbability: 41.9, restingBP: 127, cholesterol: 193, maxHR: 161 },
  { id: 'mock-10', recordedAt: '2026-03-28T12:00:00Z', dateLabel: 'Mar 28, 2026', riskProbability: 40.5, restingBP: 126, cholesterol: 190, maxHR: 163 },
  { id: 'mock-11', recordedAt: '2026-04-06T12:00:00Z', dateLabel: 'Apr 6, 2026', riskProbability: 38.7, restingBP: 124, cholesterol: 186, maxHR: 164 },
  { id: 'mock-12', recordedAt: '2026-04-15T12:00:00Z', dateLabel: 'Apr 15, 2026', riskProbability: 36.9, restingBP: 122, cholesterol: 181, maxHR: 166 },
  { id: 'mock-13', recordedAt: '2026-04-24T12:00:00Z', dateLabel: 'Apr 24, 2026', riskProbability: 35.4, restingBP: 121, cholesterol: 178, maxHR: 167 },
];

const MOCK_SCENARIOS = {
  empty: [],
  single: [FULL_HISTORY_RECORDS[FULL_HISTORY_RECORDS.length - 1]],
  full: FULL_HISTORY_RECORDS,
};

let activeScenario = 'full';

export function setMockScenario(scenario) {
  if (MOCK_SCENARIOS[scenario]) {
    activeScenario = scenario;
  }
}

export function getMockScenario() {
  return activeScenario;
}

export async function fetchAssessmentRecords() {
  return MOCK_SCENARIOS[activeScenario] || MOCK_SCENARIOS.full;
}

export function normalizeAssessmentHistory(records) {
  return records;
}
