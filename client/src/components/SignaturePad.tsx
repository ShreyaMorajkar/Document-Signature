import React, { useRef, useState, useEffect } from 'react';
import { Edit3, Type, RefreshCw, Check } from 'lucide-react';

interface SignaturePadProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ isOpen, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Setup drawing canvas listeners
  useEffect(() => {
    if (activeTab !== 'draw' || !isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution to match display size for crisp lines
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.strokeStyle = '#38bdf8'; // light blue sky color for signature
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  // Start Drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  // Draw Line
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault(); // Prevent scrolling on touch devices

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  // Stop Drawing
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Clear Pad
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Submit Signature
  const handleSave = () => {
    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Check if canvas is empty before saving
      // A quick check is testing if all pixel data is 0
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const buffer = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const isCanvasBlank = !buffer.data.some(channel => channel !== 0);

      if (isCanvasBlank) {
        alert('Please draw your signature first.');
        return;
      }

      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    } else {
      if (!typedName.trim()) {
        alert('Please type your name first.');
        return;
      }

      // Render typed name onto a canvas to export as PNG
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 600;
      tempCanvas.height = 200;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      // Clear with transparent bg
      ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Draw text
      ctx.font = '55px "Great Vibes", cursive';
      ctx.fillStyle = '#0284c7'; // dark blue text signature
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, tempCanvas.width / 2, tempCanvas.height / 2);

      const dataUrl = tempCanvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-white">Create Your Signature</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800/80">
          <button
            onClick={() => setActiveTab('draw')}
            className={`flex-1 py-3 flex items-center justify-center space-x-2 text-sm font-medium transition-all cursor-pointer border-b-2 ${
              activeTab === 'draw'
                ? 'border-indigo-500 text-white bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 size={16} />
            <span>Draw</span>
          </button>
          
          <button
            onClick={() => setActiveTab('type')}
            className={`flex-1 py-3 flex items-center justify-center space-x-2 text-sm font-medium transition-all cursor-pointer border-b-2 ${
              activeTab === 'type'
                ? 'border-indigo-500 text-white bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Type size={16} />
            <span>Type</span>
          </button>
        </div>

        {/* Canvas / Input Body */}
        <div className="p-6 bg-slate-950/40 min-h-[220px] flex items-center justify-center">
          {activeTab === 'draw' ? (
            <div className="relative w-full">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[180px] bg-slate-900/60 rounded-xl border border-slate-800 cursor-crosshair shadow-inner"
              />
              <span className="absolute bottom-3 left-4 text-xs text-slate-500 pointer-events-none select-none">
                Draw here (touch/mouse)
              </span>
            </div>
          ) : (
            <div className="w-full flex flex-col space-y-4">
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Type your name..."
                maxLength={25}
                className="w-full px-4 py-3 bg-slate-900/60 rounded-xl border border-slate-800 text-white focus:outline-none focus:border-indigo-500 shadow-inner text-center text-lg tracking-wide"
              />
              
              {/* Live Preview box */}
              <div className="w-full h-[100px] bg-slate-900/40 rounded-xl border border-slate-800/50 flex items-center justify-center shadow-inner overflow-hidden">
                {typedName.trim() ? (
                  <span className="font-script text-5xl text-sky-400 select-none animate-pulse">
                    {typedName}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Signature preview will appear here</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/20">
          <button
            onClick={activeTab === 'draw' ? clearCanvas : () => setTypedName('')}
            className="flex items-center space-x-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800 px-3 py-2 rounded-lg border border-slate-800 transition-all cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Reset</span>
          </button>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800/50 hover:text-white rounded-lg text-sm cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all cursor-pointer"
            >
              <Check size={16} />
              <span>Use Signature</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SignaturePad;
