export const getClinicalFacts = (featureName, isPositive) => {
  // isPositive means it INCREASES risk from the machine learning model's perspective.
  // Note: some features structurally increase/decrease risk. We handle the lookup by featureName.
  
  const rules = {
    'Age': {
      true: {
        fact: "Advanced age correlates with progressive stiffening of arterial walls, increasing cardiovascular resistance.",
        suggestion: "Keep up with routine medical screenings and maintain a diet rich in antioxidants.",
        citation: "CCS Guidelines on Aging & Cardiovascular Disease"
      },
      false: {
        fact: "Younger chronological age generally reflects more elastic and compliant blood vessels.",
        suggestion: "Build long-term cardiovascular resilience by establishing sustainable physical exercise routines now.",
        citation: "CCS Primary Prevention Guidelines"
      }
    },
    'Sex': {
      // Typically males have higher baseline risk before females reach menopause
      true: {
        fact: "Certain biological sex factors, such as hormonal profiles and anatomical heart size, are associated with a higher baseline propensity for coronary events.",
        suggestion: "Engage in more frequent proactive cholesterol and blood pressure monitoring.",
        citation: "Journal of the American College of Cardiology: Sex Differences in CVD"
      },
      false: {
        fact: "Certain protective hormonal environments (like pre-menopausal estrogen) can delay the onset of cardiovascular plaque buildup.",
        suggestion: "Focus on maintaining endocrine health and continue avoiding tobacco use.",
        citation: "AHA: Women and Heart Disease"
      }
    },
    'RestingBP': {
      true: {
        fact: "Elevated resting blood pressure forces the heart muscle to work significantly harder, accelerating vascular damage.",
        suggestion: "Reduce dietary sodium intake, manage stress, and adhere to any anti-hypertensive regimen prescribed by your doctor.",
        citation: "AHA/ACC Hypertension Guidelines"
      },
      false: {
        fact: "A healthy resting blood pressure indicates minimal arterial resistance, which preserves the structural integrity of the heart.",
        suggestion: "Maintain your healthy blood pressure by prioritizing cardiovascular exercise and sleep.",
        citation: "AHA/ACC Hypertension Guidelines"
      }
    },
    'Cholesterol': {
      true: {
        fact: "High serum cholesterol (specifically LDL) creates atherosclerotic plaques that narrow arteries and restrict vital blood flow.",
        suggestion: "Substitute saturated animal fats with plant-based alternatives and consider a statin consultation if levels remain high.",
        citation: "CCS Dyslipidemia Guidelines"
      },
      false: {
        fact: "Healthy lipid profiles allow smooth, unrestricted blood flow to the myocardium (heart muscle).",
        suggestion: "Continue a diet high in fiber and omega-3 fatty acids to sustain this profile.",
        citation: "CCS Dyslipidemia Guidelines"
      }
    },
    'FastingBS': {
      true: {
        fact: "Elevated fasting blood sugar causes endothelial dysfunction through advanced glycation, fundamentally damaging blood vessel linings.",
        suggestion: "Regulate carbohydrate intake and maintain metabolic sensitivity through daily cardiovascular activity.",
        citation: "Diabetes Canada Clinical Practice Guidelines"
      },
      false: {
        fact: "Normal metabolic glucose processing protects the delicate endothelial lining from toxic sugar-related inflammatory damage.",
        suggestion: "Avoid sudden spikes in dietary glycemic load to preserve this metabolic health.",
        citation: "Diabetes Canada Clinical Practice Guidelines"
      }
    },
    'MaxHR': {
      true: {
        fact: "An unusually low maximum heart rate achieved during stress or exercise can indicate chronotropic incompetence and electrical conduction issues.",
        suggestion: "Discuss exercise tolerance with a cardiologist to ensure your heart's pacing nodes are functioning correctly.",
        citation: "AHA: Heart Rate and Exercise Tolerance"
      },
      false: {
        fact: "Achieving a robust maximum heart rate implies strong autonomic nervous system control and excellent cardiovascular reserve.",
        suggestion: "Engage in targeted aerobic interval training to further strengthen your cardiac output.",
        citation: "ACC Guidelines on Exercise Testing"
      }
    },
    'ExerciseAngina': {
      true: {
        fact: "Experiencing chest pain during physical exertion strongly indicates an ischemic myocardial oxygen supply-demand mismatch.",
        suggestion: "Seek immediate clinical evaluation and avoid strenuous physical exertion until cleared by a physician.",
        citation: "AHA/ACC Guideline for the Diagnosis of Patients With Chest Pain"
      },
      false: {
        fact: "The absence of angina during stress indicates that your coronary arteries are capable of adequately supplying oxygen under load.",
        suggestion: "Continue to progressively challenge your heart rate through regular aerobic exercise.",
        citation: "AHA/ACC Guideline for the Diagnosis of Patients With Chest Pain"
      }
    },
    'Oldpeak': {
      true: {
        fact: "ST depression during exercise recovery (Oldpeak) is a classic electrocardiographic sign of severe subendocardial ischemia.",
        suggestion: "Immediate cardiac consultation is recommended to assess potential coronary artery blockage.",
        citation: "ACC Guidelines on Clinical Exercise Testing"
      },
      false: {
        fact: "Clean resting and recovery ECG waveforms (low Oldpeak) indicate healthy, rapid electrical recovery of the heart ventricles.",
        suggestion: "Maintain regular check-ups to track your baseline ECG patterns.",
        citation: "ACC Guidelines on Clinical Exercise Testing"
      }
    },
    'ChestPainType_ASY': {
      true: {
        fact: "Asymptomatic ischemia ('silent ischemia') is dangerous because severe vessel blockages advance without noticeable warning signs.",
        suggestion: "Undergo aggressive proactive cardiovascular screening since you do not experience typical warning symptoms.",
        citation: "AHA Scientific Statement on Silent Myocardial Ischemia"
      },
      false: {
        fact: "Not being completely asymptomatic during ischemic events is protective because symptoms serve as an early warning mechanism.",
        suggestion: "Always listen to your body and report any unusual chest or arm sensations promptly.",
        citation: "AHA Journals: Symptomatic vs Silent Ischemia"
      }
    },
    'ChestPainType_ATA': {
      true: {
        fact: "Atypical angina implies chest discomfort that lacks some classic features but still poses a significant risk of coronary compromise.",
        suggestion: "Treat atypical pain seriously. Keep a log of your symptoms and potential triggers to show your cardiologist.",
        citation: "AHA/ACC Guideline for the Diagnosis of Patients With Chest Pain"
      },
      false: {
        fact: "Lacking atypical symptoms simplifies the diagnosis path ensuring clear baseline evaluations.",
        suggestion: "Maintain awareness of what typical angina feels like (pressure, tightness) to remain vigilant.",
        citation: "AHA/ACC Guideline for the Diagnosis of Patients With Chest Pain"
      }
    },
    'ChestPainType_NAP': {
      true: {
        fact: "Non-anginal pain often stems from esophageal or musculoskeletal sources, but ruling out cardiac origins is critical due to symptom overlaps.",
        suggestion: "Address other potential causes (like acid reflux or muscle strain) while keeping your physician updated.",
        citation: "AHA Statement on Non-Cardiac Chest Pain"
      },
      false: {
        fact: "Avoiding non-anginal pain allows for clearer risk stratification without diagnostic confusion.",
        suggestion: "Continue to practice good musculoskeletal and digestive habits.",
        citation: "AHA Statement on Non-Cardiac Chest Pain"
      }
    },
    'ChestPainType_TA': {
      true: {
        fact: "Typical Angina (substernal pressure provoked by stress) is the textbook indicator of obstructive coronary artery disease.",
        suggestion: "Strictly adhere to prescribed medications (such as nitroglycerin) and prepare for potential angiographic assessment.",
        citation: "AHA/ACC Guideline for the Diagnosis of Patients With Chest Pain"
      },
      false: {
        fact: "The absence of typical crushing chest pain under exertion signifies stable functioning of the core vessels.",
        suggestion: "Incorporate regular cardio routines to keep coronary patency robust.",
        citation: "AHA/ACC Guideline for the Diagnosis of Patients With Chest Pain"
      }
    },
    'RestingECG_LVH': {
      true: {
        fact: "Left Ventricular Hypertrophy (LVH) signifies a thickened heart muscle struggling against chronically high blood pressure, making it prone to failure.",
        suggestion: "Aggressive blood pressure control and reduction in dietary sodium are absolutely paramount to arrest this remodeling.",
        citation: "AHA/ACC Guidelines for the Management of Heart Failure"
      },
      false: {
        fact: "A normal ventricular wall thickness ensures that the heart pump operates efficiently without excess tissue oxygen demand.",
        suggestion: "Prevent LVH by treating even mildly elevated blood pressures promptly.",
        citation: "AHA Journals: Ventricular Remodeling"
      }
    },
    'RestingECG_Normal': {
      true: {
        fact: "In some complex cases, a 'normal' resting ECG can mask underlying issues that only appear during physical or chemical stress.",
        suggestion: "Ensure you receive a stress-echocardiogram if symptoms exist despite a normal resting ECG.",
        citation: "AHA Statement on Diagnostic Accuracy of ECGs"
      },
      false: {
        fact: "Normal sinus rhythm and waveform morphologies indicate a healthy, perfectly coordinated electrical conduction system.",
        suggestion: "To protect this, monitor electrolyte balances (potassium, magnesium) in your diet.",
        citation: "American College of Cardiology: ECG Standardization"
      }
    },
    'RestingECG_ST': {
      true: {
        fact: "Resting ST-T wave abnormalities flag chronic or acute electrical repolarization issues, often indicating underlying heart damage.",
        suggestion: "Consult a specialist immediately. Avoid high-intensity stimulants and ensure stable hydration.",
        citation: "AHA/ACC Guidelines on Electrocardiography"
      },
      false: {
        fact: "Stable and clean ST-T wave repolarization indicates healthy electrical recovery and oxygenation of the myocardium.",
        suggestion: "Protect your heart's electrical health by avoiding excessive stress and sleep deprivation.",
        citation: "AHA/ACC Guidelines on Electrocardiography"
      }
    },
    'ST_Slope_Down': {
      true: {
        fact: "A downsloping ST segment post-exercise is one of the highest risk markers for severe, multi-vessel coronary artery disease.",
        suggestion: "Urgent catheterization or advanced imaging is required. Do not perform heavy physical labor.",
        citation: "ACC Guidelines on Clinical Exercise Testing"
      },
      false: {
        fact: "Absence of downsloping ST segments confirms successful myocardial oxygen delivery during peak loads.",
        suggestion: "Consistent, moderate-level physical activity is safe and encouraged.",
        citation: "ACC Guidelines on Clinical Exercise Testing"
      }
    },
    'ST_Slope_Flat': {
      true: {
        fact: "A flat ST segment slope denotes inadequate rapid electrical recovery, suggesting a milder or emerging deficit in coronary blood flow.",
        suggestion: "Closely monitor symptoms of fatigue and discuss initiating protective statin or beta-blocker therapies with a professional.",
        citation: "AHA Guidelines on ECG Implementation"
      },
      false: {
        fact: "A non-flat (upsloping) profile points to a much healthier and highly responsive cardiovascular system.",
        suggestion: "Sustain your cardiovascular efficiency with varied aerobic and anaerobic conditioning.",
        citation: "AHA Guidelines on ECG Implementation"
      }
    },
    'ST_Slope_Up': {
      true: {
        fact: "While generally less severe, an excessive rapid upsloping can sometimes mask borderline ischemic changes if not correlated with a high heart rate.",
        suggestion: "Combine ECG results with other diagnostic markers like biomarkers or imaging for safety.",
        citation: "Journal of the American College of Cardiology: Exercise Electrocardiography"
      },
      false: {
        fact: "A rapid, normal upsloping ST segment is a strong indicator of an excellent, healthy heart muscle recovery profile.",
        suggestion: "Take comfort in excellent aerobic capability and maintain your fitness regimen.",
        citation: "Journal of the American College of Cardiology: Exercise Electrocardiography"
      }
    }
  };

  const featureRecord = rules[featureName];
  if (!featureRecord) {
    return {
      fact: "This factor plays a nuanced role in the machine learning model's cardiovascular assessment.",
      suggestion: "Maintain general cardiovascular health guidelines emphasizing diet, exercise, and stress reduction.",
      citation: "American Heart Association Primary Prevention Guidelines"
    };
  }

  return featureRecord[isPositive] || featureRecord[true];
};
