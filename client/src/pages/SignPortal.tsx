import React, { useEffect, useRef, useState } from 'react';
import { 
  CheckSquare, Clock, ShieldCheck, AlertTriangle, FileSignature
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import api from '../utils/api';
import SignaturePad from '../components/SignaturePad';

// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs`;

interface SignPortalProps {
  token: string;
  setCurrentPage: (page: string) => void;
}

interface DocInfo {
  id: string;
  title: string;
  recipientName: string;
  recipientEmail: string;
  status: string;
}

interface SigField {
  _id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  status: 'pending' | 'signed';
  signatureImage?: string;
}

interface PageDimensions {
  width: number;
  height: number;
}

const SignPortal: React.FC<SignPortalProps> = ({ token, setCurrentPage }) => {
  const [docInfo, setDocInfo] = useState<DocInfo | null>(null);
  const [fields, setFields] = useState<SigField[]>([]);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(0);
  const [pagesDim, setPagesDim] = useState<PageDimensions[]>([]);

  // Dialog states
  const [isPadOpen, setIsPadOpen] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [isDeclineOpen, setIsDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  
  // Custom signed images mapped: { fieldId: base64DataUrl }
  const [signaturesMap, setSignaturesMap] = useState<Record<string, string>>({});
  const [signingProgress, setSigningProgress] = useState(false);

  // Refs for rendering canvases
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    if (token) {
      fetchSigningInfo();
    }
  }, [token]);

  const fetchSigningInfo = async () => {
    try {
      const response = await api.get(`/docs/sign/${token}`);
      setDocInfo(response.data.document);
      setFields(response.data.fields);
      loadPDF(response.data.document.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to fetch signature portal info.');
      setLoading(false);
    }
  };

  const loadPDF = async (docId: string) => {
    try {
      const url = `http://localhost:5000/api/docs/view/${docId}?token=${token}`;
      const loadingTask = pdfjsLib.getDocument({ url });
      const pdf = await loadingTask.promise;
      setNumPages(pdf.numPages);
      
      const dims: PageDimensions[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.2 });
        dims.push({ width: viewport.width, height: viewport.height });

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
    } finally {
      setLoading(false);
    }
  };

  // Click on a placeholder box
  const handleBoxClick = (fieldId: string) => {
    setActiveFieldId(fieldId);
    setIsPadOpen(true);
  };

  // Signature pad save callback
  const handleSignatureSave = (dataUrl: string) => {
    if (activeFieldId) {
      setSignaturesMap({
        ...signaturesMap,
        [activeFieldId]: dataUrl
      });
    }
    setIsPadOpen(false);
    setActiveFieldId(null);
  };

  // Submit all signatures to backend
  const handleFinalize = async () => {
    // Check if all fields are signed
    const totalFields = fields.length;
    const signedFieldsCount = Object.keys(signaturesMap).length;

    if (signedFieldsCount < totalFields) {
      alert(`Please sign all (${totalFields}) signature blocks before finalizing.`);
      return;
    }

    setSigningProgress(true);
    try {
      const payload = Object.entries(signaturesMap).map(([fieldId, img]) => ({
        fieldId,
        signatureImage: img
      }));

      await api.post(`/docs/sign/${token}`, { signatures: payload });
      alert('Document signed and completed successfully!');
      
      // Refresh state to show completed status
      fetchSigningInfo();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit signatures.');
    } finally {
      setSigningProgress(false);
    }
  };

  // Decline Document
  const handleDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineReason.trim()) {
      alert('Please state a reason for declining.');
      return;
    }

    setSigningProgress(true);
    try {
      await api.post(`/docs/decline/${token}`, { reason: declineReason });
      alert('You have declined to sign this document.');
      setIsDeclineOpen(false);
      fetchSigningInfo();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to decline document.');
    } finally {
      setSigningProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24 text-slate-400 text-sm animate-pulse">
        Loading document signing workspace...
      </div>
    );
  }

  if (!docInfo) {
    return (
      <div className="max-w-md mx-auto my-16 glass p-8 border border-slate-800 rounded-2xl text-center">
        <AlertTriangle size={48} className="mx-auto text-rose-500 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Invalid Access Link</h3>
        <p className="text-sm text-slate-400">
          This document signing link is invalid, expired, or the document has been removed by the owner.
        </p>
      </div>
    );
  }

  const allFieldsSigned = fields.length > 0 && Object.keys(signaturesMap).length === fields.length;

  return (
    <div className="space-y-8 px-4 pb-16 max-w-7xl mx-auto">
      
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="font-display text-2xl font-bold text-white mt-0 mb-1">
            Review & Sign Document
          </h1>
          <p className="text-xs text-slate-400">
            Sender: <span className="text-indigo-400">{docInfo.recipientEmail}</span> • Document Name: <span className="text-white font-medium">{docInfo.title}</span>
          </p>
        </div>

        {/* Action Panel for Signer */}
        {docInfo.status === 'sent' && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsDeclineOpen(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-rose-950/20 border border-slate-850 hover:border-rose-900/50 text-rose-400 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Decline to Sign
            </button>
            <button
              onClick={handleFinalize}
              disabled={signingProgress || !allFieldsSigned}
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700/30 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer"
            >
              <CheckSquare size={14} />
              <span>{signingProgress ? 'Finalizing...' : 'Finalize & Sign'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Decline Status Box */}
      {docInfo.status === 'declined' && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start space-x-3 max-w-xl mx-auto">
          <AlertTriangle size={20} className="text-rose-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-white">Document Declined</h4>
            <p className="text-xs text-slate-400 mt-1">
              You declined to sign this document. If this was a mistake, please contact the sender to send a new signature link.
            </p>
          </div>
        </div>
      )}

      {/* Signed Status Box */}
      {docInfo.status === 'signed' && (
        <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between max-w-xl mx-auto glow-indigo">
          <div className="flex items-center space-x-3">
            <ShieldCheck size={28} className="text-emerald-400" />
            <div>
              <h4 className="text-sm font-bold text-white">Document Signed Successfully</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                The cryptographic audit log has been sealed and the signed PDF is generated.
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <a
              href={`http://localhost:5000/api/docs/download/signed/${docInfo.id}`}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center"
            >
              Download PDF
            </a>
            <button
              onClick={() => setCurrentPage('verify')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Verify Certificate
            </button>
          </div>
        </div>
      )}

      {/* Main Signing Area */}
      {docInfo.status === 'sent' && (
        <div className="flex flex-col items-center py-2 overflow-x-auto space-y-8">
          
          {/* Fields instructions bar */}
          <div className="bg-indigo-950/20 border border-indigo-900/30 px-6 py-3 rounded-2xl flex items-center space-x-2 text-xs text-indigo-400">
            <Clock size={14} className="animate-spin" />
            <span>
              Please click on the highlighted boxes to place your signature. 
              ({Object.keys(signaturesMap).length} of {fields.length} completed)
            </span>
          </div>

          {Array.from({ length: numPages }).map((_, idx) => (
            <div
              key={idx}
              className="relative bg-slate-900 rounded-xl shadow-2xl border border-slate-800/80 select-none"
              style={{
                width: pagesDim[idx]?.width || 'auto',
                height: pagesDim[idx]?.height || 'auto'
              }}
            >
              {/* Render PDF Canvas */}
              <canvas
                ref={(el) => { canvasRefs.current[idx] = el; }}
                className="rounded-xl"
              />

              {/* Interaction Overlay */}
              <div className="absolute inset-0 w-full h-full pointer-events-auto">
                {fields
                  .filter((f) => f.page === idx)
                  .map((field) => {
                    const dim = pagesDim[idx];
                    if (!dim) return null;

                    // Absolute sizing
                    const left = field.x * dim.width;
                    const top = field.y * dim.height;
                    const w = field.width * dim.width;
                    const h = field.height * dim.height;

                    const sigImage = signaturesMap[field._id];

                    return (
                      <div
                        key={field._id}
                        onClick={() => handleBoxClick(field._id)}
                        style={{
                          left: `${left}px`,
                          top: `${top}px`,
                          width: `${w}px`,
                          height: `${h}px`,
                        }}
                        className={`absolute flex flex-col justify-center items-center rounded-lg border-2 transition-all cursor-pointer z-10 pointer-events-auto overflow-hidden ${
                          sigImage
                            ? 'border-emerald-500/50 bg-white/5 shadow-inner'
                            : 'border-dashed border-amber-500 bg-amber-500/10 hover:bg-amber-500/25 animate-pulse'
                        }`}
                      >
                        {sigImage ? (
                          <img 
                            src={sigImage} 
                            alt="Signature"
                            className="max-w-full max-h-full object-contain pointer-events-none"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-amber-300 flex items-center space-x-1 uppercase tracking-wider select-none">
                            <FileSignature size={10} />
                            <span>Sign Here</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Page indicator */}
              <div className="absolute bottom-4 right-4 bg-slate-950/80 px-2 py-1 rounded text-[10px] text-slate-400 font-mono">
                Page {idx + 1} of {numPages}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Signature Capture Modal */}
      <SignaturePad
        isOpen={isPadOpen}
        onClose={() => {
          setIsPadOpen(false);
          setActiveFieldId(null);
        }}
        onSave={handleSignatureSave}
      />

      {/* Decline Reason Modal */}
      {isDeclineOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 p-6 space-y-4">
            <h3 className="font-display font-bold text-lg text-white">Decline signing this document?</h3>
            <p className="text-xs text-slate-400">
              Please state why you are declining to sign this agreement. The sender will receive this feedback.
            </p>
            
            <form onSubmit={handleDecline} className="space-y-4">
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. The payment terms do not match our original invoice discussions."
                rows={4}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 shadow-inner resize-none"
                maxLength={250}
                required
              />

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeclineOpen(false);
                    setDeclineReason('');
                  }}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={signingProgress || !declineReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900/30 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Confirm Decline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SignPortal;
