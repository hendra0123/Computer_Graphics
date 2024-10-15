import React, { useState, useEffect, useRef, useCallback } from 'react';


const CoordinateLineCalculator = () => {
  const [x1, setX1] = useState('');
  const [y1, setY1] = useState('');
  const [x2, setX2] = useState('');
  const [y2, setY2] = useState('');
  const [digitalPoints, setDigitalPoints] = useState([]);
  const [processTable, setProcessTable] = useState([]);
  const [isDDA, setIsDDA] = useState(false);
  const [svgDimensions] = useState({ width: 400, height: 400 });
  const [viewBox, setViewBox] = useState('-10 -10 20 20');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [gridSize, setGridSize] = useState(10);
  const [isBresenham, setIsBresenham] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  const calculateDigitalPoints = () => {
    const x1Num = parseInt(x1);
    const y1Num = parseInt(y1);
    const x2Num = parseInt(x2);
    const y2Num = parseInt(y2);

    const dx = Math.abs(x2Num - x1Num);
    const dy = Math.abs(y2Num - y1Num);
    const sx = x1Num < x2Num ? 1 : -1;
    const sy = y1Num < y2Num ? 1 : -1;
    let err = dx - dy;

    const points = [];
    const process = [];
    let x = x1Num;
    let y = y1Num;

    const m = (y2Num - y1Num) / (x2Num - x1Num);

    while (true) {
      points.push({ x, y });
      process.push({
        x,
        dx: process.length > 0 ? 1 : '',
        xNext: x,
        yb: y,
        m: m.toFixed(2),
        y: y
      });

      if (x === x2Num && y === y2Num) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    setDigitalPoints(points);
    setProcessTable(process);
    setIsBresenham(false);
    setIsDDA(false);
    updateSvgDimensions(points);
  };

  const calculateDDAPoints = () => {
    const x1Num = parseInt(x1);
    const y1Num = parseInt(y1);
    const x2Num = parseInt(x2);
    const y2Num = parseInt(y2);

    const dx = x2Num - x1Num;
    const dy = y2Num - y1Num;
    const steps = Math.abs(dx) > Math.abs(dy) ? Math.abs(dx) : Math.abs(dy);

    const xIncrement = dx / steps;
    const yIncrement = dy / steps;

    let x = x1Num;
    let y = y1Num;

    const points = [];
    const process = [];

    for (let k = 0; k <= steps; k++) {
      points.push({ x: Math.round(x), y: Math.round(y) });
      process.push({
        k,
        x: x.toFixed(2),
        y: y.toFixed(2),
        roundX: Math.round(x),
        roundY: Math.round(y)
      });

      x += xIncrement;
      y += yIncrement;
    }

    setDigitalPoints(points);
    setProcessTable(process);
    setIsBresenham(false);
    setIsDDA(true);
    updateSvgDimensions(points);
  };

  const calculateBresenhamPoints = () => {
    const x1Num = parseInt(x1);
    const y1Num = parseInt(y1);
    const x2Num = parseInt(x2);
    const y2Num = parseInt(y2);

    const dx = Math.abs(x2Num - x1Num);
    const dy = Math.abs(y2Num - y1Num);
    const sx = x1Num < x2Num ? 1 : -1;
    const sy = y1Num < y2Num ? 1 : -1;
    let err = dx - dy;

    const points = [];
    const process = [];
    let x = x1Num;
    let y = y1Num;
    let k = 0;

    while (true) {
      points.push({ x, y });
      process.push({
        k,
        pk: err,
        xk: x,
        yk: y,
      });

      if (x === x2Num && y === y2Num) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
      k++;
    }

    setDigitalPoints(points);
    setProcessTable(process);
    setIsDDA(false);
    setIsBresenham(true);
    updateSvgDimensions(points);
  };




  const updateSvgDimensions = (points) => {
    const xValues = points.map(p => p.x);
    const yValues = points.map(p => p.y);
    const minX = Math.min(...xValues, 0);
    const maxX = Math.max(...xValues, 0);
    const minY = Math.min(...yValues, 0);
    const maxY = Math.max(...yValues, 0);
    
    const padding = 1;
    const viewBoxSize = Math.max(Math.abs(minX), Math.abs(maxX), Math.abs(minY), Math.abs(maxY), 10) * 2 + padding * 2;
    const newGridSize = Math.ceil(viewBoxSize / 2);
    setGridSize(newGridSize);

    setViewBox(`${-newGridSize} ${-newGridSize} ${viewBoxSize} ${viewBoxSize}`);
  };

  const handleZoomIn = () => {
    setZoom(prevZoom => Math.min(10, prevZoom * 1.2));
  };

  const handleZoomOut = () => {
    setZoom(prevZoom => Math.max(0.1, prevZoom / 1.2));
  };

  const handleMouseDown = (event) => {
    if (event.button === 0) {
      setIsDragging(true);
      setDragStart({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseMove = useCallback((event) => {
    if (isDragging) {
      const dx = event.clientX - dragStart.x;
      const dy = event.clientY - dragStart.y;
      setPan(prevPan => ({
        x: prevPan.x + dx / zoom,
        y: prevPan.y + dy / zoom,
      }));
      setDragStart({ x: event.clientX, y: event.clientY });
    }
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getSvgTransform = () => `scale(${zoom}) translate(${pan.x} ${pan.y})`;

  const renderGridLines = () => {
    const lines = [];
    const visibleGridSize = gridSize * 2;
    for (let i = -visibleGridSize; i <= visibleGridSize; i++) {
      lines.push(
        <line key={`v${i}`} x1={i} y1={-visibleGridSize} x2={i} y2={visibleGridSize} stroke="#ccc" strokeWidth="0.05" />,
        <line key={`h${i}`} x1={-visibleGridSize} y1={i} x2={visibleGridSize} y2={i} stroke="#ccc" strokeWidth="0.05" />
      );
      if (i !== 0 && i % Math.ceil(gridSize / 5) === 0) {
        lines.push(
          <text key={`xt${i}`} x={i} y="0.5" fontSize="0.6" textAnchor="middle">{i}</text>,
          <text key={`yt${i}`} x="-0.5" y={-i} fontSize="0.6" textAnchor="end" dominantBaseline="middle">{i}</text>
        );
      }
    }
    return lines;
  };

  const handleClear = () => {
    setX1('');
    setY1('');
    setX2('');
    setY2('');
    setDigitalPoints([]);
    setProcessTable([]);
    setIsBresenham(false);
    setIsDDA(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Kalkulator Garis Koordinat</h1>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <input
          type="number"
          placeholder="X1"
          value={x1}
          onChange={(e) => setX1(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="number"
          placeholder="Y1"
          value={y1}
          onChange={(e) => setY1(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="number"
          placeholder="X2"
          value={x2}
          onChange={(e) => setX2(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="number"
          placeholder="Y2"
          value={y2}
          onChange={(e) => setY2(e.target.value)}
          className="border p-2 rounded"
        />
      </div>
      <div className="flex space-x-2 mb-4">
        <button
          onClick={calculateDigitalPoints}
          className="bg-blue-500 text-white p-2 rounded flex-1"
        >
          Algoritma Dasar
        </button>
        <button
          onClick={calculateDDAPoints}
          className="bg-green-500 text-white p-2 rounded flex-1"
        >
          Algoritma DDA
        </button>
        <button
          onClick={calculateBresenhamPoints}
          className="bg-purple-500 text-white p-2 rounded flex-1"
        >
          Algoritma Bresenham
        </button>
        <button
          onClick={handleClear}
          className="bg-red-500 text-white p-2 rounded flex-1"
        >
          Clear
        </button>
      </div>
      
      {digitalPoints.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Visualisasi Garis:</h2>
          <div className="flex items-center space-x-2 mb-2">
            <button
              onClick={handleZoomIn}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Zoom In
            </button>
            <button
              onClick={handleZoomOut}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Zoom Out
            </button>
            <span className="text-sm text-gray-600">
              Zoom: {zoom.toFixed(2)}x | Drag to pan
            </span>
          </div>
          <svg
            ref={svgRef}
            width={svgDimensions.width}
            height={svgDimensions.height}
            viewBox={viewBox}
            className="border border-gray-300 cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <g transform={getSvgTransform()}>
              {renderGridLines()}
              <line x1={-gridSize * 2} y1="0" x2={gridSize * 2} y2="0" stroke="black" strokeWidth="0.1" />
              <line x1="0" y1={-gridSize * 2} x2="0" y2={gridSize * 2} stroke="black" strokeWidth="0.1" />
              
              <polyline
                points={digitalPoints.map(p => `${p.x},${-p.y}`).join(' ')}
                fill="none"
                stroke="blue"
                strokeWidth="0.1"
              />
              {digitalPoints.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={-point.y}
                  r="0.2"
                  fill="red"
                />
              ))}
            </g>
          </svg>
        </div>
      )}
      
     {processTable.length > 0 && (
        <div className="overflow-x-auto mt-4">
          <h2 className="text-xl font-semibold mb-2">Tabel Proses:</h2>
          {isDDA ? (
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">k</th>
                  <th className="border border-gray-300 p-2">x</th>
                  <th className="border border-gray-300 p-2">y</th>
                  <th className="border border-gray-300 p-2">round(x), round(y)</th>
                </tr>
              </thead>
              <tbody>
                {processTable.map((row, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 p-2">{row.k}</td>
                    <td className="border border-gray-300 p-2">{row.x}</td>
                    <td className="border border-gray-300 p-2">{row.y}</td>
                    <td className="border border-gray-300 p-2">({row.roundX}, {row.roundY})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : isBresenham ? (
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">k</th>
                  <th className="border border-gray-300 p-2">pk</th>
                  <th className="border border-gray-300 p-2">(xk+1, yk+1)</th>
                </tr>
              </thead>
              <tbody>
                {processTable.map((row, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 p-2">{row.k}</td>
                    <td className="border border-gray-300 p-2">{row.pk}</td>
                    <td className="border border-gray-300 p-2">({row.xk}, {row.yk})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">x</th>
                  <th className="border border-gray-300 p-2">dx</th>
                  <th className="border border-gray-300 p-2">x</th>
                  <th className="border border-gray-300 p-2">y(b)</th>
                  <th className="border border-gray-300 p-2">m</th>
                  <th className="border border-gray-300 p-2">y</th>
                </tr>
              </thead>
              <tbody>
                {processTable.map((row, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 p-2">{row.x}</td>
                    <td className="border border-gray-300 p-2">{row.dx}</td>
                    <td className="border border-gray-300 p-2">{row.xNext}</td>
                    <td className="border border-gray-300 p-2">{row.yb}</td>
                    <td className="border border-gray-300 p-2">{row.m}</td>
                    <td className="border border-gray-300 p-2">{row.y}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default CoordinateLineCalculator;