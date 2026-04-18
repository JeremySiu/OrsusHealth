import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import AssessmentReport from './AssessmentReport';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, CircleHelp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

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

const STEPS = [
  { n: 1, key: 'identity', title: 'Identity', caption: 'Patient profile' },
  { n: 2, key: 'vitals', title: 'Vitals', caption: 'Measurements & labs' },
  { n: 3, key: 'cardiac', title: 'Cardiac', caption: 'ECG & exercise' },
];

const SEX_OPTIONS = [
  { value: 'M', title: 'Male', hint: 'Recorded as male (M) in the dataset.' },
  { value: 'F', title: 'Female', hint: 'Recorded as female (F) in the dataset.' },
];

const CHEST_PAIN_OPTIONS = [
  { value: 'TA', title: 'Typical angina (TA)', hint: 'Classic exertional chest discomfort.' },
  { value: 'ATA', title: 'Atypical angina (ATA)', hint: 'Some anginal features, not fully typical.' },
  { value: 'NAP', title: 'Non-anginal (NAP)', hint: 'Pain unlikely to be cardiac ischemia.' },
  { value: 'ASY', title: 'Asymptomatic (ASY)', hint: 'No reported chest pain.' },
];

const RESTING_ECG_OPTIONS = [
  { value: 'Normal', title: 'Normal', hint: 'No major resting ST–T abnormalities.' },
  { value: 'ST', title: 'ST–T wave', hint: 'ST depression or T-wave changes at rest.' },
  { value: 'LVH', title: 'LV hypertrophy', hint: 'Voltage criteria suggest left ventricular hypertrophy.' },
];

const ST_SLOPE_OPTIONS = [
  { value: 'Up', title: 'Upsloping', hint: 'ST segment slopes upward with exercise.' },
  { value: 'Flat', title: 'Flat', hint: 'Minimal slope; often watched closely with other signs.' },
  { value: 'Down', title: 'Downsloping', hint: 'Downsloping ST; higher association with ischemia.' },
];

const EXERCISE_ANGINA_OPTIONS = [
  { value: 'Y', title: 'Yes', hint: 'Chest discomfort during the exercise test.' },
  { value: 'N', title: 'No', hint: 'No angina reported during exercise.' },
];

const FASTING_OPTIONS = [
  { value: false, title: 'Not elevated', hint: 'Fasting glucose ≤ 120 mg/dl (or not elevated).' },
  { value: true, title: 'Elevated', hint: 'Fasting blood sugar above 120 mg/dl.' },
];

const inputClass =
  'h-10 md:h-11 rounded-lg border-zinc-200/90 bg-white/85 px-3 text-sm shadow-sm transition-[color,box-shadow,border-color] placeholder:text-zinc-400 focus-visible:border-teal-500 focus-visible:ring-[3px] focus-visible:ring-teal-500/20';

function FieldHint({ label, hint }) {
  if (!hint) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded-full p-1 text-zinc-400 transition-colors hover:bg-teal-500/10 hover:text-teal-700"
          aria-label={`More information: ${label}`}
        >
          <CircleHelp className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-left leading-snug" style={{ padding: "0.25rem"}}>
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}

function FieldLabel({ htmlFor, children, hint }) {
  const labelText = typeof children === 'string' ? children : 'Field';
  return (
    <div className="flex items-start gap-1.5">
      {htmlFor ? (
        <Label htmlFor={htmlFor} className="text-zinc-800">
          {children}
        </Label>
      ) : (
        <span className="text-sm font-medium leading-none text-zinc-800">{children}</span>
      )}
      <FieldHint label={labelText} hint={hint} />
    </div>
  );
}

function SectionCard({ title, description, children, className }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-zinc-200/70 bg-white/55 shadow-[0_2px_12px_rgba(0,0,0,0.04)] ring-1 ring-white/30',
        className
      )}
      style={{ padding: "0.5rem", marginBottom: "0.5rem"}}
    >
      <div className="border-b border-zinc-100/90 bg-gradient-to-r from-teal-500/[0.07] via-teal-500/[0.02] to-transparent px-5 py-4 sm:px-6">
        <h3
          className="text-base font-semibold tracking-tight text-zinc-900"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {title}
        </h3>
        {description ? <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{description}</p> : null}
      </div>
      <div className="space-y-6 px-5 py-6 sm:px-6">{children}</div>
    </div>
  );
}

function ChoiceCard({ title, hint, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full flex-col items-start gap-1 rounded-xl border px-4 py-3.5 text-left transition-all outline-none sm:px-4 sm:py-4',
        'focus-visible:border-teal-500 focus-visible:ring-[3px] focus-visible:ring-teal-500/25',
        selected
          ? 'border-teal-500 bg-gradient-to-br from-teal-50/90 to-teal-50/40 shadow-[inset_0_0_0_1px_rgba(20,184,166,0.35)]'
          : 'border-zinc-200/85 bg-white/70 hover:border-teal-300/70 hover:bg-white/90'
      )}
      style={{ padding: "0.5rem"}}
    >
      <span className="text-sm font-semibold text-zinc-900">{title}</span>
      <span className="text-xs leading-snug text-zinc-500">{hint}</span>
    </button>
  );
}

