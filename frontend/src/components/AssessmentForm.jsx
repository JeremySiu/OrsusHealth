import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import AssessmentReport from './AssessmentReport';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Switch } from './ui/switch';

const assessmentSchema = z.object({
  FullName: z.string().min(2, { message: "Please enter your full name." }),
  Age: z.coerce.number().min(18, { message: "Age must be at least 18." }).max(120, { message: "Age must be at most 120." }),
  Sex: z.string().min(1, { message: "Please select a biological sex." }),
  RestingBP: z.coerce.number().min(80, { message: "Resting BP must be at least 80 mm Hg." }).max(200, { message: "Resting BP must be at most 200 mm Hg." }),
  Cholesterol: z.coerce.number().min(0, { message: "Cholesterol must be 0 or higher." }).max(600, { message: "Cholesterol must be less than 600 mm/dl." }),
  FastingBS: z.boolean(),
  MaxHR: z.coerce.number().min(60, { message: "Max HR must be at least 60." }).max(202, { message: "Maximum heart rate achieved must be between 60-202. (ACSM Guidelines)" }),
  ChestPainType: z.string().min(1, { message: "Please select Chest Pain Type" }),
  RestingECG: z.string().min(1, { message: "Please select Resting ECG pattern" }),
  ExerciseAngina: z.string().min(1, { message: "Please select Yes or No" }),
  Oldpeak: z.coerce.number().min(-5, { message: "Oldpeak must be between -5 and 10." }).max(10, { message: "Oldpeak must be between -5 and 10." }),
  ST_Slope: z.string().min(1, { message: "Please select ST Slope" }),
});
const getFeatureLabel = (featureName) => {
  const map = {
    'Age': 'Age',
    'Sex': 'Biological Sex',
    'RestingBP': 'Resting Blood Pressure',
    'Cholesterol': 'Serum Cholesterol',
    'FastingBS': 'Fasting Blood Sugar',
    'MaxHR': 'Maximum Heart Rate',
    'ExerciseAngina': 'Exercise-Induced Angina',
    'Oldpeak': 'ST Depression (Oldpeak)',
    'ChestPainType_ASY': 'Chest Pain (Asymptomatic)',
    'ChestPainType_ATA': 'Chest Pain (Atypical Angina)',
    'ChestPainType_NAP': 'Chest Pain (Non-Anginal)',
    'ChestPainType_TA': 'Chest Pain (Typical Angina)',
    'RestingECG_LVH': 'Resting ECG (Hypertrophy)',
    'RestingECG_Normal': 'Resting ECG (Normal)',
    'RestingECG_ST': 'Resting ECG (ST-T wave)',
    'ST_Slope_Down': 'ST Slope (Downsloping)',
    'ST_Slope_Flat': 'ST Slope (Flat)',
    'ST_Slope_Up': 'ST Slope (Upsloping)'
  };
  return map[featureName] || featureName;
};

