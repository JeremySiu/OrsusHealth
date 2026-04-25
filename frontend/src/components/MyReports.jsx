import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { FileText, Download, Eye, Calendar, Heart, Activity, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchAssessmentRecords, normalizeAssessmentHistory } from '../lib/assessmentHistory';
import { createReportSignedUrl } from '../lib/reportStorage';
import PdfViewer from './PdfViewer';

export default function MyReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  // Modal viewer state
  const [viewerUrl, setViewerUrl] = useState(null);
  const [viewerReport, setViewerReport] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    async function fetchReports() {
      try {
        const records = await fetchAssessmentRecords(user.id, { ascending: false });
        setReports(normalizeAssessmentHistory(records));
      } catch (err) {
        console.error('Error fetching reports:', err);
        setReports([]);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, [user]);

  const handleDownload = async (report) => {
    const reportPath = report.reportPath;
    if (!reportPath) return;

    setDownloadingId(report.id);
    try {
      const dateStr = new Date(report.recordedAt).toLocaleDateString('en-CA');
      const filename = `Cardio_Assessment_${dateStr}.pdf`;
      const url = await createReportSignedUrl(reportPath, { download: filename });
      
      // Fetch the blob instead of relying on link click (fixes mobile Chrome popup blocker issues)
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch file');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up slightly later to ensure download starts
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleView = async (report) => {
    const reportPath = report.reportPath;
    if (!reportPath) return;

    setViewerLoading(true);
    setViewerReport(report);

    try {
      const url = await createReportSignedUrl(reportPath);
      setViewerUrl(url);
    } catch (err) {
      console.error('View failed:', err);
      setViewerReport(null);
    } finally {
      setViewerLoading(false);
    }
  };

  const handleCloseViewer = () => {
    setViewerUrl(null);
    setViewerReport(null);
  };

  const handleViewerDownload = async () => {
    if (!viewerReport?.reportPath) return;
    try {
      const dateStr = new Date(viewerReport.recordedAt).toLocaleDateString('en-CA');
      const filename = `Cardio_Assessment_${dateStr}.pdf`;
      const url = await createReportSignedUrl(viewerReport.reportPath, { download: filename });
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch file');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      console.error('Viewer download failed:', err);
    }
  };

  const getRiskLevel = (probability) => {
    if (probability == null) return { text: 'N/A', color: 'bg-zinc-100 text-zinc-600' };
    if (probability > 60) return { text: 'High Risk', color: 'bg-rose-100 text-rose-700' };
    if (probability > 30) return { text: 'Elevated', color: 'bg-amber-100 text-amber-700' };
    return { text: 'Normal', color: 'bg-teal-100 text-teal-700' };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 animate-in fade-in duration-500">
        <div className="w-12 h-12 border-4 border-zinc-200 border-t-teal-500 rounded-full animate-spin" />
        <p className="text-sm font-medium text-zinc-600 mt-4">Loading reports...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-y-auto p-6 md:p-8" style={{ scrollbarWidth: 'none' }}>
        {/* Header */}
        <div className="mb-8 shrink-0">
          <h2 className="text-3xl font-semibold text-zinc-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)', marginLeft: '1rem'}}>
            My Reports
          </h2>
          <p className="text-sm text-zinc-500 mt-2" style={{ marginLeft: '1rem', marginBottom: '1rem'}}>
            {reports.length > 0
              ? `${reports.length} assessment${reports.length !== 1 ? 's' : ''} on file`
              : 'No assessment reports yet'}
          </p>
        </div>

        {reports.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
            <div className="p-5 rounded-full bg-zinc-100/60 mb-6">
              <FileText className="w-12 h-12 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-700 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              No Reports Found
            </h3>
            <p className="text-sm text-zinc-500 max-w-sm">
              Complete a cardiovascular assessment to generate your first report. It will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700" style = {{marginLeft: "1rem", marginRight: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))"}}>
            {reports.map((report, idx) => {
              const form = report.formData || {};
              const probability = report.riskProbability;
              const risk = getRiskLevel(probability);
              const recordedDate = new Date(report.recordedAt);
              const formattedDate = recordedDate.toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
              });
              const formattedTime = recordedDate.toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit',
              });

              return (
                <Card
                  key={report.id}
                  className="bg-white/40 backdrop-blur-xl border-white/50 shadow-md hover:shadow-lg transition-shadow duration-300 animate-in fade-in slide-in-from-bottom-2" 
                  style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'backwards' , paddingLeft: "0.5rem", paddingRight: "0.5rem", paddingBottom: "0.5rem"}}
                >
                  <CardHeader className="pb-2" style={{ marginTop: "0.5rem"}}>
                    <div className="flex items-center justify-between w-full">
                      <CardTitle className="text-base font-semibold text-zinc-800 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                        <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                        Cardiovascular Assessment
                      </CardTitle>
                      <Badge className={`${risk.color} text-[11px] font-semibold px-2 py-0.5`} style={{paddingLeft: "0.5rem", paddingRight: "0.5rem"}}>
                        {risk.text}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Date */}
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formattedDate} at {formattedTime}</span>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/50 border border-white/60" style={{paddingTop: "0.25rem", paddingBottom: "0.25rem"}}>
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">Risk</p>
                          <p className="text-sm font-semibold text-zinc-800">
                            {probability != null ? `${probability.toFixed(1)}%` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/50 border border-white/60">
                        <Activity className="w-3.5 h-3.5 text-teal-500" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">BP</p>
                          <p className="text-sm font-semibold text-zinc-800">
                            {form.RestingBP || 'N/A'} <span className="text-xs font-normal text-zinc-500">mmHg</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Patient Info */}
                    <div className="flex items-center justify-between text-xs text-zinc-500 pt-1" style={{marginTop: "0.25rem"}}>
                      <span>{form.FullName || 'No name'} &bull; Age {form.Age || '?'} &bull; {form.Sex === 'M' ? 'Male' : form.Sex === 'F' ? 'Female' : '?'}</span>
                    </div>
                  </CardContent>

                  <CardFooter className="border-t border-black/5 bg-white/20 px-4 py-3 flex items-center gap-4" style={{paddingTop: "0.5rem"}}>
                    <button
                      onClick={() => handleView(report)}
                      disabled={!report.reportPath}
                      className="flex items-center gap-2 text-xs font-medium text-teal-700 hover:text-teal-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <div className="w-px h-4 bg-black/10" />
                    <button
                      onClick={() => handleDownload(report)}
                      disabled={downloadingId === report.id || !report.reportPath}
                      className="flex items-center gap-2 text-xs font-medium text-teal-700 hover:text-teal-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {downloadingId === report.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      {downloadingId === report.id ? 'Downloading...' : 'Download'}
                    </button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* PDF Viewer Modal */}
      {(viewerReport) && (
        <div
          className="pdf-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseViewer(); }}
        >
          <div className="pdf-modal-panel">
            <div className="pdf-modal-header">
              <h3>Assessment Report</h3>
              <div className="pdf-modal-actions">
                <button className="pdf-modal-btn" onClick={handleViewerDownload}>
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button className="pdf-modal-close" onClick={handleCloseViewer} aria-label="Close viewer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="pdf-modal-body">
              {viewerLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="w-10 h-10 border-4 border-zinc-200 border-t-teal-500 rounded-full animate-spin" />
                  <p className="text-sm font-medium text-zinc-500">Retrieving secure document…</p>
                </div>
              ) : viewerUrl ? (
                <PdfViewer file={viewerUrl} showLoadingSpinner={true} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-3">
                  <p className="text-sm">Failed to load report.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
