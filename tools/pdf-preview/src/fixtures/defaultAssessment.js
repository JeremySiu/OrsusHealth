export const defaultFormData = {
  FullName: 'Jordan Lee',
  Age: 55,
  Sex: 'M',
  RestingBP: 138,
  Cholesterol: 242,
  FastingBS: true,
  MaxHR: 148,
  ChestPainType: 'ATA',
  RestingECG: 'Normal',
  ExerciseAngina: 'N',
  Oldpeak: 1.6,
  ST_Slope: 'Flat',
};

export const defaultResult = {
  heart_disease_probability: 63.4,
  top_influencing_features: [
    { feature: 'Oldpeak', shap_value: 0.84 },
    { feature: 'Cholesterol', shap_value: 0.62 },
    { feature: 'RestingBP', shap_value: 0.44 },
  ],
};
