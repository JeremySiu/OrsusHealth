import { useMemo, useState } from 'react';
import { AlertCircle, FileText, FlaskConical, Play, RefreshCcw, Stethoscope } from 'lucide-react';
import { buildAssessmentReportHtml } from '../../../frontend/src/lib/buildAssessmentReportHtml.jsx';
import { defaultFormData, defaultResult } from './fixtures/defaultAssessment.js';

const DEFAULT_MODE = (import.meta.env.VITE_DEFAULT_MODE || 'fixture').trim().toLowerCase() === 'live' ? 'live' : 'fixture';

const INITIAL_CONFIG = {
  pdfGeneratorUrl: (import.meta.env.VITE_PDF_GENERATOR_URL || '').trim(),
  pdfGeneratorApiKey: (import.meta.env.VITE_PDF_GENERATOR_API_KEY || '').trim(),
  predictApiBaseUrl: (import.meta.env.VITE_PREDICT_API_BASE_URL || '').trim(),
  predictApiKey: (import.meta.env.VITE_PREDICT_API_KEY || import.meta.env.VITE_PDF_GENERATOR_API_KEY || '').trim(),
};

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function parseJson(label, value) {
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch (error) {
    return { ok: false, error: `${label} JSON is invalid: ${error.message}` };
  }
}

function normalizeApiBaseUrl(value) {
  return value.trim().replace(/\/+$/, '');
}

function PdfViewer({ pdfUrl }) {
  if (!pdfUrl) {
    return (
      <div className="viewer-empty">
        <FileText size={32} />
        <p>No PDF loaded yet.</p>
      </div>
    );
  }

  return (
    <div className="viewer-frame">
      <object data={pdfUrl} type="application/pdf" className="viewer-object">
        <div className="viewer-empty">
          <AlertCircle size={32} />
          <p>Your browser does not support inline PDFs.</p>
          <a href={pdfUrl} download="Cardio_Assessment_Report.pdf" className="download-link">
            Download PDF
          </a>
        </div>
      </object>
    </div>
  );
}

