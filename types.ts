
export type LanguageCode = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu' | 'pa';

export interface UserProfile {
  name: string;
  phone: string;
  language: LanguageCode;
  photoUrl?: string;
}

export interface DiseaseResult {
  isPlant: boolean;
  isHealthy: boolean;
  cropName: string;
  diseaseName: string;
  confidence: number;
  severity: 'Low' | 'Medium' | 'High' | 'Unknown';
  causes: string[];
  organicTreatment: string[];
  chemicalTreatment: string[];
  prevention: string[];
  verifiedSource?: string;
}

export interface ScanRecord {
  id: string;
  timestamp: number;
  imageUrl: string; // Base64 or local URL
  result: DiseaseResult;
}

export interface ProfitCalculation {
  totalInvestment: number;
  expectedRevenue: number;
  estimatedProfit: number;
  profitPerAcre: number;
  roi: number; // Return on Investment %
}

export interface WeatherTip {
  title: string;
  description: string;
  type: 'alert' | 'tip';
}

export interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  conditionCode: number;
  locationName: string;
}