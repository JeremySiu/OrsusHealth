import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { mapFhirToFeatures } from './mapper.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow large FHIR files

app.post('/api/extract', async (req, res) => {
  try {
    const { fhir_payload } = req.body;
    
    if (!fhir_payload) {
      return res.status(400).json({ error: "Missing fhir_payload" });
    }

    // Process the FHIR payload via Gemini Embeddings
    const mapped = await mapFhirToFeatures(fhir_payload);
    
    return res.status(200).json({
      success: true,
      features: mapped.features,
      feature_provenance: mapped.featureProvenance,
    });
  } catch (error) {
    console.error("Mapping error:", error);
    return res.status(500).json({ error: "Failed to map features via embeddings" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`EHR Pipeline Express Server running on http://localhost:${PORT}`);
});