function ModeButton({ active, icon: Icon, label, onClick }) {
  return (
    <button type="button" className={active ? 'mode-button active' : 'mode-button'} onClick={onClick}>
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}

export default function App() {
  const [mode, setMode] = useState(DEFAULT_MODE);
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [formJson, setFormJson] = useState(prettyJson(defaultFormData));
  const [resultJson, setResultJson] = useState(prettyJson(defaultResult));
  const [lastPredictionJson, setLastPredictionJson] = useState(prettyJson(defaultResult));
  const [status, setStatus] = useState('Idle');
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const hasPredictConfig = useMemo(() => Boolean(normalizeApiBaseUrl(config.predictApiBaseUrl)), [config.predictApiBaseUrl]);

  const setConfigField = (field, value) => {
    setConfig((current) => ({ ...current, [field]: value }));
  };

  const replacePdf = (blob) => {
    setPdfUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(blob);
    });
  };

  const requestPdf = async (html) => {
    const endpoint = config.pdfGeneratorUrl.trim();
    if (!endpoint) {
      throw new Error('Missing PDF generator URL.');
    }
    if (!config.pdfGeneratorApiKey.trim()) {
      throw new Error('Missing PDF generator API key.');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.pdfGeneratorApiKey.trim(),
      },
      body: JSON.stringify({ html }),
    });

    if (!response.ok) {
      let detail = 'PDF generation failed';
      try {
        const payload = await response.json();
        detail = payload.detail || payload.error || detail;
      } catch {
        const text = await response.text();
        detail = text || detail;
      }
      throw new Error(detail);
    }

    return response.blob();
  };

  const fetchPrediction = async (formData) => {
    const apiBase = normalizeApiBaseUrl(config.predictApiBaseUrl);
    if (!apiBase) {
      throw new Error('Missing prediction API base URL.');
    }

    const response = await fetch(`${apiBase}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.predictApiKey.trim(),
      },
      body: JSON.stringify({
        Age: Number(formData.Age),
        Sex: formData.Sex,
        RestingBP: Number(formData.RestingBP),
        Cholesterol: Number(formData.Cholesterol),
        FastingBS: formData.FastingBS ? 1 : 0,
        MaxHR: Number(formData.MaxHR),
        ChestPainType: formData.ChestPainType,
        RestingECG: formData.RestingECG,
        ExerciseAngina: formData.ExerciseAngina,
        Oldpeak: Number(formData.Oldpeak),
        ST_Slope: formData.ST_Slope,
      }),
    });

    if (!response.ok) {
      let detail = 'Prediction request failed';
      try {
        const payload = await response.json();
        detail = payload.detail || payload.error || detail;
      } catch {
        const text = await response.text();
        detail = text || detail;
      }
      throw new Error(detail);
    }

    return response.json();
  };

  const handleFixtureGenerate = async () => {
    setIsGenerating(true);
    setError('');
    setStatus('Validating fixture JSON...');

    const parsedForm = parseJson('Fixture formData', formJson);
    if (!parsedForm.ok) {
      setError(parsedForm.error);
      setStatus('Validation failed');
      setIsGenerating(false);
      return;
    }

    const parsedResult = parseJson('Fixture result', resultJson);
    if (!parsedResult.ok) {
      setError(parsedResult.error);
      setStatus('Validation failed');
      setIsGenerating(false);
      return;
    }

    try {
      setStatus('Rendering assessment HTML...');
      const html = buildAssessmentReportHtml({
        formData: parsedForm.value,
        result: parsedResult.value,
      });

      setStatus('Requesting PDF from generator...');
      const pdfBlob = await requestPdf(html);
      replacePdf(pdfBlob);
      setStatus('Fixture PDF ready');
    } catch (requestError) {
      setError(requestError.message);
      setStatus('Fixture generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLiveGenerate = async () => {
    setIsGenerating(true);
    setError('');
    setStatus('Validating live form JSON...');

    const parsedForm = parseJson('Live formData', formJson);
    if (!parsedForm.ok) {
      setError(parsedForm.error);
      setStatus('Validation failed');
      setIsGenerating(false);
      return;
    }

    try {
      setStatus('Calling prediction API...');
      const prediction = await fetchPrediction(parsedForm.value);
      setLastPredictionJson(prettyJson(prediction));

      setStatus('Rendering assessment HTML...');
      const html = buildAssessmentReportHtml({
        formData: parsedForm.value,
        result: prediction,
      });

      setStatus('Requesting PDF from generator...');
      const pdfBlob = await requestPdf(html);
      replacePdf(pdfBlob);
      setStatus('Live PDF ready');
    } catch (requestError) {
      setError(requestError.message);
      setStatus('Live generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetFixtures = () => {
    setFormJson(prettyJson(defaultFormData));
    setResultJson(prettyJson(defaultResult));
    setLastPredictionJson(prettyJson(defaultResult));
    setError('');
    setStatus('Fixture payloads reset');
  };

  return (
    <div className="page-shell">
      <aside className="control-panel">
        <div className="panel-section">
          <p className="eyebrow">Standalone Dev Tool</p>
          <h1>PDF Preview</h1>
          <p className="subtle">
            Separate localhost app for testing the PDF generator with either editable fixtures or a live prediction request.
          </p>
        </div>

        <div className="panel-section">
          <div className="mode-toggle">
            <ModeButton active={mode === 'fixture'} icon={FlaskConical} label="Fixture Mode" onClick={() => setMode('fixture')} />
            <ModeButton active={mode === 'live'} icon={Stethoscope} label="Live Mode" onClick={() => setMode('live')} />
          </div>
        </div>

        <div className="panel-section">
          <h2>Connection Settings</h2>
          <label className="field">
            <span>PDF generator URL</span>
            <input value={config.pdfGeneratorUrl} onChange={(event) => setConfigField('pdfGeneratorUrl', event.target.value)} />
          </label>
          <label className="field">
            <span>PDF generator API key</span>
            <input value={config.pdfGeneratorApiKey} onChange={(event) => setConfigField('pdfGeneratorApiKey', event.target.value)} />
          </label>
          <label className="field">
            <span>Prediction API base URL</span>
            <input value={config.predictApiBaseUrl} onChange={(event) => setConfigField('predictApiBaseUrl', event.target.value)} />
          </label>
          <label className="field">
            <span>Prediction API key</span>
            <input value={config.predictApiKey} onChange={(event) => setConfigField('predictApiKey', event.target.value)} />
          </label>
        </div>

        <div className="panel-section">
          <div className="section-header">
            <h2>Form Data JSON</h2>
            <button type="button" className="ghost-button" onClick={resetFixtures}>
              <RefreshCcw size={14} />
              <span>Reset</span>
            </button>
          </div>
          <textarea className="json-area" value={formJson} onChange={(event) => setFormJson(event.target.value)} spellCheck="false" />
        </div>

        {mode === 'fixture' ? (
          <div className="panel-section">
            <h2>Fixture Result JSON</h2>
            <textarea className="json-area" value={resultJson} onChange={(event) => setResultJson(event.target.value)} spellCheck="false" />
          </div>
        ) : (
          <div className="panel-section">
            <h2>Last Live Prediction</h2>
            <textarea className="json-area readonly" value={lastPredictionJson} readOnly spellCheck="false" />
            <p className="subtle small">
              {hasPredictConfig ? 'This updates after each live prediction request.' : 'Set a prediction API base URL to enable live mode.'}
            </p>
          </div>
        )}

        <div className="panel-section">
          <button
            type="button"
            className="primary-button"
            onClick={mode === 'fixture' ? handleFixtureGenerate : handleLiveGenerate}
            disabled={isGenerating || (mode === 'live' && !hasPredictConfig)}
          >
            <Play size={15} />
            <span>{isGenerating ? 'Working...' : mode === 'fixture' ? 'Generate Fixture PDF' : 'Run Live Prediction + Generate PDF'}</span>
          </button>
          <p className="status-line">{status}</p>
          {error ? <p className="error-line">{error}</p> : null}
        </div>
      </aside>

      <main className="viewer-panel">
        <div className="viewer-header">
          <div>
            <p className="eyebrow">Inline Preview</p>
            <h2>Returned PDF</h2>
          </div>
          {pdfUrl ? (
            <a href={pdfUrl} download="Cardio_Assessment_Report.pdf" className="download-link">
              Download PDF
            </a>
          ) : null}
        </div>
        <PdfViewer pdfUrl={pdfUrl} />
      </main>
    </div>
  );
}
