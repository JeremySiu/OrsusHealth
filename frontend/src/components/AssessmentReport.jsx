import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { buildAssessmentReportHtml } from '../lib/buildAssessmentReportHtml';

export default function AssessmentReport({ result, formData, onRestart }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [generating, setGenerating] = useState(true);
  const { user } = useAuth();

  const isError = result.error !== undefined;

  useEffect(() => {
    let revokedUrl = null;

    if (isError) {
      setGenerating(false);
      return undefined;
    }

    const depsHash = JSON.stringify({ result, formData });
    if (window.__cachedPdfHash === depsHash && window.__cachedPdfUrl) {
      setPdfUrl(window.__cachedPdfUrl);
      setGenerating(false);
      return undefined;
    }

    const generatePdf = async () => {
      try {
        const generatePdfUrl = (import.meta.env.VITE_GENERATE_PDF_URL || '').trim();
        if (!generatePdfUrl) {
          throw new Error('Missing VITE_GENERATE_PDF_URL');
        }

        const htmlString = buildAssessmentReportHtml({ result, formData });
        const response = await fetch(generatePdfUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        revokedUrl = url;

        window.__cachedPdfHash = depsHash;
        window.__cachedPdfUrl = url;

        setPdfUrl(url);

        if (user) {
          try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filePath = `${user.id}/${timestamp}.pdf`;

            const { error: uploadError } = await supabase.storage.from('reports').upload(filePath, blob, {
              contentType: 'application/pdf',
              upsert: false,
            });

            if (uploadError) {
              console.error('PDF upload failed:', uploadError);
            } else {
              const { error: insertError } = await supabase.from('health_records').insert({
                user_id: user.id,
                record_type: 'cardiovascular_assessment',
                value: {
                  form_data: formData,
                  prediction: {
                    heart_disease_probability: result.heart_disease_probability,
                    top_influencing_features: result.top_influencing_features,
                  },
                  report_path: filePath,
                },
              });

              if (insertError) {
                console.error('Health record insert failed:', insertError);
              }
            }
          } catch (saveErr) {
            console.error('Supabase save error:', saveErr);
          }
        }
      } catch (err) {
        console.error('PDF download error:', err);
      } finally {
        setGenerating(false);
      }
    };

    generatePdf();

    return () => {
      if (revokedUrl && revokedUrl !== window.__cachedPdfUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
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
      ) : pdfUrl ? (
        <div className="flex-1 w-full h-full animate-in fade-in duration-700 flex flex-col bg-zinc-200 rounded-xl overflow-hidden shadow-inner border border-black/5">
          <object data={pdfUrl} type="application/pdf" className="w-full h-full">
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
              <AlertCircle className="w-8 h-8" />
              <p>Your browser does not support inline PDFs.</p>
              <a
                href={pdfUrl}
                download="Cardio_Assessment_Report.pdf"
                className="bg-white text-zinc-900 px-4 py-2 rounded-lg shadow font-medium"
                style={{ padding: '0.5rem' }}
              >
                Download PDF
              </a>
            </div>
          </object>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-zinc-500">
          <AlertCircle className="w-8 h-8" />
          <p>We couldn&apos;t generate the PDF report.</p>
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
