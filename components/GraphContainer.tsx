import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Point, GraphType } from '../types';

interface GraphContainerProps {
  data: Point[];
  type: GraphType;
  color: string;
  isInteractive?: boolean;
  onPointDrag?: (index: number, newY: number) => void;
  height?: number;
  showGrid?: boolean;
}

const GraphContainer: React.FC<GraphContainerProps> = ({
  data,
  type,
  color,
  isInteractive = false,
  onPointDrag,
  height = 250,
  showGrid = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  // Margins
  const margin = { top: 20, right: 30, bottom: 30, left: 50 };
  const innerHeight = height - margin.top - margin.bottom;

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setWidth(entries[0].contentRect.width);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Scales
  const innerWidth = Math.max(width - margin.left - margin.right, 0);
  
  const xScale = useMemo(() => {
    return d3.scaleLinear()
      .domain([d3.min(data, d => d.x) || -Math.PI, d3.max(data, d => d.x) || Math.PI])
      .range([0, innerWidth]);
  }, [data, innerWidth]);

  const yScale = useMemo(() => {
    // Fixed domain to avoid jumping y-axis, but large enough to accommodate typical values
    // For integral, values can get large, so maybe dynamic there? 
    // Let's stick to semi-fixed for stability during interaction unless it goes out of bounds.
    const yMax = Math.max(5, d3.max(data, d => Math.abs(d.y)) || 5);
    return d3.scaleLinear()
      .domain([-yMax * 1.2, yMax * 1.2]) 
      .range([innerHeight, 0]);
  }, [data, innerHeight]);

  // Path generator
  const lineGenerator = d3.line<Point>()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y))
    .curve(d3.curveCatmullRom.alpha(0.5)); // Smooth curve

  const areaGenerator = d3.area<Point>()
    .x(d => xScale(d.x))
    .y0(yScale(0))
    .y1(d => yScale(d.y))
    .curve(d3.curveCatmullRom.alpha(0.5));

  // Handling Drag
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isInteractive || !onPointDrag) return;
    
    let clientX, clientY;
    if ((e as React.TouchEvent).touches) {
        clientX = (e as React.TouchEvent).touches[0].clientX;
        clientY = (e as React.TouchEvent).touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }

    // If dragging a specific point
    if (activePointIndex !== null) {
       const svgRect = svgRef.current?.getBoundingClientRect();
       if (!svgRect) return;
       
       const relY = clientY - svgRect.top - margin.top;
       // Invert Y scale
       const newVal = yScale.invert(relY);
       
       // Clamp values to prevent extreme dragging
       const clampedVal = Math.max(-10, Math.min(10, newVal));
       
       onPointDrag(activePointIndex, clampedVal);
    }
  };

  const handleMouseUp = () => {
    setActivePointIndex(null);
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden touch-none ${isInteractive ? 'cursor-crosshair' : ''}`}
      style={{ height }}
    >
      {/* Header Label */}
      <div className="absolute top-2 left-4 bg-slate-900/5 px-2 py-1 rounded text-xs font-bold text-slate-700 z-10 select-none pointer-events-none">
        {type}
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="block"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          
          {/* Grid Lines */}
          {showGrid && (
            <g className="opacity-10">
               {xScale.ticks(10).map(tick => (
                 <line 
                   key={`x-${tick}`} 
                   x1={xScale(tick)} x2={xScale(tick)} 
                   y1={0} y2={innerHeight} 
                   stroke="currentColor" 
                 />
               ))}
               {yScale.ticks(6).map(tick => (
                 <line 
                   key={`y-${tick}`} 
                   x1={0} x2={innerWidth} 
                   y1={yScale(tick)} y2={yScale(tick)} 
                   stroke="currentColor" 
                 />
               ))}
            </g>
          )}

          {/* Axes */}
          <g className="text-slate-400 text-xs">
             {/* X Axis (y=0) */}
             <line 
                x1={0} x2={innerWidth} 
                y1={yScale(0)} y2={yScale(0)} 
                stroke="currentColor" 
                strokeWidth={1.5}
             />
             {/* Y Axis (x=0) */}
             {xScale.domain()[0] < 0 && xScale.domain()[1] > 0 && (
                <line 
                  x1={xScale(0)} x2={xScale(0)} 
                  y1={0} y2={innerHeight} 
                  stroke="currentColor" 
                  strokeWidth={1.5}
                />
             )}
          </g>

          {/* The Graph Area (filled slightly) */}
          <path
            d={areaGenerator(data) || ''}
            fill={color}
            fillOpacity={0.1}
            pointerEvents="none"
          />

          {/* The Graph Line */}
          <path
            d={lineGenerator(data) || ''}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            pointerEvents="none"
          />

          {/* Interactive Handles */}
          {isInteractive && data.map((point, i) => (
            <g key={i} transform={`translate(${xScale(point.x)}, ${yScale(point.y)})`}>
                {/* Invisible larger target for easier clicking */}
               <circle
                r={15}
                fill="transparent"
                className="cursor-ns-resize hover:fill-slate-400/10"
                onMouseDown={(e) => {
                    e.preventDefault(); 
                    setActivePointIndex(i);
                }}
                onTouchStart={(e) => {
                    setActivePointIndex(i);
                }}
               />
               {/* Visible Handle */}
               <circle
                 r={activePointIndex === i ? 6 : 4}
                 fill="white"
                 stroke={color}
                 strokeWidth={2}
                 pointerEvents="none"
                 className="transition-all duration-75"
               />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

export default GraphContainer;
