import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../../../frontend/src/index.css';
import MyTrends from '../../../frontend/src/components/MyTrends copy.jsx';
import { getMockScenario, setMockScenario } from './mocks/assessmentHistory.js';

const SCENARIO_OPTIONS = [
  { id: 'empty', label: 'No data' },
  { id: 'single', label: '1 data point' },
  { id: 'full', label: 'Full history' },
];

function PreviewShell() {
  const [scenario, setScenario] = useState(getMockScenario());
  const trendsKey = useMemo(() => `trends-preview-${scenario}`, [scenario]);

  function handleScenarioChange(nextScenario) {
    setMockScenario(nextScenario);
    setScenario(nextScenario);
  }

  return (
    <>
      <style>
        {`
          body {
            overflow: auto !important;
            overflow-x: hidden !important;
            background: linear-gradient(180deg, #f6f8fb, #e8edf5) !important;
            color: #18181b !important;
          }
        `}
      </style>
      <div
        style={{
          minHeight: '100vh',
          background:
            'radial-gradient(circle at top left, rgba(59,130,246,0.08), transparent 28%), radial-gradient(circle at top right, rgba(20,184,166,0.1), transparent 30%), linear-gradient(180deg, #f6f8fb, #e8edf5)',
          color: '#18181b',
          overflow: 'visible',
        }}
      >
      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '2rem 1.25rem 2.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.72)',
            color: '#0f766e',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            padding: '0.65rem 0.9rem',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
          }}
        >
          Trends Preview Tool
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(2rem, 4vw, 3.25rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.04em',
            margin: '1rem 0 0.5rem',
          }}
        >
          Rendering directly from `MyTrends copy.jsx`
        </h1>
        <p style={{ margin: 0, maxWidth: '48rem', color: '#52525b', fontSize: '15px', lineHeight: 1.7 }}>
          This preview mounts the copied Trends component with tool-local mock auth and mock assessment history, so the
          preview stays inside `tools/trends-preview` while still showing the real component.
        </p>

        <div
          style={{
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#71717a',
            }}
          >
            Mock scenario
          </span>
          {SCENARIO_OPTIONS.map((option) => {
            const isActive = option.id === scenario;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleScenarioChange(option.id)}
                style={{
                  border: '1px solid',
                  borderColor: isActive ? 'transparent' : 'rgba(228,228,231,0.88)',
                  borderRadius: '999px',
                  background: isActive ? '#18181b' : 'rgba(255,255,255,0.84)',
                  color: isActive ? '#ffffff' : '#3f3f46',
                  cursor: 'pointer',
                  font: 'inherit',
                  fontSize: '14px',
                  fontWeight: 600,
                  padding: '0.7rem 0.95rem',
                  boxShadow: isActive ? '0 12px 22px rgba(24,24,27,0.18)' : 'none',
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginTop: '1.25rem',
            border: '1px solid rgba(255,255,255,0.72)',
            background: 'rgba(255,255,255,0.34)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            borderRadius: '30px',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.12)',
            overflow: 'visible',
          }}
        >
          <MyTrends key={trendsKey} standalonePreview />
        </div>
      </div>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PreviewShell />
  </React.StrictMode>
);
