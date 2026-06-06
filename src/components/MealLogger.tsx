import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Upload, 
  FileText, 
  X, 
  Sparkles, 
  Activity, 
  Plus, 
  Check, 
  RotateCcw, 
  AlertCircle,
  HelpCircle,
  Calendar
} from 'lucide-react';
import { FoodLog, NutritionAnalysisResult } from '../types';

// Helper function to compress images client-side to prevent Firestore 1MB document limit issues
function compressImage(base64Str: string, maxWidth = 300, quality = 0.5): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Str);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Compress using quality 0.5 and conversion to JPEG (highly space-efficient)
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      } catch (err) {
        console.error('Error compressing image:', err);
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}

interface MealLoggerProps {
  currentGoal: string;
  onLogMeal: (mealInfo: Omit<FoodLog, 'id' | 'userId' | 'createdAt'>, dateStr: string) => Promise<void>;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export default function MealLogger({ currentGoal, onLogMeal, onClose, theme }: MealLoggerProps) {
  // Modes: 'choice' | 'camera' | 'upload' | 'text'
  const [mode, setMode] = useState<'choice' | 'camera' | 'upload' | 'text'>('choice');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [dateString, setDateString] = useState<string>(new Date().toISOString().split('T')[0]);

  // Loading screen states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatusIndex, setAnalysisStatusIndex] = useState(0);

  // Manual values correction modal
  const [result, setResult] = useState<NutritionAnalysisResult | null>(null);
  const [editedFoodName, setEditedFoodName] = useState('');
  const [editedCalories, setEditedCalories] = useState<number>(0);
  const [editedProtein, setEditedProtein] = useState<number>(0);
  const [editedCarbs, setEditedCarbs] = useState<number>(0);
  const [editedFat, setEditedFat] = useState<number>(0);
  const [editedIngredients, setEditedIngredients] = useState<string[]>([]);
  const [newIngredientWord, setNewIngredientWord] = useState('');

  // Source inputs
  const [textDescription, setTextDescription] = useState('');
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [selectedImageMime, setSelectedImageMime] = useState<string>('image/jpeg');
  
  // Camera variables
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reassuring status messages
  const statusCycle = [
    "Establishing secure server connection...",
    "Uploading visual dimensions to Gemini...",
    "Gemini is analyzing plate contours and texture models...",
    "Computing ingredients, density, and protein coefficients...",
    "Calibrating macronutrients against your lean goals...",
    "Finalizing plate recipe profile..."
  ];

  // Rotate reassuring status messages
  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setAnalysisStatusIndex((prev) => (prev + 1) % statusCycle.length);
      }, 3000);
    } else {
      setAnalysisStatusIndex(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Handle Camera activation
  const startCamera = async () => {
    setCameraError('');
    setMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // outer camera for mobiles
        audio: false
      });
      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    } catch (err: any) {
      console.error("Camera connection failed:", err);
      setCameraError("Unable to access camera. Please confirm frame permissions or choose Upload from Gallery.");
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [videoStream]);

  // Capture frame from local camera
  const captureFrame = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const rawBase64 = canvas.toDataURL('image/jpeg', 0.85);
        try {
          const compressed = await compressImage(rawBase64, 300, 0.5);
          setSelectedImageBase64(compressed);
        } catch (e) {
          setSelectedImageBase64(rawBase64);
        }
        setSelectedImageMime('image/jpeg');
        
        // Stop viewfinder streams
        stopCamera();
        setMode('upload'); // Transition to confirm state
      }
    }
  };

  // Drag-and-drop and gallery manual upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Please upload a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        try {
          const compressed = await compressImage(reader.result, 300, 0.5);
          setSelectedImageBase64(compressed);
          setSelectedImageMime('image/jpeg');
          setMode('upload');
        } catch (e) {
          setSelectedImageBase64(reader.result);
          setSelectedImageMime(file.type);
          setMode('upload');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Image analysis API router call
  const triggerImageAnalysis = async () => {
    if (!selectedImageBase64) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Data: selectedImageBase64,
          mimeType: selectedImageMime,
          currentGoal: currentGoal
        })
      });

      if (!res.ok) {
        const errObj = await res.json();
        throw new Error(errObj.error || "Analysis response failed.");
      }

      const parsed: NutritionAnalysisResult = await res.json();
      loadAnalysisIntoEditor(parsed);
    } catch (err: any) {
      console.error(err);
      alert(`Nutrition Analysis failed: ${err.message}. Please try again or type description manually.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Text analysis API router call
  const triggerTextAnalysis = async () => {
    if (!textDescription.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textDescription,
          currentGoal: currentGoal
        })
      });

      if (!res.ok) {
        const errObj = await res.json();
        throw new Error(errObj.error || "Analysis response failed.");
      }

      const parsed: NutritionAnalysisResult = await res.json();
      loadAnalysisIntoEditor(parsed);
    } catch (err: any) {
      console.error(err);
      alert(`Text analysis failed: ${err.message}. Please try simpler words.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadAnalysisIntoEditor = (data: NutritionAnalysisResult) => {
    setResult(data);
    setEditedFoodName(data.foodName);
    setEditedCalories(data.calories);
    setEditedProtein(data.protein);
    setEditedCarbs(data.carbs);
    setEditedFat(data.fat);
    setEditedIngredients(data.ingredients || []);
  };

  // Edit list of ingredients during validation step
  const handleAddIngredient = () => {
    if (newIngredientWord.trim()) {
      setEditedIngredients([...editedIngredients, newIngredientWord.trim()]);
      setNewIngredientWord('');
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setEditedIngredients(editedIngredients.filter((_, i) => i !== index));
  };

  // Trigger main log handler
  const handleConfirmAndLog = async () => {
    const finalLog = {
      foodName: editedFoodName || "Scanned Meal",
      mealType,
      calories: Math.max(0, Number(editedCalories)),
      protein: Math.max(0, Number(editedProtein)),
      carbs: Math.max(0, Number(editedCarbs)),
      fat: Math.max(0, Number(editedFat)),
      ingredients: editedIngredients,
      imageUrl: selectedImageBase64 || undefined,
      loggedAt: new Date(dateString + 'T12:00:00Z').toISOString() // mid-day default for accuracy
    };

    try {
      await onLogMeal(finalLog, dateString);
      onClose();
    } catch (e) {
      console.error("Failed storing log:", e);
      alert("Failed storing log in database. Please check rules permissions.");
    }
  };

  return (
    <div id="logger-modal-veil" className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      
      {/* Loading Modal Overlay */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white dark:bg-slate-900 z-50 flex flex-col items-center justify-center p-8 text-center transition-colors duration-300"
          >
            <div className="w-16 h-16 border-4 border-slate-100 dark:border-slate-800 border-t-emerald-600 rounded-full animate-spin mb-8"></div>
            
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 font-sans">
              Analyzing Nutritional Intake...
            </h3>
            
            <motion.div
              key={analysisStatusIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold h-12 max-w-md mx-auto"
            >
              {statusCycle[analysisStatusIndex]}
            </motion.div>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 max-w-xs font-mono">
              Powered by server-side Gemini 3.5-Flash
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        id="logger-card"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-955/25 border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[90vh] transition-colors duration-300"
      >
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 font-sans text-base">
              {result ? "Calibrate Your Meal Metrics" : "Log Daily Intake"}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
              TARGET GOAL: {currentGoal.toUpperCase()}
            </p>
          </div>
          <button 
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div 
                key="input-stage"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {/* Meta Selectors (Meal Type & Date) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1">
                      <Activity size={10} /> Meal Category
                    </label>
                    <select
                      value={mealType}
                      onChange={(e) => setMealType(e.target.value as any)}
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1">
                      <Calendar size={10} /> Meal Date
                    </label>
                    <input
                      type="date"
                      value={dateString}
                      onChange={(e) => setDateString(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Main Capture choice pane */}
                {mode === 'choice' && (
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={startCamera}
                      className="w-full h-24 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900/50 hover:border-emerald-200 rounded-2xl flex items-center gap-4 px-6 cursor-pointer text-left transition-all group"
                    >
                      <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                        <Camera size={22} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-400">Snap Photo via Device Camera</h4>
                        <p className="text-xs text-emerald-650 dark:text-emerald-500 mt-0.5">Focus your camera on the plate. Works best on mobiles.</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setMode('upload')}
                      className="w-full h-18 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-750 rounded-2xl flex items-center gap-4 px-6 cursor-pointer text-left transition-all"
                    >
                      <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                        <Upload size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Upload from Photo Gallery</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Select a pre-existing food photo from your system storage.</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setMode('text')}
                      className="w-full h-18 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-750 rounded-2xl flex items-center gap-4 px-6 cursor-pointer text-left transition-all"
                    >
                      <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                        <FileText size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Log via Text Description</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Type what you had manually, e.g. "protein bowl and dates".</p>
                      </div>
                    </button>
                  </div>
                )}

                {/* Viewfinder Cam Mode */}
                {mode === 'camera' && (
                  <div className="space-y-4">
                    <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center">
                      {cameraError ? (
                        <div className="text-center p-6 text-slate-450 z-10 max-w-xs">
                          <AlertCircle size={32} className="mx-auto text-rose-500 mb-2" />
                          <p className="text-xs font-medium leading-normal">{cameraError}</p>
                          <button
                            onClick={() => setMode('choice')}
                            className="text-xs text-emerald-600 font-bold underline mt-4 cursor-pointer"
                          >
                            Return to Choices
                          </button>
                        </div>
                      ) : (
                        <video 
                          ref={videoRef}
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                      )}
                      
                      <canvas ref={canvasRef} className="hidden" />
                    </div>

                    {!cameraError && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            stopCamera();
                            setMode('choice');
                          }}
                          className="flex-1 h-11 border border-slate-200 text-slate-600 text-xs font-medium rounded-xl hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={captureFrame}
                          className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-100"
                        >
                          <Camera size={14} /> Capture Food Snap
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* File Upload Mode */}
                {mode === 'upload' && (
                  <div className="space-y-4">
                    {selectedImageBase64 ? (
                      <div className="space-y-4">
                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                          <img 
                            src={selectedImageBase64} 
                            alt="Scanned Food" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            onClick={() => {
                              setSelectedImageBase64(null);
                            }}
                            className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white cursor-pointer"
                          >
                            <RotateCcw size={14} />
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setMode('choice')}
                            className="flex-1 h-11 border border-slate-200 text-slate-600 text-xs font-medium rounded-xl hover:bg-slate-50 cursor-pointer"
                          >
                            Change Type
                          </button>
                          <button
                            onClick={triggerImageAnalysis}
                            className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Sparkles size={14} /> Trigger AI Analysis
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const file = e.dataTransfer.files?.[0];
                          if (file) processSelectedFile(file);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-400 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100/50 dark:hover:bg-slate-850 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200"
                      >
                        <Upload className="mx-auto text-slate-400 dark:text-slate-500 mb-3" size={32} />
                        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Drag & Drop Food Photo Here</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">Or click to select files from your gallery structure.</p>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Text Logging Mode */}
                {mode === 'text' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                        Describe What You Ate
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g., Two scrambled eggs, a cup of low fat Greek yogurt, a handfull of dry blueberries and 10 almonds"
                        value={textDescription}
                        onChange={(e) => setTextDescription(e.target.value)}
                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-805 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 leading-normal"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setMode('choice')}
                        className="flex-1 h-11 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 text-xs font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Change Type
                      </button>
                      <button
                        onClick={triggerTextAnalysis}
                        disabled={!textDescription.trim()}
                        className="flex-1 h-11 bg-slate-900 dark:bg-slate-850 disabled:bg-slate-300 dark:disabled:bg-slate-900/40 hover:bg-slate-805 dark:hover:bg-slate-750 text-white disabled:text-slate-400 dark:disabled:text-slate-600 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Sparkles size={14} /> Analyze Log Words
                      </button>
                    </div>
                  </div>
                )}

              </motion.div>
            ) : (
              // RESULT CONFIRMATION VIEW
              <motion.div 
                key="result-confirmation"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5"
              >
                {/* Image overview if present */}
                {selectedImageBase64 && (
                  <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                    <img 
                      src={selectedImageBase64} 
                      alt="Captured Plate" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Subtitle Warning */}
                <div className="flex items-start gap-2.5 bg-sky-50/50 border border-sky-100 p-3.5 rounded-2xl text-[11px] text-sky-800 leading-normal">
                  <HelpCircle size={15} className="shrink-0 text-sky-600 mt-0.5" />
                  <p>
                    Gemini has parsed your plate. Examine and calibrate target calorie and macromolecule estimates below to keep your data 100% accurate.
                  </p>
                </div>

                {/* Food Name input */}
                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 mb-1">
                    Meal Description / Label
                  </label>
                  <input
                    type="text"
                    value={editedFoodName}
                    onChange={(e) => setEditedFoodName(e.target.value)}
                    className="w-full h-11 px-4 border border-slate-200 rounded-2xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Nutrient grid overrides */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                    <label className="block text-[9px] uppercase font-mono font-bold tracking-wider text-slate-400 mb-1">
                      Calories
                    </label>
                    <input
                      type="number"
                      value={editedCalories}
                      onChange={(e) => setEditedCalories(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-center font-bold text-slate-800 bg-transparent text-sm focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-400 font-mono">kcal</span>
                  </div>

                  <div className="p-3 bg-rose-50/20 border border-rose-100/50 rounded-xl text-center">
                    <label className="block text-[9px] uppercase font-mono font-bold tracking-wider text-rose-500 mb-1">
                      Protein
                    </label>
                    <input
                      type="number"
                      value={editedProtein}
                      onChange={(e) => setEditedProtein(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-center font-bold text-slate-800 bg-transparent text-sm focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-400 font-mono">grams</span>
                  </div>

                  <div className="p-3 bg-amber-50/20 border border-amber-100/50 rounded-xl text-center">
                    <label className="block text-[9px] uppercase font-mono font-bold tracking-wider text-amber-600 mb-1">
                      Carbs
                    </label>
                    <input
                      type="number"
                      value={editedCarbs}
                      onChange={(e) => setEditedCarbs(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-center font-bold text-slate-800 bg-transparent text-sm focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-400 font-mono">grams</span>
                  </div>

                  <div className="p-3 bg-sky-50/20 border border-sky-100/50 rounded-xl text-center">
                    <label className="block text-[9px] uppercase font-mono font-bold tracking-wider text-sky-600 mb-1">
                      Fat
                    </label>
                    <input
                      type="number"
                      value={editedFat}
                      onChange={(e) => setEditedFat(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-center font-bold text-slate-800 bg-transparent text-sm focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-400 font-mono">grams</span>
                  </div>
                </div>

                {/* Sub-components breakdown */}
                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 mb-1.5">
                    Ingredients Breakdown ({editedIngredients.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl min-h-12">
                    {editedIngredients.length === 0 ? (
                      <span className="text-slate-400 text-xs italic">No components configured.</span>
                    ) : (
                      editedIngredients.map((item, id) => (
                        <div 
                          key={id}
                          className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-xs rounded-lg flex items-center gap-1 font-medium shadow-2xs"
                        >
                          <span>{item}</span>
                          <button 
                            onClick={() => handleRemoveIngredient(id)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Append component box */}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Add another ingredient keyword..."
                      value={newIngredientWord}
                      onChange={(e) => setNewIngredientWord(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddIngredient();
                        }
                      }}
                      className="flex-1 h-9 px-3 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={handleAddIngredient}
                      className="h-9 w-9 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Confirm operations panel */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setResult(null);
                      setSelectedImageBase64(null);
                      setMode('choice');
                    }}
                    className="flex-1 h-11 border border-slate-250 text-slate-600 text-xs font-semibold rounded-2xl hover:bg-slate-50 cursor-pointer"
                  >
                    Reset Scans
                  </button>
                  <button
                    onClick={handleConfirmAndLog}
                    className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-100"
                  >
                    <Check size={14} /> Confirm & Commit Log
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </motion.div>
    </div>
  );
}
