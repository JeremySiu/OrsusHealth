import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { FileText, Download, Eye, Calendar, Heart, Activity, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function MyReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  useEffect(() => {
    if (!user?.id) return;

    async function fetchReports() {
      try {
        const { data: records, error } = await supabase
          .from('health_records')
          .select('id, value, recorded_at, created_at')
          .eq('user_id', user.id)
          .eq('record_type', 'cardiovascular_assessment')
          .order('recorded_at', { ascending: false });

        if (error) throw error;
        setReports(records || []);
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
    const reportPath = report.value?.report_path;
    if (!reportPath) return;

    setDownloadingId(report.id);
    try {
      const { data, error } = await supabase.storage
        .from('reports')
        .download(reportPath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date(report.recorded_at).toLocaleDateString('en-CA');
      a.download = `Cardio_Assessment_${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleView = async (report) => {
    const reportPath = report.value?.report_path;
    if (!reportPath) return;

    setViewingId(report.id);
    try {
      const { data, error } = await supabase.storage
        .from('reports')
        .download(reportPath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      window.open(url, '_blank');
    } catch (err) {
      console.error('View failed:', err);
    } finally {
      setViewingId(null);
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
            const form = report.value?.form_data || {};
            const prediction = report.value?.prediction || {};
            const probability = prediction.heart_disease_probability;
            const risk = getRiskLevel(probability);
            const recordedDate = new Date(report.recorded_at);
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
                    disabled={viewingId === report.id || !report.value?.report_path}
                    className="flex items-center gap-2 text-xs font-medium text-teal-700 hover:text-teal-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {viewingId === report.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    {viewingId === report.id ? 'Opening...' : 'View'}
                  </button>
                  <div className="w-px h-4 bg-black/10" />
                  <button
                    onClick={() => handleDownload(report)}
                    disabled={downloadingId === report.id || !report.value?.report_path}
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
  );
}
