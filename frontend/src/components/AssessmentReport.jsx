import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { buildAssessmentReportHtml } from '../lib/buildAssessmentReportHtml';
import { uploadReportPdf } from '../lib/reportStorage';
import PdfViewer from './PdfViewer';

export default function AssessmentReport({ result, formData, onRestart }) {
  const [pdfData, setPdfData] = useState(null);
  const [generating, setGenerating] = useState(true);
  const [pdfError, setPdfError] = useState(null);
  const { user } = useAuth();

  const isError = result.error !== undefined;

  useEffect(() => {
    if (isError) {
      setGenerating(false);
      return undefined;
    }

    const depsHash = JSON.stringify({ result, formData });

    // Session cache: reuse PDF data if same assessment
    if (window.__cachedPdfHash === depsHash && window.__cachedPdfData) {
      setPdfData(window.__cachedPdfData);
      setGenerating(false);
      return undefined;
    }

    const generatePdf = async () => {
      try {
        const generatePdfUrl = (import.meta.env.VITE_GENERATE_PDF_URL || '').trim();
        if (!generatePdfUrl) {
          throw new Error('Missing VITE_GENERATE_PDF_URL');
        }

        // 1. Build HTML and send to Lambda for PDF generation
        const htmlString = buildAssessmentReportHtml({ result, formData });
        const response = await fetch(generatePdfUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': import.meta.env.VITE_BACKEND_API_KEY,
          },
          body: JSON.stringify({ html: htmlString }),
        });

        if (!response.ok) {
          let detail = 'PDF generation failed';
          try {
            const error = await response.json();
            detail = error.detail || error.error || detail;
          } catch {
            const errorText = await response.text();
            detail = errorText || detail;
          }
          throw new Error(detail);
        }

        // 2. Get the PDF blob and convert to Uint8Array for react-pdf
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const pdfBytes = { data: new Uint8Array(arrayBuffer) };

        // 3. Cache and display immediately
        window.__cachedPdfHash = depsHash;
        window.__cachedPdfData = pdfBytes;
        setPdfData(pdfBytes);

        // 4. Upload to Supabase in background (for persistence)
        try {
          await uploadReportPdf({
            userId: user.id,
            blob,
            formData,
            result,
          });
        } catch (saveErr) {
          console.error('Supabase save error:', saveErr);
        }
      } catch (err) {
        console.error('PDF generation error:', err);
        setPdfError(err.message || String(err));
      } finally {
        setGenerating(false);
      }
    };

    generatePdf();

    return undefined;
  }, [isError, result, formData, user]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-8" style={{ fontFamily: 'var(--font-heading)' }}>
          Assessment Failed
        </h2>
        <div className="text-red-500 mb-6 bg-red-50 px-6 py-4 rounded-xl border border-red-100">{result.error}</div>
        <button
          onClick={onRestart}
          className="h-10 min-w-[8rem] flex items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(to bottom right, #0F172A, #1e293b)', boxShadow: '0 4px 12px rgba(15,23,42,0.25)', padding: '0.5rem' }}
        >
          <RefreshCcw className="w-4 h-4" /> Start New Assessment
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col pt-6 pb-2 px-6">
      {generating ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
          <div className="w-12 h-12 border-4 border-zinc-200 border-t-teal-500 rounded-full animate-spin" />
          <p className="text-sm font-medium text-zinc-600">Generating Secure Clinical Report...</p>
        </div>
      ) : pdfData ? (
        <div className="flex-1 w-full h-full animate-in fade-in duration-700 flex flex-col bg-zinc-200 rounded-xl overflow-hidden shadow-inner border border-black/5">
          <PdfViewer file={pdfData} showLoadingSpinner={false} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-zinc-500 overflow-y-auto px-4 text-center">
          <AlertCircle className="w-8 h-8 text-rose-500" />
          <p className="font-semibold text-zinc-700">We couldn&apos;t generate the PDF report.</p>
          {pdfError && (
            <p className="text-xs text-rose-600/80 bg-rose-50 px-3 py-2 rounded-md font-mono break-words max-w-full">
              {pdfError}
            </p>
          )}
        </div>
      )}

      <div className="pb-4 pt-4 flex justify-center shrink-0">
        <button
          onClick={onRestart}
          className="h-10 min-w-[8rem] flex items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(to bottom right, #0F172A, #1e293b)', boxShadow: '0 4px 12px rgba(15,23,42,0.25)', padding: '0.5rem' }}
        >
          <RefreshCcw className="w-4 h-4" /> Start New Assessment
        </button>
      </div>
    </div>
  );
}
