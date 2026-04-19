import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { User, Activity, AlertCircle, RefreshCcw } from 'lucide-react';
import { getClinicalFacts } from '../lib/clinical_facts';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function AssessmentReport({ result, formData, onRestart }) {
  const reportRef = useRef(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [generating, setGenerating] = useState(true);
  const { user } = useAuth();

  const probability = result.heart_disease_probability ?? 0;
  const features = result.top_influencing_features ?? [];
  const isError = result.error !== undefined;
  const maxAbsShap = Math.max(...features.map(f => Math.abs(f.shap_value)), 0.001);

  useEffect(() => {
    if (isError || !reportRef.current) {
      setGenerating(false);
      return;
    }

    const depsHash = JSON.stringify({ result, formData });
    if (window.__cachedPdfHash === depsHash && window.__cachedPdfUrl) {
      setPdfUrl(window.__cachedPdfUrl);
      setGenerating(false);
      return;
    }

    const generatePdf = async () => {
      try {
        await document.fonts.ready;
        await new Promise(r => setTimeout(r, 800)); // allow layout rendering
        
        const element = reportRef.current;
        const canvas = await html2canvas(element, {
          scale: 2, 
          useCORS: true,
          logging: false,
          windowWidth: 816,
          onclone: (clonedDoc) => {
            const wrapper = clonedDoc.getElementById('pdf-wrapper');
            if (wrapper) {
              wrapper.style.position = 'relative';
              wrapper.style.left = '0';
              wrapper.style.top = '0';
            }
          }
        });

        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'letter'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        
        window.__cachedPdfHash = depsHash;
        window.__cachedPdfUrl = url;

        setPdfUrl(url);

        // Save to Supabase (Storage + health_records)
        if (user) {
          try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filePath = `${user.id}/${timestamp}.pdf`;

            const { error: uploadError } = await supabase.storage
              .from('reports')
              .upload(filePath, blob, {
                contentType: 'application/pdf',
                upsert: false,
              });

            if (uploadError) {
              console.error('PDF upload failed:', uploadError);
            } else {
              const { error: insertError } = await supabase
                .from('health_records')
                .insert({
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
        console.error("PDF Generation failed", err);
      } finally {
        setGenerating(false);
      }
    };

    generatePdf();
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
            style={{ background: 'linear-gradient(to bottom right, #0F172A, #1e293b)', boxShadow: '0 4px 12px rgba(15,23,42,0.25)', padding: "0.5rem"}}
          >
          <RefreshCcw className="w-4 h-4"/> Start New Assessment
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col pt-6 pb-2 px-6">
      {/* NATIVE PDF VIEWER */}
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
                <a href={pdfUrl} download="Cardio_Assessment_Report.pdf" className="bg-white text-zinc-900 px-4 py-2 rounded-lg shadow font-medium">Download PDF</a>
             </div>
           </object>
        </div>
      ) : null}

      <div className="pb-4 pt-4 flex justify-center shrink-0">
         <button
            onClick={onRestart}
            className="h-10 min-w-[8rem] flex items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(to bottom right, #0F172A, #1e293b)', boxShadow: '0 4px 12px rgba(15,23,42,0.25)', padding: "0.5rem"}}
          >
            <RefreshCcw className="w-4 h-4" /> Start New Assessment
          </button>
      </div>

      {/* HIDDEN OFFFSCREEN HTML TEMPLATE FOR PDF RENDERER */}
      <div id="pdf-wrapper" className="absolute top-0 left-[-9999px]">
        <div 
          ref={reportRef} 
          className="bg-white text-zinc-900"
          style={{ width: '816px', minHeight: '1056px', padding: '48px', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif' }}
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b border-zinc-200 pb-6 mb-12">
            <div>
               <h1 className="text-3xl font-bold tracking-tight text-teal-700">Cardiovascular Health Assessment</h1>
               <p className="text-zinc-500 mt-1">Generated by OrsusHealth Machine Learning Analysis Engine</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-zinc-800">{new Date().toLocaleDateString()}</p>
              <p className="text-xs text-zinc-400">Confidential / Patient Copy</p>
            </div>
          </div>

           {/* Profile & Probability Top Section */}
          <div className="grid grid-cols-2 gap-8" style={{ marginBottom: '5px' }}>
            {/* Profile Segment */}
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm" style={{ padding: '16px' }}>
              <h2 className="text-lg font-bold border-b border-zinc-100 pb-2 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-teal-600" style={{ position: 'relative', top: '-1px' }} /> Patient Profile
              </h2>
              <ul className="text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingRight: '5px', paddingLeft: '5px', marginTop: '10px'}}>
                <li className="flex justify-between"><span className="text-zinc-500 font-medium">Full Name</span> <span className="font-semibold text-zinc-900 text-right">{formData.FullName || "Not Provided"}</span></li>
                <li className="flex justify-between"><span className="text-zinc-500 font-medium">Age</span> <span className="font-semibold text-zinc-900 text-right">{formData.Age} Years</span></li>
                <li className="flex justify-between"><span className="text-zinc-500 font-medium">Biological Sex</span> <span className="font-semibold text-zinc-900 text-right">{formData.Sex === 'M' ? 'Male' : 'Female'}</span></li>
                <li className="flex justify-between"><span className="text-zinc-500 font-medium">Resting Blood Pressure</span> <span className="font-semibold text-zinc-900 text-right">{formData.RestingBP || "N/A"} mmHg</span></li>
                <li className="flex justify-between"><span className="text-zinc-500 font-medium">Cholesterol</span> <span className="font-semibold text-zinc-900 text-right">{formData.Cholesterol || "N/A"} mg/dl</span></li>
              </ul>
            </div>

            {/* Probability Segment */}
            <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-100 flex flex-col items-center justify-center">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">Risk Probability Score</h2>
              <div className={`text-6xl font-bold ${probability > 50 ? 'text-rose-600' : 'text-teal-600'}`}>
                {probability.toFixed(1)}%
              </div>
              <p className="text-xs text-zinc-400 mt-3 text-center px-4">
                This indicates the estimated likelihood of cardiovascular complications based on your clinical profile.
              </p>
            </div>
          </div>

          {/* Waterfall Graph / Factors Chart */}
          <div>
            <h2 className="text-xl font-bold text-zinc-800 flex items-center gap-2 border-b border-zinc-200" style={{ marginBottom: '5px'}}>
              <Activity className="w-5 h-5 text-teal-600" /> Key Influencing Factors
            </h2>
            
            <div className="space-y-6">
              {features.map((item, idx) => {
                const isPositive = item.shap_value > 0;
                const barWidth = `${(Math.abs(item.shap_value) / maxAbsShap) * 100}%`;
                
                const featureLabelMap = {
                  'Age': 'Age', 'Sex': 'Biological Sex', 'RestingBP': 'Resting Blood Pressure',
                  'Cholesterol': 'Serum Cholesterol', 'FastingBS': 'Fasting Blood Sugar', 'MaxHR': 'Maximum Heart Rate',
                  'ExerciseAngina': 'Exercise-Induced Angina', 'Oldpeak': 'ST Depression (Oldpeak)',
                  'ChestPainType_ASY': 'Chest Pain (Asymptomatic)', 'ChestPainType_ATA': 'Chest Pain (Atypical Angina)',
                  'ChestPainType_NAP': 'Chest Pain (Non-Anginal)', 'ChestPainType_TA': 'Chest Pain (Typical Angina)',
                  'RestingECG_LVH': 'Resting ECG (Hypertrophy)', 'RestingECG_Normal': 'Resting ECG (Normal)',
                  'RestingECG_ST': 'Resting ECG (ST-T wave)', 'ST_Slope_Down': 'ST Slope (Downsloping)',
                  'ST_Slope_Flat': 'ST Slope (Flat)', 'ST_Slope_Up': 'ST Slope (Upsloping)'
                };
                const displayLabel = featureLabelMap[item.feature] || item.feature;

                return (
                  <div key={idx} className="flex flex-col gap-2 p-3 bg-zinc-50 rounded-lg border border-black/5">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-zinc-800 text-sm">{displayLabel}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isPositive ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700'}`}>
                        {isPositive ? 'Increases Risk' : 'Decreases Risk'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-zinc-200 rounded-full overflow-hidden flex shadow-inner">
                        {isPositive ? <div className="w-1/2" /> : null}
                        {!isPositive ? (
                          <div className="w-1/2 flex justify-end">
                            <div className="h-full bg-teal-500 rounded-l-full" style={{ width: barWidth }} />
                          </div>
                        ) : (
                          <div className="w-1/2 flex justify-start">
                            <div className="h-full bg-rose-500 rounded-r-full" style={{ width: barWidth }} />
                          </div>
                        )}
                        {!isPositive ? <div className="w-1/2" /> : null}
                      </div>
                      <span className="text-xs text-zinc-500 font-bold tabular-nums w-12 text-right">
                        {isPositive ? '+' : ''}{item.shap_value.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Analysis with Facts & Citations */}
          <div style={{ marginTop: '10px' }}>
            <h2 className="text-xl font-bold text-zinc-800 flex items-center gap-2 border-b border-zinc-200" style={{ marginBottom: '5px' }}>
              <AlertCircle className="w-5 h-5 text-teal-600" /> Clinical Recommendations
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {features.map((item, idx) => {
                 const isPositive = item.shap_value > 0;
                 const clinicalData = getClinicalFacts(item.feature, isPositive);
                 
                 const featureLabelMap = {
                  'Age': 'Age', 'Sex': 'Biological Sex', 'RestingBP': 'Resting Blood Pressure',
                  'Cholesterol': 'Serum Cholesterol', 'FastingBS': 'Fasting Blood Sugar', 'MaxHR': 'Maximum Heart Rate',
                  'ExerciseAngina': 'Exercise-Induced Angina', 'Oldpeak': 'ST Depression (Oldpeak)',
                  'ChestPainType_ASY': 'Chest Pain (Asymptomatic)', 'ChestPainType_ATA': 'Chest Pain (Atypical Angina)',
                  'ChestPainType_NAP': 'Chest Pain (Non-Anginal)', 'ChestPainType_TA': 'Chest Pain (Typical Angina)',
                  'RestingECG_LVH': 'Resting ECG (Hypertrophy)', 'RestingECG_Normal': 'Resting ECG (Normal)',
                  'RestingECG_ST': 'Resting ECG (ST-T wave)', 'ST_Slope_Down': 'ST Slope (Downsloping)',
                  'ST_Slope_Flat': 'ST Slope (Flat)', 'ST_Slope_Up': 'ST Slope (Upsloping)'
                };
                const displayLabel = featureLabelMap[item.feature] || item.feature;

                 return (
                   <div key={idx} className="break-inside-avoid bg-white rounded-xl border border-zinc-200" style={{ padding: '5px' }}>
                     <h3 className="font-bold text-lg text-zinc-900 mb-3 flex items-center gap-2">
                       {idx + 1}. {displayLabel} Analysis
                     </h3>
                     <p className="text-sm text-zinc-700 leading-relaxed mb-4">
                       {clinicalData.fact}
                     </p>
                     <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4 rounded-r-md" style={{ marginBottom: '8px', marginTop: '8px', paddingLeft: '5px'}}>
                       <p className="text-sm text-teal-900 flex gap-2">
                         <strong className="whitespace-nowrap">Recommendation:</strong> <span>{clinicalData.suggestion}</span>
                       </p>
                     </div>
                     <p className="text-xs text-zinc-400 italic">
                       Source: {clinicalData.citation}
                     </p>
                   </div>
                 )
              })}
            </div>
          </div>

          {/* Citations Section */}
          <div className="mb-8 break-inside-avoid">
            <h2 className="text-lg font-bold text-zinc-800 mb-6 border-b border-zinc-200 pb-2">
              References
            </h2>
            <div className="space-y-4">
              {(() => {
                const urlCounts = features.reduce((acc, item) => {
                  const citationText = getClinicalFacts(item.feature, item.shap_value > 0).citation;
                  
                  let org = 'American Heart Association';
                  let url = `https://www.heart.org/`;
                  
                  if (citationText.includes('ACC') || citationText.includes('College of Cardiology')) {
                    org = 'American College of Cardiology';
                    url = `https://www.acc.org/`;
                  } else if (citationText.includes('ADA')) {
                    org = 'American Diabetes Association';
                    url = `https://diabetes.org/`;
                  } else if (citationText.includes('CCS') || citationText.includes('Canadian Cardiovascular')) {
                    org = 'Canadian Cardiovascular Society';
                    url = `https://ccs.ca/`;
                  } else if (citationText.includes('Diabetes Canada')) {
                    org = 'Diabetes Canada';
                    url = `https://www.diabetes.ca/`;
                  }

                  if (!acc[url]) {
                    acc[url] = { count: 0, org, url, primaryCitation: citationText };
                  }
                  acc[url].count += 1;
                  return acc;
                }, {});

                const topSources = Object.values(urlCounts)
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 2);

                return topSources.map((source, idx) => {
                  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                  
                  return (
                    <p key={idx} className="text-xs text-zinc-600 break-words mb-4">
                      {source.org}. (n.d.). <em>{source.primaryCitation}</em>. Retrieved {date}, from <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">{source.url}</a>
                    </p>
                  )
                });
              })()}
            </div>
          </div>
          
          <div className="mt-12 text-left text-[11px] tracking-tight whitespace-nowrap text-zinc-400 pt-6 border-t border-zinc-200">
            This report was computationally generated by OrsusHealth AI and is for informational purposes only. It is not a substitute for professional medical advice.
          </div>

        </div>
      </div>
    </div>
  );
}
