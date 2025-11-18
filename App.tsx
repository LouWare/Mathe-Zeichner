import React, { useState, useEffect, useCallback } from 'react';
import GraphContainer from './components/GraphContainer';
import { generateFunctionPoints, calculateDerivative, calculateIntegral } from './utils/mathUtils';
import { analyzeGraph } from './services/geminiService';
import { Point, GraphType } from './types';
import { BeakerIcon, ArrowPathIcon, SparklesIcon, ChartBarIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';

// Range settings
const MIN_X = -Math.PI;
const MAX_X = Math.PI;
const POINTS_COUNT = 15; 

// Preset definitions
const PRESETS = [
  { name: 'Sinus', func: Math.sin },
  { name: 'Cosinus', func: Math.cos },
  { name: 'Parabel (x²)', func: (x: number) => 0.5 * x * x - 2 }, // Shifted/Scaled for better view
  { name: 'Kubisch (x³)', func: (x: number) => 0.2 * x * x * x },
  { name: 'Linear (x)', func: (x: number) => x },
  { name: 'Konstant (1)', func: () => 1 },
];

function App() {
  const [functionPoints, setFunctionPoints] = useState<Point[]>([]);
  const [derivativePoints, setDerivativePoints] = useState<Point[]>([]);
  const [integralPoints, setIntegralPoints] = useState<Point[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // Initialize with Sinus
  useEffect(() => {
    loadPreset(PRESETS[0]);
  }, []);

  // Reactively update derived graphs whenever functionPoints changes
  useEffect(() => {
    if (functionPoints.length === 0) return;
    setDerivativePoints(calculateDerivative(functionPoints));
    // Integrate f(x) to get F(x). We assume C=0 for the visualization relative to start
    setIntegralPoints(calculateIntegral(functionPoints, 0)); 
  }, [functionPoints]);

  const loadPreset = (preset: typeof PRESETS[0]) => {
    const points = generateFunctionPoints(preset.func, MIN_X, MAX_X, POINTS_COUNT);
    setFunctionPoints(points);
    setAiAnalysis(null);
  };

  // Handler for dragging Original Function f(x)
  const handleFunctionDrag = useCallback((index: number, newY: number) => {
    setFunctionPoints(prev => {
      const next = [...prev];
      next[index] = { ...next[index], y: newY };
      return next;
    });
  }, []);

  // Handler for dragging Derivative f'(x)
  // Reconstructs f(x) by integrating the modified f'(x)
  const handleDerivativeDrag = useCallback((index: number, newY: number) => {
    // 1. Update the local derivative state temporarily for calculation
    const modifiedDerivative = [...derivativePoints];
    modifiedDerivative[index] = { ...modifiedDerivative[index], y: newY };
    
    // 2. Integrate this new derivative to get back to f(x).
    // We use the current f(x)'s starting Y as the constant C to prevent the graph from jumping vertically.
    const startY = functionPoints[0]?.y || 0;
    const reconstructedFunction = calculateIntegral(modifiedDerivative, startY);
    
    setFunctionPoints(reconstructedFunction);
  }, [derivativePoints, functionPoints]);

  // Handler for dragging Integral F(x)
  // Reconstructs f(x) by differentiating the modified F(x)
  const handleIntegralDrag = useCallback((index: number, newY: number) => {
    // 1. Update local integral state
    const modifiedIntegral = [...integralPoints];
    modifiedIntegral[index] = { ...modifiedIntegral[index], y: newY };

    // 2. Differentiate F(x) to find the new slope, which IS f(x)
    const reconstructedFunction = calculateDerivative(modifiedIntegral);

    setFunctionPoints(reconstructedFunction);
  }, [integralPoints]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    const result = await analyzeGraph(functionPoints);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-800 bg-slate-50">
      
      {/* Sidebar / Controls */}
      <aside className="w-full md:w-80 lg:w-96 bg-white border-b md:border-r border-slate-200 p-6 flex flex-col shrink-0 z-20 h-auto md:h-screen sticky top-0 overflow-y-auto shadow-xl shadow-slate-200/50">
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                    <BeakerIcon className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CalcVis</h1>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
                Eine interaktive Spielwiese für Analysis. Ziehe an <strong>jedem</strong> Graphen, um die mathematischen Zusammenhänge zu erleben.
            </p>
        </div>

        {/* Presets */}
        <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4" />
                Beispiele
            </h3>
            <div className="grid grid-cols-2 gap-2">
                {PRESETS.map(preset => (
                    <button
                        key={preset.name}
                        onClick={() => loadPreset(preset)}
                        className="px-3 py-2 text-xs font-medium bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-lg transition-all text-left"
                    >
                        {preset.name}
                    </button>
                ))}
            </div>
        </div>

        {/* Controls */}
        <div className="space-y-3 mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Aktionen</h3>
            <button 
                onClick={() => loadPreset(PRESETS[0])}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors text-sm font-medium"
            >
                <ArrowPathIcon className="h-4 w-4" />
                Zurücksetzen
            </button>
            
            <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-indigo-200 text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isAnalyzing ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                    <SparklesIcon className="h-4 w-4" />
                )}
                {isAnalyzing ? 'Analysiere...' : 'KI-Analyse starten'}
            </button>
        </div>

        {/* AI Analysis Result */}
        {aiAnalysis && (
            <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm animate-fadeIn ring-1 ring-indigo-50">
                <h3 className="text-indigo-900 font-bold text-sm mb-3 flex items-center gap-2 border-b border-indigo-50 pb-2">
                    <SparklesIcon className="h-4 w-4 text-indigo-500" />
                    Erkenntnisse
                </h3>
                <div className="prose prose-sm prose-indigo text-slate-600 max-w-none leading-relaxed">
                    <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                </div>
            </div>
        )}

        <div className="mt-auto pt-6 border-t border-slate-100 text-xs text-slate-400 font-medium text-center">
            Tipp: Alle Graphen sind interaktiv.
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            
            {/* INTEGRAL F(x) */}
            <div className="relative group">
                <div className="absolute -left-3 top-8 bottom-8 w-1 bg-emerald-200 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="px-5 pt-4 pb-2 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-emerald-700 flex items-center gap-2">
                                {GraphType.INTEGRAL}
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">Interaktiv</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">Die Stammfunktion (Fläche). Änderung hier beeinflusst die Steigung von f(x).</p>
                        </div>
                    </div>
                    <GraphContainer 
                        data={integralPoints} 
                        type={GraphType.INTEGRAL} 
                        color="#10b981" // emerald-500
                        isInteractive={true}
                        onPointDrag={handleIntegralDrag}
                        height={220}
                    />
                </div>
            </div>

            {/* ORIGINAL FUNCTION f(x) */}
            <div className="relative group">
                <div className="absolute -left-3 top-6 bottom-6 w-1.5 bg-indigo-400 rounded-full opacity-80 group-hover:opacity-100 transition-opacity"></div>
                <div className="bg-white p-1 rounded-2xl shadow-xl shadow-indigo-100/50 border border-indigo-100 ring-1 ring-indigo-50 scale-[1.02] transform transition-transform z-10">
                     <div className="px-5 pt-5 pb-3 flex justify-between items-center">
                         <div>
                            <h2 className="text-xl font-bold text-indigo-700 flex items-center gap-2">
                                {GraphType.ORIGINAL}
                                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">Hauptfunktion</span>
                            </h2>
                            <p className="text-xs text-indigo-400/80 mt-0.5">Zentraler Graph. Ziehe Punkte, um f(x) direkt zu formen.</p>
                         </div>
                    </div>
                    <GraphContainer 
                        data={functionPoints} 
                        type={GraphType.ORIGINAL} 
                        color="#4f46e5" // indigo-600
                        isInteractive={true}
                        onPointDrag={handleFunctionDrag}
                        height={320}
                    />
                </div>
            </div>

            {/* DERIVATIVE f'(x) */}
            <div className="relative group">
                <div className="absolute -left-3 top-8 bottom-8 w-1 bg-rose-200 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="px-5 pt-4 pb-2 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-rose-600 flex items-center gap-2">
                                {GraphType.DERIVATIVE}
                                <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">Interaktiv</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">Die Ableitung (Steigung). Änderung hier formt f(x) neu.</p>
                        </div>
                    </div>
                    <GraphContainer 
                        data={derivativePoints} 
                        type={GraphType.DERIVATIVE} 
                        color="#f43f5e" // rose-500
                        isInteractive={true}
                        onPointDrag={handleDerivativeDrag}
                        height={220}
                    />
                </div>
            </div>

        </div>
      </main>
    </div>
  );
}

export default App;