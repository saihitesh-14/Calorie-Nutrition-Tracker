import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  auth, 
  testConnectionOnBoot, 
  getUserProfile, 
  saveUserProfile, 
  getFoodLogs, 
  addFoodLog, 
  deleteFoodLog, 
  logUserOut 
} from './lib/firebase';
import { UserProfile, FoodLog } from './types';
import LoginView from './components/LoginView';
import OnboardingForm from './components/OnboardingForm';
import DashboardView from './components/DashboardView';
import MealLogger from './components/MealLogger';

export default function App() {
  // Theme state: light or dark
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('nutriflow-theme') as 'light' | 'dark') || 'light';
  });

  // Auth state monitoring
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  
  // Loading transitions
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Overlay trigger toggles
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);

  // Theme Sync on load & toggle
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('nutriflow-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // 1. Initial Connection Validation and Auth Listener on Boot
  useEffect(() => {
    // Run mandatory connection testing
    testConnectionOnBoot();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsDataLoading(true);
        try {
          // Fetch user profile from Firestore db
          const existingProfile = await getUserProfile(currentUser.uid);
          setProfile(existingProfile);

          if (existingProfile) {
            // Load logs
            const userLogs = await getFoodLogs(currentUser.uid);
            setLogs(userLogs);
          }
        } catch (e) {
          console.error("Failed loading data on initialization:", e);
        } finally {
          setIsDataLoading(false);
          setIsAuthLoading(false);
        }
      } else {
        setProfile(null);
        setLogs([]);
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Onboarding completion logic
  const handleOnboardingComplete = async (newProfile: UserProfile) => {
    if (!user) return;
    setIsDataLoading(true);
    try {
      await saveUserProfile(user.uid, newProfile);
      setProfile(newProfile);
      
      // Load initially logged meals (will be empty)
      const userLogs = await getFoodLogs(user.uid);
      setLogs(userLogs);
    } catch (e) {
      console.error("Error committing onboarding settings:", e);
    } finally {
      setIsDataLoading(false);
    }
  };

  // 3. User request resetting onboarding metrics
  const handleResetOnboarding = () => {
    setProfile(null); // Triggers Onboarding wrapper display
  };

  // 4. Meal logging committer
  const handleLogMeal = async (
    mealInfo: Omit<FoodLog, 'id' | 'userId' | 'createdAt'>, 
    dateStr: string
  ) => {
    if (!user) return;
    setIsActionLoading(true);
    try {
      const generatedId = 'log_' + Math.random().toString(36).substring(2, 11);
      const newLog: FoodLog = {
        id: generatedId,
        userId: user.uid,
        ...mealInfo,
        loggedAt: mealInfo.loggedAt,
        createdAt: new Date().toISOString()
      };

      // Store in firestore db
      await addFoodLog(user.uid, newLog);

      // Reload state list from Firestore securely
      const updatedLogs = await getFoodLogs(user.uid);
      setLogs(updatedLogs);
    } catch (e) {
      console.error("Failed adding meals:", e);
      throw e;
    } finally {
      setIsActionLoading(false);
    }
  };

  // 5. Delete specific log
  const handleDeleteLog = async (logId: string) => {
    if (!user) return;
    setIsActionLoading(true);
    try {
      await deleteFoodLog(user.uid, logId);
      
      // Reload secure Firestore logs list
      const updatedLogs = await getFoodLogs(user.uid);
      setLogs(updatedLogs);
    } catch (e) {
      console.error("Failed removing food record:", e);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logUserOut();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  // Global Loader wrapper
  if (isAuthLoading || isDataLoading) {
    return (
      <div id="boot-loader" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center transition-colors duration-300">
        <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-800 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-4 uppercase tracking-wider">Synchronizing NutriFlow Sync Engine...</p>
      </div>
    );
  }

  // Phase A: Anonymous login hero view
  if (!user) {
    return (
      <LoginView 
        onLoginSuccess={(signedUser) => setUser(signedUser)} 
        isLoading={isActionLoading}
        setIsLoading={setIsActionLoading}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // Phase B: Interactive Onboarding details setting
  if (!profile) {
    return (
      <OnboardingForm 
        userId={user.uid} 
        onComplete={handleOnboardingComplete} 
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // Phase C: Main Desktop/Mobile dashboard
  return (
    <div id="app-root-frame" className="relative min-h-screen transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <DashboardView 
        profile={profile}
        logs={logs}
        onAddNewMeal={() => setIsLoggerOpen(true)}
        onDeleteLog={handleDeleteLog}
        onResetOnboarding={handleResetOnboarding}
        onLogout={handleLogout}
        userEmail={user.email || "Active User"}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Overlay modal to add logs */}
      {isLoggerOpen && (
        <MealLogger 
          currentGoal={profile.goal}
          onLogMeal={handleLogMeal}
          onClose={() => setIsLoggerOpen(false)}
          theme={theme}
        />
      )}
    </div>
  );
}
