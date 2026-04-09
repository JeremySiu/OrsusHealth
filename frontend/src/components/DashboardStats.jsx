/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Heart, Activity, Droplet, Apple, 
  Stethoscope, HeartPulse, ActivitySquare, User
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const USE_MOCK_DATA = true;

const MOCK_ASSESSMENT = {
  Age: 45,
  Sex: 'M',
  ChestPainType: 'ATA',
  RestingBP: 124,
  Cholesterol: 198,
  FastingBS: 0,
  RestingECG: 'Normal',
  MaxHR: 160,
  ExerciseAngina: 'N',
  Oldpeak: 0.5,
  ST_Slope: 'Up',
  HeartDisease: 15 // Mock 15% risk
};

const STATS_MAP = {
  ChestPainType: {
    'TA': 'Typical Angina',
    'ATA': 'Atypical Angina',
    'NAP': 'Non-Anginal Pain',
    'ASY': 'Asymptomatic'
  },
  ST_Slope: {
    'Up': 'Upsloping',
    'Flat': 'Flat',
    'Down': 'Downsloping'
  }
};

const CircularProgress = ({ value, label, size = 200, strokeWidth = 16 }) => {
  // If value is null/undefined, render as 0 but hide the number
  const isNa = value == null;
  const displayValue = isNa ? 0 : Math.min(100, Math.max(0, value));
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (displayValue / 100) * circumference;
  
  let colorClass = "text-teal-500";
  let bgClass = "text-teal-500/10";
  let statusText = "Normal";

  if (isNa) {
    colorClass = "text-zinc-300";
    bgClass = "text-zinc-100";
    statusText = "N/A";
  } else if (value > 60) {
    colorClass = "text-rose-500";
    bgClass = "text-rose-500/10";
    statusText = "At Risk";
  } else if (value > 30) {
    colorClass = "text-amber-500";
    bgClass = "text-amber-500/10";
    statusText = "Elevated";
  }

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full drop-shadow-sm">
        <circle
          className={bgClass}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${colorClass} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-5xl font-bold tracking-tighter text-zinc-800" style={{ fontFamily: 'var(--font-heading)' }}>
          {isNa ? 'N/A' : `${Math.round(displayValue)}%`}
        </span>
        {label && <span className="text-sm font-medium text-zinc-500 mt-1 uppercase tracking-wider">{label}</span>}
        {!isNa && (
          <Badge variant="secondary" className={`mt-2 ${
            value > 60 ? 'bg-rose-100 text-rose-700' : 
            value > 30 ? 'bg-amber-100 text-amber-700' : 
            'bg-teal-100 text-teal-700'
          }`}>
            {statusText}
          </Badge>
        )}
      </div>
    </div>
  );
};

const StatItem = ({ icon: Icon, label, value, subtext }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/40 border border-white/60 shadow-sm transition-all hover:bg-white/60">
    <div className="p-2 text-zinc-600">
      <Icon size={20} />
    </div>
    <div className="flex flex-col">
      <span className="text-[13px] font-medium text-zinc-500 uppercase tracking-winder">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-semibold text-zinc-800">{value ?? 'N/A'}</span>
        {subtext && value != null && <span className="text-xs font-medium text-zinc-500">{subtext}</span>}
      </div>
    </div>
  </div>
);

export function DashboardStats({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (USE_MOCK_DATA) {
        setTimeout(() => {
          setData(MOCK_ASSESSMENT);
          setLoading(false);
        }, 500);
        return;
      }

      try {
        const { data: records, error } = await supabase
          .from('health_records')
          .select('value')
          .eq('user_id', user.id)
          .eq('record_type', 'assessment')
          .order('recorded_at', { ascending: false })
          .limit(1);

        if (error) throw error;
        if (records && records.length > 0) {
          setData(records[0].value);
        } else {
          setData(null);
        }
      } catch (err) {
        console.error("Error fetching assessment:", err);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    if (user?.id) {
      fetchStats();
    }
  }, [user]);

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Patient';

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6 animate-in fade-in duration-700">
        <p className="text-zinc-500 animate-pulse text-sm">Loading assessment data...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 animate-in fade-in zoom-in-95 duration-700 overflow-y-auto">
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        
        {/* HERO SECTION */}
        <div className="flex flex-col gap-4">
          <Card className="bg-white/40 backdrop-blur-xl border-white/50 shadow-xl overflow-hidden rounded-2xl">
            {/* Top Profile Strip */}
            <div className="bg-gradient-to-r from-zinc-50/80 via-white/50 to-zinc-50/30 px-6 py-5 flex items-center justify-between border-b border-white/40">
              <div className="flex items-center gap-3">
                <div className="p-2 text-zinc-500">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg tracking-tight text-zinc-800" style={{ fontFamily: 'var(--font-heading)' }}>{displayName}</h3>
                  <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-500">
                    <span className="uppercase tracking-wider">Age: {data?.Age ?? 'N/A'}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300" />
                    <span className="uppercase tracking-wider">Sex: {data?.Sex ?? 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bottom Gauge Area */}
            <CardContent className="pt-8 pb-10 flex flex-col items-center justify-center">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-zinc-800" style={{ fontFamily: 'var(--font-heading)' }}>Heart Health Probability</h2>
                <p className="text-sm text-zinc-500">Based on your latest assessment</p>
              </div>
              <CircularProgress 
                value={data?.HeartDisease} 
                size={220} 
                strokeWidth={18} 
              />
            </CardContent>
          </Card>
        </div>

        {/* VITALS & CLINICAL SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Vitals */}
          <Card className="bg-white/40 backdrop-blur-xl border-white/50 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-zinc-800" style={{ fontFamily: 'var(--font-heading)' }}>Vitals Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <StatItem 
                icon={Heart} 
                label="Resting BP" 
                value={data?.RestingBP} 
                subtext="mm Hg" 
              />
              <StatItem 
                icon={Activity} 
                label="Max Heart Rate" 
                value={data?.MaxHR} 
                subtext="bpm" 
              />
              <StatItem 
                icon={Droplet} 
                label="Cholesterol" 
                value={data?.Cholesterol} 
                subtext="mm/dl" 
              />
              <StatItem 
                icon={Apple} 
                label="Fasting BS" 
                value={data?.FastingBS != null ? (data.FastingBS === 1 ? '> 120' : 'Normal') : null} 
                subtext={data?.FastingBS != null ? "mg/dl" : null}
              />
            </CardContent>
          </Card>

          {/* Card 2: Clinical */}
          <Card className="bg-white/40 backdrop-blur-xl border-white/50 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-zinc-800" style={{ fontFamily: 'var(--font-heading)' }}>Clinical Indicators</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <StatItem 
                icon={Stethoscope} 
                label="Chest Pain Type" 
                value={data?.ChestPainType ? STATS_MAP.ChestPainType[data.ChestPainType] || data.ChestPainType : null} 
                subtext={data?.ExerciseAngina === 'Y' ? '(Exercise Angina: Yes)' : data?.ExerciseAngina === 'N' ? '(Exercise Angina: No)' : null}
              />
              <StatItem 
                icon={HeartPulse} 
                label="Resting ECG" 
                value={data?.RestingECG} 
              />
              <StatItem 
                icon={ActivitySquare} 
                label="ST Segment Slope" 
                value={data?.ST_Slope ? STATS_MAP.ST_Slope[data.ST_Slope] || data.ST_Slope : null} 
                subtext={data?.Oldpeak != null ? `(Oldpeak: ${data.Oldpeak})` : null}
              />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

export default DashboardStats;
