export interface Point {
  x: number;
  y: number;
}

export interface GraphDimensions {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

export enum GraphType {
  ORIGINAL = 'Funktion f(x)',
  DERIVATIVE = 'Ableitung f\'(x)',
  INTEGRAL = 'Stammfunktion F(x)'
}

export interface AIAnalysisResponse {
  analysis: string;
  keyInsights: string[];
}