function OptionCardGroup({ value, onChange, options, columns = 'sm:grid-cols-2', error }) {
  return (
    <div className="space-y-2">
      <div className={cn('grid grid-cols-1 gap-3', columns)}>
        {options.map((opt) => (
          <ChoiceCard
            key={String(opt.value)}
            title={opt.title}
            hint={opt.hint}
            selected={value === opt.value}
            onClick={() => onChange(opt.value)}
          />
        ))}
      </div>
      {error ? <p className="text-xs text-red-600" style={{ marginTop: "0.25rem" }}>{error}</p> : null}
    </div>
  );
}

function StepIndicator({ step }) {
  return (
    <div className="space-y-4" style={{marginTop: "0.5rem", marginBottom: "0.5rem"}}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-500 ease-out"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>
      <ol className="flex flex-col gap-2 sm:flex-row sm:gap-3" style={{paddingTop: "0.5rem"}}>
        {STEPS.map((s) => {
          const done = step > s.n;
          const current = step === s.n;
          return (
            <li key={s.key} className="min-w-0 flex-1">
              <div
                className={cn(
                  'flex min-h-[3.25rem] items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors sm:min-h-0 sm:px-3 sm:py-2',
                  current && 'border-teal-400/60 bg-teal-500/10 shadow-sm ring-1 ring-teal-500/20',
                  done && !current && 'border-zinc-200/60 bg-zinc-50/90',
                  !done && !current && 'border-zinc-200/40 bg-zinc-50/40 opacity-80'
                )}
                style={{ padding: "0.5rem" }}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    current && 'bg-teal-500 text-white shadow-sm',
                    done && !current && 'bg-teal-600 text-white',
                    !done && !current && 'bg-zinc-200 text-zinc-600'
                  )}
                >
                  {done && !current ? <Check className="h-4 w-4" strokeWidth={2.5} /> : s.n}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">{s.title}</p>
                  <p className="truncate text-xs text-zinc-500">{s.caption}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function AssessmentForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const {
    register,
    handleSubmit,
    control,
    trigger,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      FullName: '',
      Age: '',
      Sex: '',
      RestingBP: '',
      Cholesterol: '',
      FastingBS: '',
      MaxHR: '',
      ChestPainType: '',
      RestingECG: '',
      ExerciseAngina: '',
      Oldpeak: '',
      ST_Slope: '',
    },
    mode: 'onTouched',
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
        ST_Slope: data.ST_Slope,
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
      console.error('Prediction error:', error);
      setResult({
        heart_disease_probability: 0,
        top_influencing_features: [],
        error: 'Failed to connect to AI Assessment Server.',
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    const fieldsToValidate =
      step === 1 ? ['FullName', 'Age', 'Sex'] : step === 2 ? ['RestingBP', 'Cholesterol', 'MaxHR'] : [];
    const isValid = await trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const footerHint =
    step < 3
      ? `${3 - step} more step${3 - step === 1 ? '' : 's'} to complete`
      : 'Review and run the risk model when ready.';

  if (result !== null) {
    return (
      <AssessmentReport
        result={result}
        formData={getValues()}
        onRestart={() => {
          setResult(null);
          setStep(1);
        }}
      />
    );
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl p-5 md:p-8"
      style={{ scrollbarWidth: 'none', paddingLeft: "1rem", paddingRight: "1rem" }}
    >
      <div className="mb-6 shrink-0 space-y-1">
        <h2
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          New Assessment
        </h2>
        <p className="text-sm text-zinc-500">
          Step {step} of 3 ·{' '}
          <span className="font-medium text-teal-800/90">{STEPS[step - 1].title}</span>
        </p>
      </div>

      <StepIndicator step={step} />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex min-h-0 flex-1 flex-col gap-0">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-2" style={{ scrollbarWidth: 'thin' }}>
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 space-y-8 duration-500">
              <SectionCard
                title="Patient details"
                description="Legal name and age used for this assessment record."
              >
                <div className="space-y-2" style={{ paddingTop: "0.5rem" }}>
                  <FieldLabel htmlFor="FullName" hint="Use the name you want shown on exported reports.">
                    Full name
                  </FieldLabel>
                  <Input
                    id="FullName"
                    type="text"
                    placeholder="e.g. Jordan Lee"
                    autoComplete="name"
                    aria-invalid={errors.FullName ? 'true' : undefined}
                    className={cn(inputClass, errors.FullName && 'border-red-400 focus-visible:ring-red-200')}
                    {...register('FullName')}
                    style={{ marginTop: "0.25rem", textIndent: "0.5rem"}}
                  />
                  {errors.FullName ? (
                    <p className="text-xs text-red-600" style={{ marginTop: "0.25rem" }}>{errors.FullName.message}</p>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8" style={{ paddingTop: "0.5rem" }}>
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor="Age"
                      hint="Must be between 18 and 120. Age affects how models interpret vitals."
                    >
                      Age (years)
                    </FieldLabel>
                    <Input
                      id="Age"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g. 55"
                      aria-invalid={errors.Age ? 'true' : undefined}
                      className={cn(inputClass, errors.Age && 'border-red-400 focus-visible:ring-red-200')}
                      {...register('Age')}
                      style={{ marginTop: "0.25rem", textIndent: "0.5rem"}}
                    />
                    {errors.Age ? <p className="text-xs text-red-600" style={{ marginTop: "0.25rem" }}>{errors.Age.message}</p> : null}
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Biological sex"
                description="Used because reference ranges and risk patterns can differ by sex."
              >
                <Controller
                  name="Sex"
                  control={control}
                  render={({ field }) => (
                    <OptionCardGroup
                      value={field.value}
                      onChange={field.onChange}
                      options={SEX_OPTIONS}
                      columns="sm:grid-cols-2"
                      error={errors.Sex?.message}
                    />
                  )}
                />
              </SectionCard>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 space-y-8 duration-500">
              <SectionCard
                title="Vitals & lab values"
                description="Resting measurements and lipids from your latest visit or home readings."
              >
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8" style={{ paddingTop: "0.5rem" }}>
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor="RestingBP"
                      hint="Systolic/diastolic-style single value here: enter typical resting BP in mm Hg (80–200)."
                    >
                      Resting blood pressure (mm Hg)
                    </FieldLabel>
                    <Input
                      id="RestingBP"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g. 120"
                      aria-invalid={errors.RestingBP ? 'true' : undefined}
                      className={cn(inputClass, errors.RestingBP && 'border-red-400 focus-visible:ring-red-200')}
                      {...register('RestingBP')}
                      style={{ marginTop: "0.25rem", textIndent: "0.5rem" }}
                    />
                    {errors.RestingBP ? (
                      <p className="text-xs text-red-600" style={{ marginTop: "0.25rem" }}>{errors.RestingBP.message}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor="Cholesterol"
                      hint="Serum total cholesterol in mg/dl if that is what your lab reported."
                    >
                      Serum cholesterol (mg/dl)
                    </FieldLabel>
                    <Input
                      id="Cholesterol"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g. 200"
                      aria-invalid={errors.Cholesterol ? 'true' : undefined}
                      className={cn(inputClass, errors.Cholesterol && 'border-red-400 focus-visible:ring-red-200')}
                      {...register('Cholesterol')}
                      style={{ marginTop: "0.25rem", textIndent: "0.5rem" }}
                    />
                    {errors.Cholesterol ? (
                      <p className="text-xs text-red-600" style={{ marginTop: "0.25rem" }}>{errors.Cholesterol.message}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2 lg:col-span-2">
                    <FieldLabel
                      htmlFor="MaxHR"
                      hint="Peak heart rate during stress test or highest reliable value (60–202 bpm per ACSM-style bounds)."
                    >
                      Maximum heart rate (bpm)
                    </FieldLabel>
                    <Input
                      id="MaxHR"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g. 150"
                      aria-invalid={errors.MaxHR ? 'true' : undefined}
                      className={cn(inputClass, errors.MaxHR && 'border-red-400 focus-visible:ring-red-200')}
                      {...register('MaxHR')}
                      style={{ marginTop: "0.25rem", textIndent: "0.5rem" }}
                    />
                    {errors.MaxHR ? <p className="text-xs text-red-600" style={{ marginTop: "0.25rem" }}>{errors.MaxHR.message}</p> : null}
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Fasting blood sugar"
                description="Whether fasting glucose is above the common 120 mg/dl threshold."
              >
                <Controller
                  name="FastingBS"
                  control={control}
                  render={({ field }) => (
                    <OptionCardGroup
                      value={field.value}
                      onChange={(v) => field.onChange(v)}
                      options={FASTING_OPTIONS}
                      columns="sm:grid-cols-2"
                    />
                  )}
                />
              </SectionCard>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 space-y-8 pb-4 duration-500">
              <SectionCard
                title="Chest pain & resting ECG"
                description="Patterns from history and the resting electrocardiogram."
              >
                <div className="space-y-6">
                  <div>
                    <div className="mb-3" style={{ paddingTop: "0.5rem", marginBottom: "0.25rem"}}>
                      <FieldLabel hint="Choose the category that best matches the patient’s reported pain.">
                        Chest pain type
                      </FieldLabel>
                    </div>
                    <Controller
                      name="ChestPainType"
                      control={control}
                      render={({ field }) => (
                        <OptionCardGroup
                          value={field.value}
                          onChange={field.onChange}
                          options={CHEST_PAIN_OPTIONS}
                          columns="sm:grid-cols-2"
                          error={errors.ChestPainType?.message}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <div className="mb-3" style={{ paddingTop: "0.5rem", marginBottom: "0.25rem"}}>
                      <FieldLabel hint="Resting ECG classification before exercise or pharmacologic stress.">
                        Resting ECG
                      </FieldLabel>
                    </div>
                    <Controller
                      name="RestingECG"
                      control={control}
                      render={({ field }) => (
                        <OptionCardGroup
                          value={field.value}
                          onChange={field.onChange}
                          options={RESTING_ECG_OPTIONS}
                          columns="sm:grid-cols-2 lg:grid-cols-3"
                          error={errors.RestingECG?.message}
                        />
                      )}
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="ST segment & exercise"
                description="Stress-test style metrics: slope, depression, and exercise angina."
              >
                <div className="space-y-6">
                  <div>
                    <div className="mb-3" style={{ paddingTop: "0.5rem", marginBottom: "0.25rem"}}>
                      <FieldLabel hint="Slope of the ST segment at maximal exercise—often paired with Oldpeak.">
                        ST slope
                      </FieldLabel>
                    </div>
                    <Controller
                      name="ST_Slope"
                      control={control}
                      render={({ field }) => (
                        <OptionCardGroup
                          value={field.value}
                          onChange={field.onChange}
                          options={ST_SLOPE_OPTIONS}
                          columns="sm:grid-cols-3"
                          error={errors.ST_Slope?.message}
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-2" style={{ paddingTop: "0.5rem", marginBottom: "0.25rem"}}>
                    <FieldLabel
                      htmlFor="Oldpeak"
                      hint="ST depression relative to rest (often in mm). Can be negative in some tracings; valid range here is −5 to 10."
                    >
                      Oldpeak (ST depression)
                    </FieldLabel>
                    <Input
                      id="Oldpeak"
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      placeholder="e.g. 1.5"
                      aria-invalid={errors.Oldpeak ? 'true' : undefined}
                      className={cn(inputClass, errors.Oldpeak && 'border-red-400 focus-visible:ring-red-200')}
                      {...register('Oldpeak')}
                      style={{ marginTop: "0.25rem", textIndent: "0.5rem" }}
                    />
                    {errors.Oldpeak ? (
                      <p className="text-xs text-red-600">{errors.Oldpeak.message}</p>
                    ) : null}
                  </div>

                  <div>
                    <div className="mb-3" style={{ paddingTop: "0.5rem", marginBottom: "0.25rem"}}>
                      <FieldLabel hint="Whether the patient reported angina during the exercise portion of testing.">
                        Exercise-induced angina
                      </FieldLabel>
                    </div>
                    <Controller
                      name="ExerciseAngina"
                      control={control}
                      render={({ field }) => (
                        <OptionCardGroup
                          value={field.value}
                          onChange={field.onChange}
                          options={EXERCISE_ANGINA_OPTIONS}
                          columns="sm:grid-cols-2"
                          error={errors.ExerciseAngina?.message}
                        />
                      )}
                    />
                  </div>
                </div>
              </SectionCard>
            </div>
          )}
        </div>

        <div className="shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-medium text-teal-900/80">{footerHint}</p>
              <p className="truncate text-xs text-zinc-500">
                {STEPS[step - 1].title} · {STEPS[step - 1].caption}
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 sm:min-w-[280px]" style={{ marginBottom: "0.25rem", marginTop: "0.25rem"}}>
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 min-w-[5.5rem] border-zinc-300/90 bg-white/80 px-5 text-zinc-700 shadow-sm hover:bg-zinc-50 hover:text-zinc-900"
                  onClick={prevStep}
                >
                  Back
                </Button>
              ) : (
                <span className="hidden min-w-[5.5rem] sm:block" aria-hidden />
              )}

              {step < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="h-10 min-w-[8rem] rounded-full bg-gradient-to-br from-[#0F172A] to-[#1e293b] px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(15,23,42,0.25)] transition-all hover:scale-[1.02] hover:from-[#1e293b] hover:to-[#334155] hover:shadow-[0_6px_20px_rgba(15,23,42,0.35)] active:scale-[0.98]"
                >
                  Next step
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-10 min-w-[10rem] rounded-full border-0 bg-gradient-to-b from-[#14b8a6] to-[#0f766e] px-8 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(20,184,166,0.35)] transition-all hover:scale-[1.02] hover:shadow-[0_12px_28px_rgba(20,184,166,0.45)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                >
                  {loading ? 'Processing…' : 'Predict risk'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
