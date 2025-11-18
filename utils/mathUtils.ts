import { Point } from '../types';

export const generateFunctionPoints = (
  func: (x: number) => number,
  minX: number,
  maxX: number,
  steps: number
): Point[] => {
  const points: Point[] = [];
  const stepSize = (maxX - minX) / (steps - 1);
  for (let i = 0; i < steps; i++) {
    const x = minX + i * stepSize;
    const y = func(x); 
    points.push({ x, y });
  }
  return points;
};

// Legacy wrapper to maintain compatibility if needed, or can be replaced
export const generateInitialPoints = (minX: number, maxX: number, steps: number): Point[] => {
  return generateFunctionPoints(Math.sin, minX, maxX, steps);
};

export const calculateDerivative = (points: Point[]): Point[] => {
  if (points.length < 2) return [];
  
  const derivative: Point[] = [];
  
  for (let i = 0; i < points.length; i++) {
    let slope = 0;
    
    if (i === 0) {
      // Forward difference
      slope = (points[i + 1].y - points[i].y) / (points[i + 1].x - points[i].x);
    } else if (i === points.length - 1) {
      // Backward difference
      slope = (points[i].y - points[i - 1].y) / (points[i].x - points[i - 1].x);
    } else {
      // Central difference
      slope = (points[i + 1].y - points[i - 1].y) / (points[i + 1].x - points[i - 1].x);
    }
    
    derivative.push({ x: points[i].x, y: slope });
  }
  
  return derivative;
};

export const calculateIntegral = (points: Point[], initialC: number = 0): Point[] => {
  if (points.length < 1) return [];
  
  const integral: Point[] = [];
  let accumulatedArea = initialC;
  
  // Push starting point
  integral.push({ x: points[0].x, y: accumulatedArea });
  
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    // Trapezoidal rule
    const avgHeight = (points[i].y + points[i - 1].y) / 2;
    accumulatedArea += avgHeight * dx;
    integral.push({ x: points[i].x, y: accumulatedArea });
  }
  
  return integral;
};