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
          backgroundColor: '#ffffff',
          windowWidth: 816,
          onclone: (clonedDoc) => {
            const wrapper = clonedDoc.getElementById('pdf-wrapper');
            if (wrapper) {
              wrapper.style.position = 'relative';
              wrapper.style.left = '0';
              wrapper.style.top = '0';
            }
            // Force body width so layout computes at desktop size
            clonedDoc.body.style.width = '816px';
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
                  <a href={pdfUrl} download="Cardio_Assessment_Report.pdf" className="bg-white text-zinc-900 px-4 py-2 rounded-lg shadow font-medium" style={{ padding: "0.5rem" }}>Download PDF</a>
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
      <div id="pdf-wrapper" style={{ position: 'absolute', top: 0, left: '-9999px' }}>
        <div 
          ref={reportRef} 
          style={{ width: '816px', minHeight: '1056px', padding: '48px', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif', backgroundColor: '#ffffff', color: '#18181b' }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e4e4e7', paddingBottom: "0px"}}>
            <div>
               <h1 style={{ fontSize: '1.875rem', lineHeight: '2.25rem', fontWeight: 700, letterSpacing: '-0.025em', color: '#0f766e', margin: 0 }}>Cardiovascular Health Assessment</h1>
               <p style={{ color: '#71717a', marginTop: '4px' }}>Generated by OrsusHealth Machine Learning Analysis Engine</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 600, color: '#27272a' }}>{new Date().toLocaleDateString()}</p>
              <p style={{ fontSize: '0.75rem', lineHeight: '1rem', color: '#a1a1aa' }}>Confidential / Patient Copy</p>
            </div>
          </div>

           {/* Profile & Probability Top Section */}
          <div style={{ display: 'flex', gap: '32px', marginBottom: '5px' }}>
            {/* Profile Segment */}
            <div style={{ flex: 1, backgroundColor: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '12px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', padding: '16px' }}>
              <h2 style={{ fontSize: '1.125rem', lineHeight: '1.75rem', fontWeight: 700, borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User style={{ width: '20px', height: '20px', color: '#0d9488', position: 'relative', top: '-1px' }} /> Patient Profile
              </h2>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingRight: '5px', paddingLeft: '5px', marginTop: '10px', fontSize: '0.875rem', lineHeight: '1.25rem', listStyle: 'none', margin: '10px 0 0 0' }}>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a', fontWeight: 500 }}>Full Name</span> <span style={{ fontWeight: 600, color: '#18181b', textAlign: 'right' }}>{formData.FullName || "Not Provided"}</span></li>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a', fontWeight: 500 }}>Age</span> <span style={{ fontWeight: 600, color: '#18181b', textAlign: 'right' }}>{formData.Age} Years</span></li>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a', fontWeight: 500 }}>Biological Sex</span> <span style={{ fontWeight: 600, color: '#18181b', textAlign: 'right' }}>{formData.Sex === 'M' ? 'Male' : 'Female'}</span></li>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717a', fontWeight: 500 }}>Resting Blood Pressure</span> <span style={{ fontWeight: 600, color: '#18181b', textAlign: 'right' }}>{formData.RestingBP || "N/A"} mmHg</span></li>
                <li style={{ display: 'flex', justifyContent: 'space-between'}}><span style={{ color: '#71717a', fontWeight: 500 }}>Cholesterol</span> <span style={{ fontWeight: 600, color: '#18181b', textAlign: 'right' }}>{formData.Cholesterol || "N/A"} mg/dl</span></li>
              </ul>
            </div>

            {/* Probability Segment */}
            <div style={{ flex: 1, backgroundColor: '#fafafa', borderRadius: '12px', padding: '24px', border: '1px solid #f4f4f5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h2 style={{ fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Risk Probability Score</h2>
              <div style={{ fontSize: '3.75rem', lineHeight: 1, fontWeight: 700, color: probability > 50 ? '#e11d48' : '#0d9488' }}>
                {probability.toFixed(1)}%
              </div>
              <p style={{ fontSize: '0.75rem', lineHeight: '1rem', color: '#a1a1aa', marginTop: '12px', textAlign: 'center'}}>
                This indicates the estimated likelihood of cardiovascular complications based on your clinical profile.
              </p>
            </div>
          </div>

          {/* Waterfall Graph / Factors Chart */}
          <div>
            <h2 style={{ fontSize: '1.25rem', lineHeight: '1.75rem', fontWeight: 700, color: '#27272a', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e4e4e7', marginBottom: '5px' }}>
              <Activity style={{ width: '20px', height: '20px', color: '#0d9488' }} /> Key Influencing Factors
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '5px', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#27272a', fontSize: '0.875rem', lineHeight: '1.25rem' }}>{displayLabel}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: isPositive ? '#ffe4e6' : '#ccfbf1', color: isPositive ? '#be123c' : '#0f766e' }}>
                        {isPositive ? 'Increases Risk' : 'Decreases Risk'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, height: '12px', backgroundColor: '#e4e4e7', borderRadius: '9999px', overflow: 'hidden', display: 'flex', boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.05)' }}>
                        {isPositive ? <div style={{ width: '50%' }} /> : null}
                        {!isPositive ? (
                          <div style={{ width: '50%', display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ height: '100%', backgroundColor: '#14b8a6', borderRadius: '9999px 0 0 9999px', width: barWidth }} />
                          </div>
                        ) : (
                          <div style={{ width: '50%', display: 'flex', justifyContent: 'flex-start' }}>
                            <div style={{ height: '100%', backgroundColor: '#f43f5e', borderRadius: '0 9999px 9999px 0', width: barWidth }} />
                          </div>
                        )}
                        {!isPositive ? <div style={{ width: '50%' }} /> : null}
                      </div>
                      <span style={{ fontSize: '0.75rem', lineHeight: '1rem', color: '#71717a', fontWeight: 700, fontVariantNumeric: 'tabular-nums', width: '48px', textAlign: 'right' }}>
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
            <h2 style={{ fontSize: '1.25rem', lineHeight: '1.75rem', fontWeight: 700, color: '#27272a', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e4e4e7', marginBottom: '5px' }}>
              <AlertCircle style={{ width: '20px', height: '20px', color: '#0d9488' }} /> Clinical Recommendations
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
                   <div key={idx} style={{ breakInside: 'avoid', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e4e4e7', padding: '5px' }}>
                     <h3 style={{ fontWeight: 700, fontSize: '1.125rem', lineHeight: '1.75rem', color: '#18181b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                       {idx + 1}. {displayLabel} Analysis
                     </h3>
                     <p style={{ fontSize: '0.875rem', lineHeight: '1.25rem', color: '#3f3f46', lineHeight: '1.625' }}>
                       {clinicalData.fact}
                     </p>
                     <div style={{ backgroundColor: '#f0fdfa', borderLeft: '4px solid #14b8a6', padding: '5px', borderRadius: '0 6px 6px 0', marginBottom: '5px', marginTop: '5px', paddingLeft: '5px' }}>
                       <p style={{ fontSize: '0.875rem', lineHeight: '1.25rem', color: '#134e4a', display: 'flex', gap: '8px' }}>
                         <strong style={{ whiteSpace: 'nowrap' }}>Recommendation:</strong> <span>{clinicalData.suggestion}</span>
                       </p>
                     </div>
                     <p style={{ fontSize: '0.75rem', lineHeight: '1rem', color: '#a1a1aa', fontStyle: 'italic' }}>
                       Source: {clinicalData.citation}
                     </p>
                   </div>
                 )
              })}
            </div>
          </div>

          {/* Citations Section */}
          <div style={{ marginBottom: '5px', breakInside: 'avoid' }}>
            <h2 style={{ fontSize: '1.125rem', lineHeight: '1.75rem', fontWeight: 700, color: '#27272a', marginBottom: '3px', borderBottom: '1px solid #e4e4e7' }}>
              References
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                    <p key={idx} style={{ fontSize: '0.75rem', lineHeight: '1rem', color: '#52525b', overflowWrap: 'break-word' }}>
                      {source.org}. (n.d.). <em>{source.primaryCitation}</em>. Retrieved {date}, from <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0d9488', textDecoration: 'none' }}>{source.url}</a>
                    </p>
                  )
                });
              })()}
            </div>
          </div>
          
          <div style={{ textAlign: 'left', fontSize: '11px', letterSpacing: '-0.025em', whiteSpace: 'nowrap', color: '#a1a1aa', paddingTop: '1px', borderTop: '1px solid #e4e4e7' }}>
            This report was computationally generated by OrsusHealth AI and is for informational purposes only. It is not a substitute for professional medical advice.
          </div>

        </div>
      </div>
    </div>
  );
}
