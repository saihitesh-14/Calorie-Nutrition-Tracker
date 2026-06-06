import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Target, Award, Dumbbell, User, Sun, Moon } from 'lucide-react';
import { UserProfile } from '../types';

interface OnboardingFormProps {
  userId: string;
  onComplete: (profile: UserProfile) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function OnboardingForm({ userId, onComplete, theme, onToggleTheme }: OnboardingFormProps) {
  const [step, setStep] = useState(1);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [age, setAge] = useState<string>('26');
  const [height, setHeight] = useState<string>('175');
  const [weight, setWeight] = useState<string>('72');
  const [goal, setGoal] = useState<string>('get lean');
  
  // Validation errors
  const [errorString, setErrorString] = useState<string>('');

  const handleNext = () => {
    setErrorString('');
    if (step === 1) {
      const parsedAge = parseInt(age);
      if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 120) {
        setErrorString('Please enter a realistic age between 10 and 120.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const parsedHeight = parseInt(height);
      const parsedWeight = parseFloat(weight);
      if (isNaN(parsedHeight) || parsedHeight < 100 || parsedHeight > 250) {
        setErrorString('Please enter a realistic height between 100cm and 250cm.');
        return;
      }
      if (isNaN(parsedWeight) || parsedWeight < 30 || parsedWeight > 250) {
        setErrorString('Please enter a realistic weight between 30kg and 250kg.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleBack = () => {
    setErrorString('');
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Calculator Core
  const calculateRequirements = (): UserProfile => {
    const numericAge = parseInt(age);
    const numericHeight = parseInt(height);
    const numericWeight = parseFloat(weight);

    // BMR via Harris-Benedict formulas
    let bmr = 10 * numericWeight + 6.25 * numericHeight - 5 * numericAge;
    if (gender === 'male') {
      bmr += 5;
    } else if (gender === 'female') {
      bmr -= 161;
    } else {
      bmr -= 78;
    }

    // Light activity level target TDEE
    const tdee = Math.round(bmr * 1.375);

    let targetCalories = tdee;
    if (goal === 'get lean') {
      targetCalories = Math.round(tdee * 0.82); // deficit
    } else if (goal === 'build muscle') {
      targetCalories = Math.round(tdee * 1.10); // surplus
    }

    // Protein: ~2.0g per kg of weight (extremely high biological protection)
    const targetProtein = Math.round(numericWeight * 2.0);
    // Fat: ~0.8g per kg of weight
    const targetFat = Math.round(numericWeight * 0.85);
    // Remaining calories allocated to carbohydrates
    // total calories = protein * 4 + fat * 9 + carb * 4
    const macroCalories = (targetProtein * 4) + (targetFat * 9);
    const remainingCalories = Math.max(200, targetCalories - macroCalories);
    const targetCarbs = Math.round(remainingCalories / 4);

    return {
      userId,
      gender,
      age: numericAge,
      height: numericHeight,
      weight: Math.round(numericWeight),
      goal,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      updatedAt: new Date().toISOString(),
    };
  };

  const handleSubmit = () => {
    const calculatedProfile = calculateRequirements();
    onComplete(calculatedProfile);
  };

  return (
    <div id="onboarding bg-wrapper" className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8 transition-colors duration-300 relative">
      
      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onToggleTheme}
          className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-white transition-all cursor-pointer shadow-xs hover:shadow-md"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div id="onboarding-card" className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl dark:shadow-none p-8 transition-colors duration-300">
        
        {/* Progress header bar */}
        <div id="onboarding-progress-header" className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-550">Step {step} of 4</span>
          </div>
          <div id="progress-meter-bar" className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div id="progress-indicator" className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }}></div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
              id="step-1-content animate"
            >
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2 font-sans flex items-center gap-2">
                <User size={24} className="text-emerald-500" /> Let's get to know you
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-sans">
                Tell us about your basic attributes. Your statistics help our system setup baseline daily energy targets.
              </p>

              {/* Gender input */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Biological Sex</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`h-11 rounded-2xl border text-sm font-medium capitalize transition-all cursor-pointer ${
                        gender === g
                          ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-805 text-slate-600 dark:text-slate-350'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age input */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Age (years)</label>
                <input
                  type="number"
                  placeholder="e.g. 26"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
              id="step-2-content animate"
            >
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2 font-sans flex items-center gap-2">
                <Dumbbell size={24} className="text-emerald-500" /> Body Metrics
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-sans">
                Please enter your height and weight metrics to calculate your Basal Metabolic Rate (BMR).
              </p>

              {/* Height input */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Height (cm)</label>
                <input
                  type="number"
                  placeholder="e.g. 175"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Weight input */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 72"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
              id="step-3-content animate"
            >
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2 font-sans flex items-center gap-2">
                <Target size={24} className="text-emerald-500" /> Choose your target
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-sans">
                What are you looking to achieve? Based on your choice, we calibrate daily calorie restrictions.
              </p>

              <div className="grid grid-cols-1 gap-4 mb-6">
                {[
                  {
                    id: 'get lean',
                    title: 'Get Lean',
                    desc: 'Calorie deficit targeting maximum abdominal fat loss while preserving skeletal muscle tissue.',
                    icon: '🔥'
                  },
                  {
                    id: 'maintenance',
                    title: 'Maintain Weight',
                    desc: 'Perfect energy balance for stable metabolic functioning and performance tracking.',
                    icon: '⚖️'
                  },
                  {
                    id: 'build muscle',
                    title: 'Build Muscle',
                    desc: 'Slight energy surplus paired with high protein synthesis for strength gains.',
                    icon: '💪'
                  }
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      goal === g.id
                        ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-2xl mt-0.5 shrink-0">{g.icon}</span>
                    <div>
                      <h4 className={`text-sm font-semibold capitalize ${goal === g.id ? 'text-emerald-900 dark:text-emerald-400 font-bold' : 'text-slate-850 dark:text-slate-100'}`}>{g.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">{g.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              id="step-4-content animate"
            >
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-450 mb-4">
                  <Award size={24} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2 font-sans">
                  Your customized blueprint
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans max-w-sm mx-auto">
                  Based on your statistics, here are your optimized baseline daily macro limits to help you <strong>{goal}</strong>:
                </p>
              </div>

              {/* Calculated Targets Overview */}
              {(() => {
                const profile = calculateRequirements();
                return (
                  <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 mb-6">
                    {/* Calorie display */}
                    <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-850 mb-4">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">Daily Caloric Target</span>
                      <strong className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">{profile.targetCalories}</strong>
                      <span className="text-slate-500 dark:text-slate-400 font-medium text-xs font-mono ml-1">kcal</span>
                    </div>

                    {/* Macros Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl">
                        <span className="text-[10px] font-semibold text-rose-500 block uppercase tracking-wider font-mono">Protein</span>
                        <strong className="text-lg font-bold text-slate-800 dark:text-slate-100 block mt-1">{profile.targetProtein}g</strong>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">4 kcal/g</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl">
                        <span className="text-[10px] font-semibold text-amber-500 block uppercase tracking-wider font-mono">Carbs</span>
                        <strong className="text-lg font-bold text-slate-800 dark:text-slate-100 block mt-1">{profile.targetCarbs}g</strong>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">4 kcal/g</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl">
                        <span className="text-[10px] font-semibold text-sky-550 block uppercase tracking-wider font-mono">Fats</span>
                        <strong className="text-lg font-bold text-slate-800 dark:text-slate-100 block mt-1">{profile.targetFat}g</strong>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">9 kcal/g</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error notification banner */}
        {errorString && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-50 border border-red-100 rounded-xl mb-6 text-xs text-red-650 text-center font-medium"
          >
            {errorString}
          </motion.div>
        )}

        {/* Navigation Action Buttons footer */}
        <div id="onboarding-actions" className="flex items-center justify-between gap-3 mt-8">
          {step > 1 && step < 4 && (
            <button
              onClick={handleBack}
              className="px-4 h-11 border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center gap-1.5 text-sm hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
          )}

          <div className="flex-1"></div>

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-5 h-11 bg-slate-900 text-white rounded-xl flex items-center justify-center gap-1.5 text-sm font-medium hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <span>Continue</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <div className="flex w-full gap-3">
              <button
                onClick={() => setStep(3)}
                className="px-4 h-11 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Change Target
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 h-11 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 cursor-pointer transition-colors"
              >
                Let's Begin Tracking!
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
