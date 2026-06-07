import { createClient } from '@supabase/supabase-js';
import { UserProfile, FoodLog } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sign-in with Google OAuth (redirect-based flow)
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    console.error('Error signing in with Google:', error.message);
    throw error;
  }

  return data;
}

// User Sign-out
export async function logUserOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error.message);
    throw error;
  }
}

// ─── User Profile DB Handlers ───

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    // PGRST116 = "no rows returned" — not a real error, just means no profile yet
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching user profile:', error.message);
    throw error;
  }

  if (!data) return null;

  // Map DB columns (snake_case) → app types (camelCase)
  return {
    userId: data.id,
    gender: data.gender,
    age: data.age,
    height: data.height,
    weight: data.weight,
    goal: data.goal,
    targetCalories: data.target_calories,
    targetProtein: data.target_protein,
    targetCarbs: data.target_carbs,
    targetFat: data.target_fat,
    updatedAt: data.updated_at,
  };
}

export async function saveUserProfile(userId: string, profile: UserProfile): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      gender: profile.gender,
      age: profile.age,
      height: profile.height,
      weight: profile.weight,
      goal: profile.goal,
      target_calories: profile.targetCalories,
      target_protein: profile.targetProtein,
      target_carbs: profile.targetCarbs,
      target_fat: profile.targetFat,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) {
    console.error('Error saving user profile:', error.message);
    throw error;
  }
}

// ─── Food Logs DB Handlers ───

export async function addFoodLog(userId: string, log: FoodLog): Promise<void> {
  const { error } = await supabase
    .from('food_logs')
    .insert({
      id: log.id,
      user_id: userId,
      food_name: log.foodName,
      meal_type: log.mealType,
      calories: log.calories,
      protein: log.protein,
      carbs: log.carbs,
      fat: log.fat,
      ingredients: log.ingredients || [],
      image_url: log.imageUrl || null,
      logged_at: log.loggedAt,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error adding food log:', error.message);
    throw error;
  }
}

export async function getFoodLogs(userId: string): Promise<FoodLog[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false });

  if (error) {
    console.error('Error fetching food logs:', error.message);
    throw error;
  }

  if (!data) return [];

  // Map DB columns (snake_case) → app types (camelCase)
  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    foodName: row.food_name,
    mealType: row.meal_type,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    ingredients: row.ingredients || [],
    imageUrl: row.image_url,
    loggedAt: row.logged_at,
    createdAt: row.created_at,
  }));
}

export async function deleteFoodLog(userId: string, logId: string): Promise<void> {
  const { error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', logId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting food log:', error.message);
    throw error;
  }
}
