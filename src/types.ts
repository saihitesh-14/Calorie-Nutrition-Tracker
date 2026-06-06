export interface UserProfile {
  userId: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  height: number; // in cm
  weight: number; // in kg
  goal: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  updatedAt: string;
}

export interface FoodIngredient {
  name: string;
  amount?: string;
  calories?: number;
}

export interface FoodLog {
  id: string;
  userId: string;
  foodName: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients?: string[];
  imageUrl?: string;
  loggedAt: string; // ISO date string
  createdAt: string; // ISO date string
}

export interface NutritionAnalysisResult {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
}
