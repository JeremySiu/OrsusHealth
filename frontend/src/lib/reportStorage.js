import { supabase } from './supabaseClient';

export async function uploadReportPdf({ userId, blob, formData, result }) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = `${userId}/${timestamp}.pdf`;

  const { error: uploadError } = await supabase.storage.from('reports').upload(filePath, blob, {
    contentType: 'application/pdf',
    upsert: false,
  });

  if (uploadError) throw uploadError;

  const { data: recordData, error: insertError } = await supabase.from('health_records').insert({
    user_id: userId,
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

  if (insertError) throw insertError;

  return { filePath, recordData };
}

export async function createReportSignedUrl(reportPath, options = {}) {
  const { expiresIn = 300, download } = options;
  const signedUrlOptions = download ? { download } : undefined;

  const { data, error } = await supabase.storage
    .from('reports')
    .createSignedUrl(reportPath, expiresIn, signedUrlOptions);

  if (error) throw error;

  return data.signedUrl;
}
