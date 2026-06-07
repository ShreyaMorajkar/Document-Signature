import React, { useEffect, useRef, useState } from 'react';
import { 
  FileSignature, ArrowLeft, UploadCloud, Users, 
  Trash2, Mail, Send, Sparkles, Move
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import api from '../utils/api';

// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs`;

interface DocumentBuilderProps {
  documentId: string | null;
  setCurrentPage: (page: string) => void;
  setSelectedDocId: (id: string | null) => void;
}

interface SigField {
  id: string;
  page: number;
  x: number; // relative % (0-1)
  y: number; // relative % (0-1)
  width: number; // relative % (0-1)
  height: number; // relative % (0-1)
}

interface PageDimensions {
  width: number;
  height: number;
}

const DocumentBuilder: React.FC<DocumentBuilderProps> = ({ 
  documentId, 
  setCurrentPage,
  setSelectedDocId
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2>(1); // Step 1: Upload, Step 2: Place & Configure
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [docId, setDocId] = useState<string | null>(documentId);
  const [numPages, setNumPages] = useState(0);
  const [pagesDim, setPagesDim] = useState<PageDimensions[]>([]);
  const [fields, setFields] = useState<SigField[]>([]);
  
  // Recipient details
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');

  // Dragging states
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Refs for rendering canvases
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // Load document if docId is set (for editing drafts)
  useEffect(() => {
    if (docId) {
      loadPDF(docId);
      setActiveStep(2);
    }
  }, [docId]);

  // Handle File upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a PDF file first.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || file.name);

    try {
      const response = await api.post('/docs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const createdDoc = response.data;
      setDocId(createdDoc._id);
      setSelectedDocId(createdDoc._id);
      loadPDF(createdDoc._id);
      setActiveStep(2);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setLoading(false);
    }
  };

  // Load PDF and render pages
  const loadPDF = async (id: string) => {
    setLoading(true);
    try {
      const url = `http://localhost:5000/api/docs/view/${id}`;
      const loadingTask = pdfjsLib.getDocument({ url });
      const pdf = await loadingTask.promise;
      setNumPages(pdf.numPages);
      
      const dims: PageDimensions[] = [];
      
      // We must render pages sequentially
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.2 }); // Display scale
        dims.push({ width: viewport.width, height: viewport.height });
        
        // Wait briefly for canvas elements to mount if needed
        setTimeout(async () => {
          const canvas = canvasRefs.current[i - 1];
          if (!canvas) return;
          
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext('2d');
          if (!context) return;
          
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
            canvas: canvas,
          };
          await page.render(renderContext).promise;
        }, 100);
      }
      setPagesDim(dims);
    } catch (err) {
      console.error('Error rendering PDF:', err);
      alert('Failed to load PDF viewer.');
    } finally {
      setLoading(false);
    }
  };

  // Add signature field to page
  const addSignatureField = (pageIdx: number) => {
    const dim = pagesDim[pageIdx];
    if (!dim) return;

    // Default: place box near center of the page
    const boxW = 200; // px
    const boxH = 65; // px

    const newField: SigField = {
      id: `field-${Date.now()}`,
      page: pageIdx,
      x: (dim.width / 2 - boxW / 2) / dim.width,
      y: (dim.height / 2 - boxH / 2) / dim.height,
      width: boxW / dim.width,
      height: boxH / dim.height,
    };

    setFields([...fields, newField]);
  };

  // Delete signature field
  const deleteField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  // Dragging event handlers
  const handleDragStart = (e: React.MouseEvent, fieldId: string, pageIdx: number) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    const dim = pagesDim[pageIdx];
    if (!dim) return;

    const absX = field.x * dim.width;
    const absY = field.y * dim.height;

    dragOffset.current = {
      x: e.clientX - absX,
      y: e.clientY - absY,
    };
    setDraggingFieldId(fieldId);
  };

  const handleDragMove = (e: React.MouseEvent, pageIdx: number) => {
    if (draggingFieldId === null) return;

    const field = fields.find(f => f.id === draggingFieldId);
    if (!field || field.page !== pageIdx) return;

    const dim = pagesDim[pageIdx];
    if (!dim) return;

    let newAbsX = e.clientX - dragOffset.current.x;
    let newAbsY = e.clientY - dragOffset.current.y;

    const boxW = field.width * dim.width;
    const boxH = field.height * dim.height;

    // Bounds checking
    if (newAbsX < 0) newAbsX = 0;
    if (newAbsX + boxW > dim.width) newAbsX = dim.width - boxW;
    if (newAbsY < 0) newAbsY = 0;
    if (newAbsY + boxH > dim.height) newAbsY = dim.height - boxH;

    // Convert back to relative percentages
    setFields(fields.map(f => {
      if (f.id === draggingFieldId) {
        return {
          ...f,
          x: newAbsX / dim.width,
          y: newAbsY / dim.height,
        };
      }
      return f;
    }));
  };

  const handleDragEnd = () => {
    setDraggingFieldId(null);
  };

  // Submit / Send Document
  const handleSend = async () => {
    if (!recipientName.trim() || !recipientEmail.trim()) {
      alert('Please enter recipient name and email.');
      return;
    }

    if (fields.length === 0) {
      alert('Please place at least one signature field on the document.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/docs/send', {
        documentId: docId,
        recipientName,
        recipientEmail,
        fields,
      });

      alert('Document finalized and sent for signing!');
      console.log('Signing Link:', response.data.signingLink);
      setCurrentPage('dashboard');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send document.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 px-4 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => {
            setSelectedDocId(null);
            setCurrentPage('dashboard');
          }}
          className="p-2 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold text-white mt-0 mb-1">
            {activeStep === 1 ? 'Upload Document' : 'Place Signature Fields'}
          </h1>
          <p className="text-xs text-slate-400">
            {activeStep === 1 
              ? 'Upload a PDF to configure signature placement layout.' 
              : 'Add signature blocks and place them anywhere on the document pages.'
            }
          </p>
        </div>
      </div>

      {/* Step 1: Upload */}
      {activeStep === 1 && (
        <div className="flex justify-center py-6">
          <div className="glass w-full max-w-xl p-8 rounded-2xl border border-slate-800 glow-indigo">
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Document Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Consulting Agreement (Optional)"
                  className="w-full px-4 py-3 bg-slate-950/40 rounded-xl border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all text-sm shadow-inner"
                />
              </div>

              {/* Upload Drag Box */}
              <div className="relative border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl bg-slate-950/20 p-8 text-center transition-all">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (selected) {
                      setFile(selected);
                      if (!title) setTitle(selected.name.replace('.pdf', ''));
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400">
                    <UploadCloud size={32} />
                  </div>
                  {file ? (
                    <div>
                      <p className="text-sm font-semibold text-white">{file.name}</p>
                      <p className="text-xs text-indigo-400 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB • Click to replace</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-white">Choose a PDF file</p>
                      <p className="text-xs text-slate-500 mt-1">Drag and drop or click to browse</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !file}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700/50 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all cursor-pointer"
              >
                <span>{loading ? 'Uploading PDF...' : 'Proceed to Place Signatures'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Step 2: Builder Canvas and Drag-and-Drop Overlay */}
      {activeStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main PDF Rendering Workspace */}
          <div className="lg:col-span-3 space-y-8 flex flex-col items-center overflow-x-auto py-2">
            {loading && (
              <div className="text-slate-400 py-12 animate-pulse text-sm">Rendering PDF document pages...</div>
            )}
            
            {Array.from({ length: numPages }).map((_, idx) => (
              <div 
                key={idx}
                className="relative bg-slate-900 rounded-xl shadow-2xl border border-slate-800/80 select-none"
                style={{ 
                  width: pagesDim[idx]?.width || 'auto',
                  height: pagesDim[idx]?.height || 'auto'
                }}
                onMouseMove={(e) => handleDragMove(e, idx)}
                onMouseUp={handleDragEnd}
              >
                {/* PDF Page Canvas */}
                <canvas
                  ref={(el) => { canvasRefs.current[idx] = el; }}
                  className="rounded-xl"
                />

                {/* Relative Coordinate Overlay */}
                <div 
                  className="absolute inset-0 w-full h-full pointer-events-auto"
                  onMouseUp={handleDragEnd}
                >
                  {/* Signature field buttons */}
                  <div className="absolute top-4 left-4 z-10">
                    <button
                      onClick={() => addSignatureField(idx)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all cursor-pointer pointer-events-auto"
                    >
                      <Sparkles size={12} />
                      <span>+ Place Signature Box Here</span>
                    </button>
                  </div>

                  {/* Render placed fields for this page */}
                  {fields
                    .filter((f) => f.page === idx)
                    .map((field) => {
                      const dim = pagesDim[idx];
                      if (!dim) return null;

                      // Calculate absolute dimensions
                      const left = field.x * dim.width;
                      const top = field.y * dim.height;
                      const w = field.width * dim.width;
                      const h = field.height * dim.height;

                      const isDragging = draggingFieldId === field.id;

                      return (
                        <div
                          key={field.id}
                          style={{
                            left: `${left}px`,
                            top: `${top}px`,
                            width: `${w}px`,
                            height: `${h}px`,
                          }}
                          className={`absolute flex flex-col justify-between p-2 rounded-lg border-2 select-none drag-element pointer-events-auto transition-all ${
                            isDragging 
                              ? 'border-indigo-400 bg-indigo-500/25 cursor-grabbing scale-102 shadow-lg z-50' 
                              : 'border-dashed border-indigo-500/70 bg-indigo-500/10 cursor-grab hover:bg-indigo-500/20'
                          }`}
                        >
                          <div 
                            className="flex items-center justify-between text-[10px] text-indigo-300 font-bold uppercase tracking-wider select-none"
                            onMouseDown={(e) => handleDragStart(e, field.id, idx)}
                          >
                            <span className="flex items-center space-x-1">
                              <Move size={10} />
                              <span>Signature</span>
                            </span>
                            <button
                              onClick={() => deleteField(field.id)}
                              className="text-indigo-400 hover:text-rose-400 transition-all cursor-pointer pointer-events-auto"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-center flex-1">
                            <span className="text-[11px] font-semibold text-indigo-300 select-none">Place Signature Box</span>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Page Counter tag */}
                <div className="absolute bottom-4 right-4 bg-slate-950/80 px-2 py-1 rounded text-[10px] text-slate-400 font-mono">
                  Page {idx + 1} of {numPages}
                </div>
              </div>
            ))}
          </div>

          {/* Configuration Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass p-6 rounded-2xl border border-slate-800/80 sticky top-28 space-y-6">
              
              {/* Box Placers info */}
              <div className="pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                  <FileSignature size={18} />
                  <h3 className="font-display font-bold text-base text-white">Layout Config</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Click the "+ Place Signature Box" button on any page of the PDF above, then drag the box to the exact signature line.
                </p>
              </div>

              {/* Placed Fields Counter list */}
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Placed Fields ({fields.length})</span>
                {fields.length === 0 ? (
                  <div className="text-center py-4 bg-slate-950/20 border border-dashed border-slate-850 rounded-xl text-slate-500 text-xs">
                    No signature fields placed yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto">
                    {fields.map((f, index) => (
                      <div key={f.id} className="flex items-center justify-between p-2 bg-slate-950/40 rounded-lg border border-slate-850 text-xs">
                        <span className="text-slate-300">Field #{index + 1} (Page {f.page + 1})</span>
                        <button
                          onClick={() => deleteField(f.id)}
                          className="text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recipient Details */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Recipient Details</span>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Recipient Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Users size={12} />
                    </div>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Jane Smith"
                      className="w-full pl-8 pr-3 py-2 bg-slate-950/40 rounded-xl border border-slate-850 text-xs focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Recipient Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail size={12} />
                    </div>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="jane@company.com"
                      className="w-full pl-8 pr-3 py-2 bg-slate-950/40 rounded-xl border border-slate-850 text-xs focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Final Send Actions */}
              <button
                onClick={handleSend}
                disabled={loading || fields.length === 0 || !recipientName || !recipientEmail}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700/50 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all cursor-pointer"
              >
                <Send size={14} />
                <span>Finalize & Send</span>
              </button>

            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default DocumentBuilder;
