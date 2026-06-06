import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  LogOut, 
  User, 
  Flame, 
  Info,
  Calendar,
  Apple,
  TrendingUp,
  TrendingDown,
  Award,
  Check,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';
import { UserProfile, FoodLog } from '../types';

interface DashboardViewProps {
  profile: UserProfile;
  logs: FoodLog[];
  onAddNewMeal: () => void;
  onDeleteLog: (logId: string) => Promise<void>;
  onResetOnboarding: () => void;
  onLogout: () => void;
  userEmail: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function DashboardView({
  profile,
  logs,
  onAddNewMeal,
  onDeleteLog,
  onResetOnboarding,
  onLogout,
  userEmail,
  theme,
  onToggleTheme
}: DashboardViewProps) {
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<FoodLog | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  // Group logs of selected date
  const filteredLogs = logs.filter(log => {
    // Keep format YYYY-MM-DD
    const logDate = log.loggedAt.split('T')[0];
    return logDate === selectedDateFilter;
  });

  // Daily totals calculations
  const totalCalories = filteredLogs.reduce((acc, log) => acc + log.calories, 0);
  const totalProtein = filteredLogs.reduce((acc, log) => acc + log.protein, 0);
  const totalCarbs = filteredLogs.reduce((acc, log) => acc + log.carbs, 0);
  const totalFat = filteredLogs.reduce((acc, log) => acc + log.fat, 0);

  // Calibration bounds %
  const caloriePercent = Math.min(100, Math.round((totalCalories / profile.targetCalories) * 100));
  const proteinPercent = Math.min(100, Math.round((totalProtein / profile.targetProtein) * 100));
  const carbsPercent = Math.min(100, Math.round((totalCarbs / profile.targetCarbs) * 100));
  const fatPercent = Math.min(100, Math.round((totalFat / profile.targetFat) * 100));

  // Build last 7 days chart data dynamically
  const chartData = (() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      // Calculate totals for this day
      const dayLogs = logs.filter(l => l.loggedAt.split('T')[0] === dateStr);
      const dayCalories = dayLogs.reduce((sum, item) => sum + item.calories, 0);

      // Formatted date label, e.g. "Jun 03"
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      data.push({
        dateStr,
        name: label,
        Calories: dayCalories,
        Target: profile.targetCalories
      });
    }
    return data;
  })();

  // Partition current date logs by meal category
  const mealCategories: { name: string; type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; color: string; icon: string }[] = [
    { name: 'Breakfast', type: 'breakfast', color: 'border-rose-100 bg-rose-50/20 text-rose-700', icon: '🥑' },
    { name: 'Lunch', type: 'lunch', color: 'border-amber-100 bg-amber-50/20 text-amber-700', icon: '🥪' },
    { name: 'Dinner', type: 'dinner', color: 'border-emerald-100 bg-emerald-50/20 text-emerald-700', icon: '🥩' },
    { name: 'Snacks & Extras', type: 'snack', color: 'border-sky-100 bg-sky-50/20 text-sky-700', icon: '🍿' }
  ];

  return (
    <div id="dashboard-wrapper" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans pb-16 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Upper Navigation bar */}
      <header id="main-nav" className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 shrink-0 shadow-xs transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
              <Apple size={20} />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 dark:text-slate-50 leading-none text-base">NutriFlow</h1>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">SECURE SYNC ACTIVE</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden leading-none md:flex flex-col text-right">
              <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">{userEmail}</span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono uppercase mt-0.5">Lean Target Calibrated</span>
            </span>

            {/* In-app theme mode switch button */}
            <button
              onClick={onToggleTheme}
              className="h-9 w-9 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-white transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <button
              onClick={onLogout}
              className="h-9 w-9 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-white transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Upper Metrics Grid block (Responsive Bento) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Bento Card 1: Main Calorie Progress wheel */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-150/70 dark:border-slate-800 p-6 rounded-3xl shadow-xs flex flex-col justify-between transition-colors duration-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm">Caloric Balance</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">TODAY'S METRIC REPORT</p>
              </div>
              <input
                type="date"
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="h-8 px-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-650 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Middle Calorie Dials */}
            <div className="flex items-center gap-6 py-2">
              <div id="radial-progress" className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                {/* SVG Progress Circle */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    className="stroke-slate-100 dark:stroke-slate-800"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    className="stroke-emerald-500 transition-all duration-500"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 48}
                    strokeDashoffset={2 * Math.PI * 48 * (1 - caloriePercent / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                {/* Text inside */}
                <div className="absolute text-center leading-none">
                  <span className="text-2xl font-extrabold text-slate-850 dark:text-slate-50">{caloriePercent}%</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block mt-0.5">filled</span>
                </div>
              </div>

              <div className="space-y-1.5 flex-1">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 block uppercase font-mono">Calories Consumed</span>
                  <strong className="text-3xl font-black text-slate-850 dark:text-slate-50">{totalCalories}</strong>
                  <span className="text-xs text-slate-400 dark:text-slate-550 font-mono font-medium ml-1">kcal</span>
                </div>
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 dark:text-slate-500 font-medium">Daily Budget:</span>
                  <strong className="text-slate-700 dark:text-slate-300 font-bold">{profile.targetCalories} kcal</strong>
                </div>
              </div>
            </div>

            {/* Goal recommendation banner */}
            <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-start gap-2.5 text-xs text-slate-650 dark:text-slate-350 leading-normal transition-colors duration-300">
              <Flame size={15} className="text-emerald-500 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span>You chose a target to <strong>{profile.goal}</strong>. </span>
                {totalCalories > profile.targetCalories ? (
                  <span className="text-rose-500 font-semibold">You have exceeded your daily limit. Slow down calorie intake.</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Keep tracking meals to hit nutritional guidelines.</span>
                )}
              </div>
            </div>
          </div>

          {/* Bento Card 2: Macronutrients limits */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-150/70 dark:border-slate-800 p-6 rounded-3xl shadow-xs flex flex-col justify-between transition-colors duration-300">
            <div>
              <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm">Macronutrient Dials</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">BALANCED MACROS TARGET</p>
            </div>

            {/* Macro bars list */}
            <div className="space-y-4 my-4">
              {/* Protein bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Protein</span>
                  </div>
                  <span className="text-[10px] text-slate-450 dark:text-slate-400 font-mono">
                    <strong className="text-slate-800 dark:text-slate-200">{totalProtein}g</strong> / {profile.targetProtein}g
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full transition-all duration-300" style={{ width: `${proteinPercent}%` }}></div>
                </div>
              </div>

              {/* Carbs bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Carbohydrates</span>
                  </div>
                  <span className="text-[10px] text-slate-450 dark:text-slate-400 font-mono">
                    <strong className="text-slate-800 dark:text-slate-200">{totalCarbs}g</strong> / {profile.targetCarbs}g
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${carbsPercent}%` }}></div>
                </div>
              </div>

              {/* Fats bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Lipids / Fat</span>
                  </div>
                  <span className="text-[10px] text-slate-450 dark:text-slate-400 font-mono">
                    <strong className="text-slate-800 dark:text-slate-200">{totalFat}g</strong> / {profile.targetFat}g
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full transition-all duration-300" style={{ width: `${fatPercent}%` }}></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono border-t border-slate-100 dark:border-slate-800 pt-3">
              <span>Goal: high protein protecting mass</span>
              <span className="text-emerald-500 font-semibold uppercase">Clean Plan</span>
            </div>
          </div>

          {/* Bento Card 3: Profile attributes */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-150/70 dark:border-slate-800 p-6 rounded-3xl shadow-xs flex flex-col justify-between transition-colors duration-300">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono">User Settings</span>
                <h3 className="font-bold text-slate-850 dark:text-slate-100 font-sans mt-0.5">Biometric Identity</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-slate-100 dark:border-slate-700">
                <User size={16} />
              </div>
            </div>

            {/* Metrics grid statistics */}
            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                <span className="text-[9px] text-slate-400 dark:text-slate-450 font-mono uppercase">Weight</span>
                <strong className="text-lg font-extrabold text-slate-800 dark:text-white block mt-0.5">{profile.weight} kg</strong>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                <span className="text-[9px] text-slate-400 dark:text-slate-450 font-mono uppercase">Height</span>
                <strong className="text-lg font-extrabold text-slate-800 dark:text-white block mt-0.5">{profile.height} cm</strong>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                <span className="text-[9px] text-slate-400 dark:text-slate-450 font-mono uppercase">Age</span>
                <strong className="text-lg font-extrabold text-slate-800 dark:text-white block mt-0.5">{profile.age} yrs</strong>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                <span className="text-[9px] text-slate-400 dark:text-slate-450 font-mono uppercase">Target Goal</span>
                <strong className="text-xs font-bold text-slate-800 dark:text-white capitalize block mt-1.5 truncate text-emerald-600 dark:text-emerald-400">{profile.goal}</strong>
              </div>
            </div>

            <button
              onClick={onResetOnboarding}
              className="w-full h-9 bg-slate-100 dark:bg-slate-950/50 hover:bg-slate-200 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-slate-200 dark:border-slate-800/80"
            >
              Reset Biometric Settings
            </button>
          </div>

        </div>
        {/* LOG MEAL BUTTON BAR */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 border border-slate-150/70 dark:border-slate-800 p-5 rounded-3xl shrink-0 transition-colors duration-300">
          <div>
            <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm font-sans">
              Ready to enrich your journal?
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-normal">
              Commit photos of breakfast, lunch, or dinner, and allow Gemini to extract nutritional counts instantly.
            </p>
          </div>
          <button
            onClick={onAddNewMeal}
            className="w-full sm:w-auto h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-100 dark:shadow-none transition-colors"
          >
            <Plus size={16} strokeWidth={2} /> Log Daily Meal
          </button>
        </div>

        {/* Dynamic Trends Graph (Middle Block) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150/70 dark:border-slate-800 rounded-3xl p-6 shadow-xs transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm">7-Day Caloric Intake Trends</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">DAILY INTAKE VS GOAL TARGET LIMITS</p>
            </div>
            
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-250/80 dark:border-slate-800 px-3 py-1 rounded-full text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold tracking-tight transition-colors duration-300">
              <TrendingUp size={10} className="text-emerald-500 shrink-0" /> METABOLIC HISTORY
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: 'none', 
                    color: '#fff',
                    fontFamily: 'sans-serif',
                    fontSize: '11px'
                  }} 
                  labelStyle={{ fontWeight: 'bold', color: '#10b981', marginBottom: '4px' }}
                />
                {/* Horizontal reference representing targeting calories */}
                <ReferenceLine 
                  y={profile.targetCalories} 
                  stroke="#ef4444" 
                  strokeDasharray="4 4" 
                  label={{ value: 'Plan Limit', fill: '#ef4444', fontSize: 9, position: 'top', fontFamily: 'monospace' }} 
                />
                <Bar 
                  dataKey="Calories" 
                  fill="#10b981" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Logs breakdown per daily meal category (Bottom Block) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
          
          {/* Section 1: Meals breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150/70 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between transition-colors duration-300">
            <div className="mb-4">
              <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm">Meal Journal Breakdown</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">LOGS RECORDED FOR {selectedDateFilter}</p>
            </div>

            {/* List by meal categories */}
            <div className="space-y-3 flex-1 min-h-[300px]">
              {mealCategories.map((cat) => {
                const categoryLogs = filteredLogs.filter(l => l.mealType === cat.type);
                const categoryCalories = categoryLogs.reduce((sum, item) => sum + item.calories, 0);

                return (
                  <div key={cat.type} className="border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden transition-all hover:shadow-xs">
                    
                    {/* Header bar */}
                    <div className="bg-slate-50/55 dark:bg-slate-950/40 px-4 py-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-850">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base shrink-0">{cat.icon}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{cat.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-450">
                        {categoryCalories} kcal total
                      </span>
                    </div>

                    {/* Content item list */}
                    <div className="divide-y divide-slate-100/60 dark:divide-slate-800/40 bg-white dark:bg-slate-900">
                      {categoryLogs.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 dark:text-slate-500 text-[11px] italic">
                          No {cat.name.toLowerCase()} items logged.
                        </div>
                      ) : (
                        categoryLogs.map((log) => (
                          <div 
                            key={log.id} 
                            onClick={() => setSelectedLogForDetails(log)}
                            className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {log.imageUrl ? (
                                <img 
                                  src={log.imageUrl} 
                                  alt="Meal log" 
                                  className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-150 dark:border-slate-800 flex items-center justify-center text-xs">
                                  🥗
                                </div>
                              )}
                              <div className="min-w-0">
                                <h4 className="font-semibold text-slate-700 dark:text-slate-200 text-xs truncate max-w-[150px]">{log.foodName}</h4>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                                  P: {log.protein}g · C: {log.carbs}g · F: {log.fat}g
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs font-mono">{log.calories} kcal</span>
                              
                              {deletingLogId === log.id ? (
                                <div className="flex items-center gap-1 bg-rose-50/50 dark:bg-rose-955/20 p-0.5 rounded-lg border border-rose-100/60 dark:border-rose-900/40" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold px-1.5 font-sans">Delete?</span>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await onDeleteLog(log.id);
                                      if (selectedLogForDetails?.id === log.id) {
                                        setSelectedLogForDetails(null);
                                      }
                                      setDeletingLogId(null);
                                    }}
                                    className="w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 transition-colors cursor-pointer shadow-xs"
                                    title="Confirm delete"
                                  >
                                    <Check size={12} strokeWidth={2.5} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingLogId(null);
                                    }}
                                    className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X size={12} strokeWidth={2.5} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingLogId(log.id);
                                  }}
                                  className="w-7 h-7 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/40 flex items-center justify-center text-slate-400 transition-all cursor-pointer"
                                  title="Delete item"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Interactive Ingredients sidebar panel / Helper metrics */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150/70 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between transition-colors duration-300">
            <div>
              <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm">Ingredients & Nutritional Extract</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">CLICK A LOG ON THE JOURNAL TO INSPECT COMPONENTS</p>
            </div>

            {selectedLogForDetails ? (
              <div className="space-y-5 my-auto py-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-105 text-sm">{selectedLogForDetails.foodName}</h4>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono uppercase bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-850/60 px-2 py-0.5 rounded-md mt-1 inline-block">
                      {selectedLogForDetails.mealType}
                    </span>
                  </div>
                  <strong className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
                    {selectedLogForDetails.calories} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">kcal</span>
                  </strong>
                </div>

                {/* Macromols breakdown summary */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-rose-50/20 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 p-2 rounded-xl">
                    <span className="text-[10px] text-rose-500 block uppercase font-mono tracking-wider">Protein</span>
                    <strong className="font-bold text-slate-740 dark:text-slate-205 mt-0.5 block">{selectedLogForDetails.protein}g</strong>
                  </div>
                  <div className="bg-amber-50/20 dark:bg-amber-955/20 border border-amber-100/50 dark:border-amber-900/30 p-2 rounded-xl">
                    <span className="text-[10px] text-amber-500 block uppercase font-mono tracking-wider">Carbs</span>
                    <strong className="font-bold text-slate-740 dark:text-slate-205 mt-0.5 block">{selectedLogForDetails.carbs}g</strong>
                  </div>
                  <div className="bg-sky-50/20 dark:bg-sky-955/20 border border-sky-100/50 dark:border-sky-900/30 p-2 rounded-xl">
                    <span className="text-[10px] text-sky-500 block uppercase font-mono tracking-wider">Fat</span>
                    <strong className="font-bold text-slate-740 dark:text-slate-205 mt-0.5 block">{selectedLogForDetails.fat}g</strong>
                  </div>
                </div>

                {/* Sub-components items box */}
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500 font-bold block mb-1.5">
                    Ingredients Detected by Gemini
                  </span>
                  <div className="flex flex-wrap gap-1.5 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl min-h-12 max-h-[160px] overflow-y-auto">
                    {selectedLogForDetails.ingredients && selectedLogForDetails.ingredients.length > 0 ? (
                      selectedLogForDetails.ingredients.map((item, key) => (
                        <span 
                          key={key} 
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-650 dark:text-slate-300 flex items-center gap-1 shadow-2xs"
                        >
                          <span className="w-1 h-1 rounded-full bg-emerald-500"></span> {item}
                        </span>
                      ))
                    ) : (
                      <p className="text-slate-450 dark:text-slate-500 text-xs italic">No detailed ingredients available for this manual log.</p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <button
                    onClick={() => setSelectedLogForDetails(null)}
                    className="text-xs text-slate-405 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 font-medium underline cursor-pointer"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-500 space-y-2 min-h-[300px]">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl flex items-center justify-center text-slate-350 dark:text-slate-500">
                  <Info size={20} />
                </div>
                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300">No Meal Selected</h4>
                <p className="text-[11px] leading-normal text-slate-400 dark:text-slate-500 max-w-xs">
                  Click on any meal card in the Journal log break-ups list to view full ingredients details.
                </p>
              </div>
            )}
          </div>

        </div>

      </main>

    </div>
  );
}
