import React, { useEffect, useRef, useState } from 'react';
import { 
  CheckSquare, Clock, ShieldCheck, AlertTriangle, FileSignature
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import api, { API_BASE_URL } from '../utils/api';
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
      const url = `${API_BASE_URL}/docs/view/${docId}?token=${token}`;
      const loadingTask = pdfjsLib.getDocument({ url });
      const pdf = await loadingTask.promise;
      setNumPages(pdf.numPages);
      
      const dims: PageDimensions[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.2, rotation: page.rotate });
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
      <div className="text-center py-24 text-slate-400 text-xs font-bold uppercase tracking-wider tech-font animate-pulse">
        Loading document signing workspace...
      </div>
    );
  }

  if (!docInfo) {
    return (
      <div className="max-w-md mx-auto my-16 cyber-card p-8 border-2 border-[#1f1f2e] rounded-xl text-center">
        <AlertTriangle size={48} className="mx-auto text-[#f97316] mb-4" />
        <h3 className="text-lg font-black text-white uppercase mb-2">Access Revoked</h3>
        <p className="text-xs text-slate-400 uppercase font-semibold">
          This document signing link is invalid, expired, or the document has been removed by the owner.
        </p>
      </div>
    );
  }

  const allFieldsSigned = fields.length > 0 && Object.keys(signaturesMap).length === fields.length;

  return (
    <div className="space-y-8 px-4 pb-16 max-w-7xl mx-auto">
      
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 pb-6 border-b border-[#1f1f2e]">
        <div>
          <h1 className="font-display text-2xl font-black text-white uppercase mt-0 mb-1">
            Review & Sign Document
          </h1>
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
            Sender: <span className="text-[#f97316] tech-font">{docInfo.recipientEmail}</span> • Name: <span className="text-white font-black">{docInfo.title}</span>
          </p>
        </div>

        {/* Action Panel for Signer */}
        {docInfo.status === 'sent' && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsDeclineOpen(true)}
              className="px-4 py-2.5 bg-black hover:bg-rose-950/20 border border-rose-500/35 hover:border-rose-500 text-rose-400 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Decline to Sign
            </button>
            <button
              onClick={handleFinalize}
              disabled={signingProgress || !allFieldsSigned}
              className="flex items-center space-x-1.5 px-5 py-2.5 cyber-button-primary rounded-lg text-xs font-bold uppercase tracking-wider"
            >
              <CheckSquare size={14} />
              <span>{signingProgress ? 'Finalizing...' : 'Finalize & Sign'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Decline Status Box */}
      {docInfo.status === 'declined' && (
        <div className="p-4 bg-rose-500/10 border-2 border-rose-500/30 rounded-xl flex items-start space-x-3 max-w-xl mx-auto">
          <AlertTriangle size={20} className="text-rose-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-white uppercase">Document Declined</h4>
            <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">
              You declined to sign this document. If this was a mistake, please contact the sender to request a new signature link.
            </p>
          </div>
        </div>
      )}

      {/* Signed Status Box */}
      {docInfo.status === 'signed' && (
        <div className="p-5 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-xl flex items-center justify-between max-w-xl mx-auto">
          <div className="flex items-center space-x-3">
            <ShieldCheck size={28} className="text-emerald-400" />
            <div>
              <h4 className="text-sm font-bold text-white uppercase">Document Signed Successfully</h4>
              <p className="text-xs text-slate-400 mt-0.5 uppercase font-semibold">
                The cryptographic audit log has been sealed and the signed PDF is generated.
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <a
              href={`${API_BASE_URL}/docs/download/signed/${docInfo.id}`}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black border border-emerald-600 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center"
            >
              Download
            </a>
            <button
              onClick={() => setCurrentPage('verify')}
              className="px-3.5 py-2 cyber-button-secondary rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Verify
            </button>
          </div>
        </div>
      )}

      {/* Main Signing Area */}
      {docInfo.status === 'sent' && (
        <div className="flex flex-col items-center py-2 overflow-x-auto space-y-8">
          
          {/* Fields instructions bar */}
          <div className="bg-[#f97316]/10 border border-[#ea580c]/30 px-6 py-3 rounded-lg flex items-center space-x-2 text-xs text-[#f97316] font-bold uppercase tracking-wider tech-font">
            <Clock size={14} className="animate-spin" />
            <span>
              Click highlighted boxes to place your signature. 
              ({Object.keys(signaturesMap).length} of {fields.length} completed)
            </span>
          </div>

          {Array.from({ length: numPages }).map((_, idx) => (
            <div
              key={idx}
              className="relative bg-slate-950 rounded-lg shadow-2xl border-2 border-[#1f1f2e] select-none"
              style={{
                width: pagesDim[idx]?.width || 'auto',
                height: pagesDim[idx]?.height || 'auto'
              }}
            >
              {/* Render PDF Canvas */}
              <canvas
                ref={(el) => { canvasRefs.current[idx] = el; }}
                className="rounded-lg"
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
                        className={`absolute flex flex-col justify-center items-center rounded border-2 transition-all cursor-pointer z-10 pointer-events-auto overflow-hidden ${
                          sigImage
                            ? 'border-emerald-500/50 bg-white/5 shadow-inner'
                            : 'border-dashed border-[#f97316] bg-[#f97316]/10 hover:bg-[#f97316]/25 animate-pulse'
                        }`}
                      >
                        {sigImage ? (
                          <img 
                            src={sigImage} 
                            alt="Signature"
                            className="max-w-full max-h-full object-contain pointer-events-none"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-[#f97316] flex items-center space-x-1 uppercase tracking-wider select-none tech-font">
                            <FileSignature size={10} />
                            <span>Sign Here</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Page indicator */}
              <div className="absolute bottom-4 right-4 bg-black border border-[#1f1f2e] px-2 py-1 rounded text-[10px] text-slate-400 font-mono">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="cyber-card w-full max-w-md rounded-xl p-6 space-y-4">
            <h3 className="font-display font-black text-lg text-white uppercase">Decline signing this document?</h3>
            <p className="text-xs text-slate-400 uppercase font-semibold">
              Please state why you are declining to sign this agreement. The sender will receive this feedback.
            </p>
            
            <form onSubmit={handleDecline} className="space-y-4">
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. The payment terms do not match our discussions."
                rows={4}
                className="w-full px-4 py-3 cyber-input rounded-lg text-xs shadow-inner resize-none"
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
                  className="px-4 py-2 bg-black border border-[#1f1f2e] text-slate-400 hover:text-white rounded-lg text-xs uppercase font-bold tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={signingProgress || !declineReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 border border-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
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