export default function AssessmentForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const { register, handleSubmit, control, trigger, getValues, formState: { errors } } = useForm({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      FullName: '',
      Age: '',
      Sex: '',
      RestingBP: '',
      Cholesterol: '',
      FastingBS: false,
      MaxHR: '',
      ChestPainType: '',
      RestingECG: '',
      ExerciseAngina: '',
      Oldpeak: '',
      ST_Slope: '',
    },
    mode: 'onTouched'
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        Age: Number(data.Age),
        Sex: data.Sex,
        RestingBP: Number(data.RestingBP),
        Cholesterol: Number(data.Cholesterol),
        FastingBS: data.FastingBS ? 1 : 0,
        MaxHR: Number(data.MaxHR),
        ChestPainType: data.ChestPainType,
        RestingECG: data.RestingECG,
        ExerciseAngina: data.ExerciseAngina,
        Oldpeak: Number(data.Oldpeak),
        ST_Slope: data.ST_Slope
      };

      const API_BASE = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${API_BASE}predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch prediction');
      }

      const resultData = await response.json();
      setResult(resultData);
    } catch (error) {
      console.error("Prediction error:", error);
      setResult({
        heart_disease_probability: 0,
        top_influencing_features: [],
        error: "Failed to connect to AI Assessment Server."
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    // Validate current step fields before proceeding
    const fieldsToValidate = 
      step === 1 ? ['FullName', 'Age', 'Sex'] :
      step === 2 ? ['RestingBP', 'Cholesterol', 'MaxHR'] :
      [];
    const isValid = await trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  if (result !== null) {
    return (
      <AssessmentReport 
        result={result} 
        formData={getValues()} 
        onRestart={() => { setResult(null); setStep(1); }} 
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 md:p-8 rounded-xl relative" style={{ scrollbarWidth: 'none' }}>
       {/* Form Header */}
       <div className="mb-8 shrink-0">
         <h2 className="text-3xl font-semibold text-zinc-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
           New Assessment
         </h2>
         <p className="text-sm text-zinc-500 mt-2">
           Step {step} of 3 &bull; Clinical Data Collection
         </p>
         <div className="w-full bg-black/5 rounded-full h-1.5 mt-4">
           <div className="bg-teal-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }}></div>
         </div>
       </div>

       <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 flex-1 flex flex-col min-h-0">
         <div className="flex-1 overflow-y-auto pr-2 pb-4" style={{ scrollbarWidth: 'thin' }}>
           {step === 1 && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
               <div>
                  <h3 className="text-lg font-medium text-zinc-800 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Patient Context</h3>
                  <p className="text-sm text-zinc-500">Basic demographic information.</p>
               </div>
               
               <div className="space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor="FullName">Full Name</Label>
                   <Input id="FullName" type="text" placeholder="e.g. John Doe" {...register('FullName')} className="bg-white/50" />
                   {errors.FullName && <p className="text-red-500 text-xs mt-1">{errors.FullName.message}</p>}
                 </div>

                 <div className="space-y-2">
                   <Label htmlFor="Age">Age (Years)</Label>
                   <Input id="Age" type="number" placeholder="e.g. 55" {...register('Age')} className="bg-white/50" />
                   {errors.Age && <p className="text-red-500 text-xs mt-1">{errors.Age.message}</p>}
                 </div>
               </div>

               <div className="space-y-2">
                 <Label htmlFor="Sex">Biological Sex</Label>
                 <Controller
                   name="Sex"
                   control={control}
                   render={({ field }) => (
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                       <SelectTrigger className="bg-white/50">
                         <SelectValue placeholder="Select sex" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="M">Male (M)</SelectItem>
                         <SelectItem value="F">Female (F)</SelectItem>
                       </SelectContent>
                     </Select>
                   )}
                 />
                 {errors.Sex && <p className="text-red-500 text-xs mt-1">{errors.Sex.message}</p>}
               </div>
             </div>
           )}

           {step === 2 && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
               <div>
                  <h3 className="text-lg font-medium text-zinc-800 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Vitals & Lab Work</h3>
                  <p className="text-sm text-zinc-500">Physiological measurements.</p>
               </div>
               
               <div className="space-y-2">
                 <Label htmlFor="RestingBP">Resting Blood Pressure (mm Hg)</Label>
                 <Input id="RestingBP" type="number" placeholder="e.g. 120" {...register('RestingBP')} className="bg-white/50" />
                 {errors.RestingBP && <p className="text-red-500 text-xs mt-1">{errors.RestingBP.message}</p>}
               </div>

               <div className="space-y-2">
                 <Label htmlFor="Cholesterol">Serum Cholesterol (mm/dl)</Label>
                 <Input id="Cholesterol" type="number" placeholder="e.g. 200" {...register('Cholesterol')} className="bg-white/50" />
                 {errors.Cholesterol && <p className="text-red-500 text-xs mt-1">{errors.Cholesterol.message}</p>}
               </div>

               <div className="space-y-2">
                 <Label htmlFor="MaxHR">Maximum Heart Rate (bpm)</Label>
                 <Input id="MaxHR" type="number" placeholder="e.g. 150" {...register('MaxHR')} className="bg-white/50" />
                 {errors.MaxHR && <p className="text-red-500 text-xs mt-1">{errors.MaxHR.message}</p>}
               </div>

               <div className="flex flex-row items-center justify-between rounded-lg border border-black/10 p-4 bg-white/40 backdrop-blur-md mt-4">
                 <div className="space-y-0.5">
                   <Label className="text-base text-zinc-800">Fasting Blood Sugar ({'>'} 120 mg/dl)</Label>
                   <p className="text-xs text-zinc-500">Is the patient's fasting blood sugar elevated?</p>
                 </div>
                 <Controller
                   name="FastingBS"
                   control={control}
                   render={({ field }) => (
                     <Switch checked={field.value} onCheckedChange={field.onChange} />
                   )}
                 />
               </div>
             </div>
           )}

           {step === 3 && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-8">
               <div>
                  <h3 className="text-lg font-medium text-zinc-800 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Cardiology Metrics</h3>
                  <p className="text-sm text-zinc-500">ECG and related observations.</p>
               </div>
               
               <div className="space-y-2">
                 <Label htmlFor="ChestPainType">Chest Pain Type</Label>
                 <Controller
                   name="ChestPainType"
                   control={control}
                   render={({ field }) => (
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                       <SelectTrigger className="bg-white/50">
                         <SelectValue placeholder="Select type" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="TA">Typical Angina (TA)</SelectItem>
                         <SelectItem value="ATA">Atypical Angina (ATA)</SelectItem>
                         <SelectItem value="NAP">Non-Anginal Pain (NAP)</SelectItem>
                         <SelectItem value="ASY">Asymptomatic (ASY)</SelectItem>
                       </SelectContent>
                     </Select>
                   )}
                 />
                 {errors.ChestPainType && <p className="text-red-500 text-xs mt-1">{errors.ChestPainType.message}</p>}
               </div>

               <div className="space-y-2">
                 <Label htmlFor="RestingECG">Resting ECG</Label>
                 <Controller
                   name="RestingECG"
                   control={control}
                   render={({ field }) => (
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                       <SelectTrigger className="bg-white/50">
                         <SelectValue placeholder="Select ECG result" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="Normal">Normal</SelectItem>
                         <SelectItem value="ST">ST-T wave abnormality</SelectItem>
                         <SelectItem value="LVH">Left ventricular hypertrophy</SelectItem>
                       </SelectContent>
                     </Select>
                   )}
                 />
                 {errors.RestingECG && <p className="text-red-500 text-xs mt-1">{errors.RestingECG.message}</p>}
               </div>

               <div className="space-y-2">
                 <Label htmlFor="ST_Slope">ST Slope</Label>
                 <Controller
                   name="ST_Slope"
                   control={control}
                   render={({ field }) => (
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                       <SelectTrigger className="bg-white/50">
                         <SelectValue placeholder="Select slope" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="Up">Upsloping</SelectItem>
                         <SelectItem value="Flat">Flat</SelectItem>
                         <SelectItem value="Down">Downsloping</SelectItem>
                       </SelectContent>
                     </Select>
                   )}
                 />
                 {errors.ST_Slope && <p className="text-red-500 text-xs mt-1">{errors.ST_Slope.message}</p>}
               </div>

               <div className="space-y-2">
                 <Label htmlFor="Oldpeak">Oldpeak (ST depression)</Label>
                 <Input id="Oldpeak" type="number" step="0.1" placeholder="e.g. 1.5" {...register('Oldpeak')} className="bg-white/50" />
                 {errors.Oldpeak && <p className="text-red-500 text-xs mt-1">{errors.Oldpeak.message}</p>}
               </div>

               <div className="space-y-3 pt-2">
                 <Label className="text-zinc-800 font-medium">Exercise-Induced Angina</Label>
                 <Controller
                   name="ExerciseAngina"
                   control={control}
                   render={({ field }) => (
                     <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                       <div className="flex items-center space-x-2 bg-white/40 px-4 py-2 rounded-lg border border-black/10 cursor-pointer">
                         <RadioGroupItem value="Y" id="r-yes" />
                         <Label htmlFor="r-yes" className="cursor-pointer">Yes (Y)</Label>
                       </div>
                       <div className="flex items-center space-x-2 bg-white/40 px-4 py-2 rounded-lg border border-black/10 cursor-pointer">
                         <RadioGroupItem value="N" id="r-no" />
                         <Label htmlFor="r-no" className="cursor-pointer">No (N)</Label>
                       </div>
                     </RadioGroup>
                   )}
                 />
                 {errors.ExerciseAngina && <p className="text-red-500 text-xs mt-1">{errors.ExerciseAngina.message}</p>}
               </div>
             </div>
           )}
         </div>

         {/* Navigation Buttons */}
         <div className="flex justify-between items-center mt-auto pt-6 border-t border-black/5 bg-transparent shrink-0">
           {step > 1 ? (
             <button type="button" onClick={prevStep} className="px-5 py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
               Back
             </button>
           ) : <div />}
           
           {step < 3 ? (
             <button type="button" onClick={nextStep} className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-800 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
               Next Step
             </button>
           ) : (
             <button type="submit" disabled={loading} className="rounded-full bg-gradient-to-b from-[#14b8a6] to-[#0f766e] px-8 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(20,184,166,0.3)] transition-all hover:shadow-[0_12px_32px_rgba(20,184,166,0.5)] disabled:opacity-70 disabled:cursor-wait">
               {loading ? 'Processing...' : 'Predict Risk'}
             </button>
           )}
         </div>
       </form>
    </div>
  );
}
