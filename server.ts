import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load local .env if available
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Lazy-loaded Gemini AI client to prevent startup failures on missing API keys
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please add it in the Secrets panel of AI Studio.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

async function startServer() {
  const app = express();

  // Allow larger JSON bodies for base64 food photograph uploads
  app.use(express.json({ limit: "15mb" }));

  // API - Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API - Analyze Food Image using multimodal gemini-3.5-flash
  app.post("/api/analyze-food", async (req, res) => {
    try {
      const { base64Data, mimeType, currentGoal } = req.body;
      if (!base64Data || !mimeType) {
        res.status(400).json({ error: "Missing image base64Data or mimeType" });
        return;
      }

      const ai = getGeminiClient();
      
      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");

      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64,
        },
      };

      const systemPrompt = `You are an expert nutritional research assistant and dietitian. 
Analyze the image of the food. Break it down scientifically. 
Estimate the calories (in kcal) and macronutrients (protein, carbs, fat in grams) for the entire portion shown inside the frame.
Focus on user's current fitness goal: "${currentGoal || "get lean"}". Specify key ingredients or visuable toppings.
Generate highly accurate and conservative estimates. Deliver the results in a precise JSON schema format.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          imagePart,
          { text: "Estimate calories, macros, and provide ingredients list for this meal." }
        ],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              foodName: {
                type: Type.STRING,
                description: "Name of the primary meal item or items detected."
              },
              calories: {
                type: Type.INTEGER,
                description: "Estimated total calories in kcal. Must be positive."
              },
              protein: {
                type: Type.INTEGER,
                description: "Estimated total protein content in grams. Must be positive."
              },
              carbs: {
                type: Type.INTEGER,
                description: "Estimated total carbohydrates content in grams. Must be positive."
              },
              fat: {
                type: Type.INTEGER,
                description: "Estimated total lipid fat content in grams. Must be positive."
              },
              ingredients: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of detected ingredients or constituent items categorized (max 10 items)."
              }
            },
            required: ["foodName", "calories", "protein", "carbs", "fat", "ingredients"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No text response received from Gemini.");
      }

      const parsedResult = JSON.parse(responseText);
      res.json(parsedResult);
    } catch (error: any) {
      console.error("Gemini Image Analysis Error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Internal Server Error analyzing image" 
      });
    }
  });

  // API - Analyze Food Text Description for manual insertions
  app.post("/api/analyze-text", async (req, res) => {
    try {
      const { textDescription, currentGoal } = req.body;
      if (!textDescription || textDescription.trim().length === 0) {
        res.status(400).json({ error: "Missing textDescription description" });
        return;
      }

      const ai = getGeminiClient();

      const systemPrompt = `You are an expert nutritional coach.
Analyze the user's plain text eating description (e.g. "two scrambled eggs, half an avocado and buttered sourdough toast").
Translate this description into estimated calorie count (kcal) and basic macronutrients (protein, carbs, fat in grams).
Consider user fitness goal: "${currentGoal || "get lean"}".
Create a structured JSON report.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analyze this meal description: "${textDescription}"`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              foodName: {
                type: Type.STRING,
                description: "Clean summary of the food parsed (e.g., Eggs & Avocado Toast)."
              },
              calories: {
                type: Type.INTEGER,
                description: "Total estimated calories in kcal."
              },
              protein: {
                type: Type.INTEGER,
                description: "Total protein content in grams."
              },
              carbs: {
                type: Type.INTEGER,
                description: "Total carbohydrates content in grams."
              },
              fat: {
                type: Type.INTEGER,
                description: "Total lipid fat content in grams."
              },
              ingredients: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of ingredients parsed from user text."
              }
            },
            required: ["foodName", "calories", "protein", "carbs", "fat", "ingredients"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No text response received from Gemini.");
      }

      const parsedResult = JSON.parse(responseText);
      res.json(parsedResult);
    } catch (error: any) {
      console.error("Gemini Text Analysis Error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Internal Server Error parsing description" 
      });
    }
  });

  // Integrate Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Developer Mode: Vite asset pipeline loaded into Express pipeline.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production Mode: Static SPA files registered for delivery.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server running on http://localhost:${PORT}`);
  });
}

startServer();
