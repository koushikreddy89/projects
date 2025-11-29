
import { GoogleGenAI, Type } from "@google/genai";
import { DiseaseResult, WeatherTip, LanguageCode } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_NAME = "gemini-2.5-flash";

const getLanguageName = (code: LanguageCode): string => {
  switch (code) {
    case 'te': return "Telugu";
    case 'hi': return "Hindi";
    case 'ta': return "Tamil";
    case 'kn': return "Kannada";
    case 'ml': return "Malayalam";
    case 'mr': return "Marathi";
    case 'bn': return "Bengali";
    case 'gu': return "Gujarati";
    case 'pa': return "Punjabi";
    default: return "English";
  }
};

/**
 * Analyzes a plant leaf image to detect diseases.
 */
export const analyzePlantImage = async (base64Image: string, lang: LanguageCode): Promise<DiseaseResult> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found. Returning mock data.");
    return mockAnalysis();
  }

  const languageName = getLanguageName(lang);

  const prompt = `
    You are an expert agricultural AI.
    Analyze the provided image.

    **STEP 1: IDENTIFY THE LEAF/PLANT**
    - Identify the exact species of the plant/crop from the leaf (e.g., "Tomato", "Rice", "Mango").
    - If the image is NOT a plant or leaf (e.g., a person, car, or random object), set 'isPlant' to false and stop.

    **STEP 2: DETECT DISEASE STATUS**
    - Analyze the leaf for any signs of disease, pests, or nutrient deficiency.
    - **IF HEALTHY:**
      - Set 'isHealthy' to true.
      - Set 'diseaseName' to "Healthy" (translated).
      - Set 'severity' to "Low".
      - Leave 'causes', 'organicTreatment', and 'chemicalTreatment' empty.
      - Fill 'prevention' with 3 generic care tips for this specific plant (e.g., watering, sunlight needs).
    
    - **IF DISEASED:**
      - Set 'isHealthy' to false.
      - Identify the specific disease.
      - Provide verified treatments.

    **STEP 3: PROVIDE CONTENT IN ${languageName.toUpperCase()}**
    - **CRITICAL:** Output all string values (cropName, diseaseName, causes, treatments, etc.) in **${languageName}** language. 
    - Keep the JSON keys in English.

    Return the result in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isPlant: { type: Type.BOOLEAN },
            isHealthy: { type: Type.BOOLEAN },
            cropName: { type: Type.STRING, description: `The detected plant/crop name in ${languageName}` },
            diseaseName: { type: Type.STRING, description: `Name of the disease or 'Healthy' in ${languageName}` },
            confidence: { type: Type.NUMBER, description: "Confidence score 0-100" },
            severity: { type: Type.STRING, enum: ["Low", "Medium", "High", "Unknown"] },
            causes: { type: Type.ARRAY, items: { type: Type.STRING }, description: `List of causes in ${languageName}` },
            organicTreatment: { type: Type.ARRAY, items: { type: Type.STRING }, description: `List of organic treatments in ${languageName}` },
            chemicalTreatment: { type: Type.ARRAY, items: { type: Type.STRING }, description: `List of chemical treatments in ${languageName}` },
            prevention: { type: Type.ARRAY, items: { type: Type.STRING }, description: `List of prevention methods or care tips in ${languageName}` },
            verifiedSource: { type: Type.STRING }
          },
          required: ["isPlant", "isHealthy", "cropName", "diseaseName", "confidence", "severity", "causes", "organicTreatment", "chemicalTreatment", "prevention"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as DiseaseResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze image.");
  }
};

/**
 * Generates weather-based farming tips.
 */
export const generateAdvisory = async (season: string, location: string, lang: LanguageCode): Promise<WeatherTip[]> => {
  if (!process.env.API_KEY) {
    return [
      { title: "General Tip", description: "Ensure proper drainage in fields during rain.", type: "tip" },
      { title: "Pest Alert", description: "Check for aphids in cloudy weather.", type: "alert" }
    ];
  }

  const languageName = getLanguageName(lang);

  const prompt = `
    You are an expert agronomist. 
    The user is a farmer in **${location}**. 
    Based on the typical weather in this region during this time of year, generate 3 specific, actionable farming tips or disease alerts.
    
    **LANGUAGE REQUIREMENT:**
    - Provide the 'title' and 'description' fields in **${languageName}**.
    
    Structure the response as a JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: `Title in ${languageName}` },
              description: { type: Type.STRING, description: `Description in ${languageName}` },
              type: { type: Type.STRING, enum: ["alert", "tip"] }
            }
          }
        }
      }
    });
    
    return JSON.parse(response.text || "[]") as WeatherTip[];
  } catch (e) {
    console.error(e);
    return [];
  }
};

const mockAnalysis = (): DiseaseResult => ({
  isPlant: true,
  isHealthy: false,
  cropName: "Tomato (Lycopersicon esculentum)",
  diseaseName: "Early Blight",
  confidence: 96,
  severity: "Medium",
  causes: ["Alternaria solani fungus", "High humidity"],
  organicTreatment: ["Remove infected leaves", "Neem oil spray"],
  chemicalTreatment: ["Mancozeb 75 WP", "Chlorothalonil"],
  prevention: ["Crop rotation", "Proper spacing"],
  verifiedSource: "ICAR"
});