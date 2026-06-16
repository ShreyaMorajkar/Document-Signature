import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, ArrowLeft, Calendar, CheckCircle
} from 'lucide-react';
import api, { API_BASE_URL } from '../utils/api';

interface AuditLog {
  _id: string;
  timestamp: string;
  action: string;
  actor: string;
  ip: string;
  userAgent: string;
  details: string;
}

interface DocInfo {
  _id: string;
  title: string;
  status: string;
  originalPath: string;
  originalHash?: string;
  signedPath?: string;
  signedHash?: string;
  recipientName: string;
  recipientEmail: string;
  sender: {
    _id: string;
    name: string;
    email: string;
  };
  auditLog: AuditLog[];
  createdAt: string;
}

interface VerifyPageProps {
  documentId: string;
  setCurrentPage: (page: string) => void;
}

const VerifyPage: React.FC<VerifyPageProps> = ({ documentId, setCurrentPage }) => {
  const [doc, setDoc] = useState<DocInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const response = await api.get(`/docs/verify/${documentId}`);
        setDoc(response.data);
      } catch (err: any) {
        console.error('Failed to load verification:', err);
      } finally {
        setLoading(false);
      }
    };
    if (documentId) fetchVerification();
  }, [documentId]);

  if (loading) {
    return (
      <div className="text-center py-24 text-slate-400 text-xs font-bold uppercase tracking-wider tech-font animate-pulse">
        Loading document verification ledger...
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="max-w-md mx-auto my-16 cyber-card p-8 border-2 border-[#1f1f2e] rounded-xl text-center">
        <ShieldAlert size={48} className="mx-auto text-[#f97316] mb-4" />
        <h3 className="text-lg font-black text-white uppercase mb-2">Verification Failed</h3>
        <p className="text-xs text-slate-400 uppercase font-semibold">
          We could not locate a digital signature record matching the identifier provided. 
          The document may have been deleted, or is not yet finalized.
        </p>
      </div>
    );
  }

  const isSigned = doc.status === 'signed';

  return (
    <div className="space-y-8 px-4 pb-16 max-w-4xl mx-auto">
      
      {/* Header bar */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setCurrentPage('dashboard')}
          className="p-2 bg-black hover:bg-slate-900 border border-[#1f1f2e] text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="font-display text-2xl font-black text-white uppercase mt-0 mb-1">
            Certificate of Authenticity
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Verify the cryptographic seal, status, and immutable audit logs of the document.
          </p>
        </div>
      </div>

      {/* Main Status Panel */}
      <div className={`cyber-card p-8 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 ${
        isSigned 
          ? 'border-emerald-500/30 bg-emerald-500/5' 
          : 'border-[#f97316]/30 bg-[#f97316]/5'
      }`}>
        <div className="flex items-center text-center md:text-left flex-col md:flex-row gap-4 md:gap-0">
          <div className={`p-4 rounded-lg border ${isSigned ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-[#f97316]/10 text-[#f97316] border-[#ea580c]/30'}`}>
            {isSigned ? <ShieldCheck size={36} /> : <ShieldAlert size={36} />}
          </div>
          <div className="md:ml-4">
            <h3 className="font-display text-xl font-black text-white uppercase">
              {isSigned ? 'Digitally Signed & Certified' : 'Document Pending Signature'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md uppercase font-semibold leading-relaxed">
              {isSigned 
                ? 'This document contains active digital signature overlays and represents a legally finalized agreement.'
                : 'This document has placeholders set, but has not yet been executed by the recipient.'
              }
            </p>
          </div>
        </div>

        {isSigned && doc.signedPath && (
          <a
            href={`${API_BASE_URL}/docs/download/signed/${doc._id}`}
            className="w-full md:w-auto text-center py-3.5 px-6 cyber-button-primary rounded-lg text-xs font-bold uppercase tracking-wider"
          >
            Download Certified Copy
          </a>
        )}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* File Info Card */}
        <div className="cyber-card p-6 rounded-xl space-y-4">
          <h4 className="font-bold text-white border-b border-[#1f1f2e] pb-2 text-xs uppercase tracking-wider">Document Attributes</h4>
          
          <div className="space-y-3 text-xs uppercase font-bold text-slate-400">
            <div className="flex justify-between">
              <span>File Name</span>
              <span className="text-white truncate max-w-[200px]">{doc.title}</span>
            </div>
            <div className="flex justify-between">
              <span>Document ID</span>
              <span className="text-slate-300 font-mono select-all">{doc._id}</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span className={`font-black ${isSigned ? 'text-emerald-400' : 'text-[#f97316]'}`}>{doc.status}</span>
            </div>
            <div className="flex justify-between">
              <span>Date Uploaded</span>
              <span className="text-slate-300 tech-font">{new Date(doc.createdAt).toLocaleDateString()}</span>
            </div>

            {doc.originalHash && (
              <div className="flex flex-col space-y-1 pt-2 border-t border-[#1f1f2e]">
                <span className="text-slate-400">Original PDF SHA-256</span>
                <span className="text-[10px] text-slate-300 font-mono break-all select-all bg-black p-2 rounded border border-[#1f1f2e]">{doc.originalHash}</span>
              </div>
            )}

            {doc.signedHash && (
              <div className="flex flex-col space-y-1 pt-2 border-t border-[#1f1f2e]">
                <span className="text-slate-400">Signed PDF SHA-256</span>
                <span className="text-[10px] text-emerald-400 font-mono break-all select-all bg-black p-2 rounded border border-[#1f1f2e]">{doc.signedHash}</span>
              </div>
            )}
          </div>
        </div>

        {/* Parties Card */}
        <div className="cyber-card p-6 rounded-xl space-y-4">
          <h4 className="font-bold text-white border-b border-[#1f1f2e] pb-2 text-xs uppercase tracking-wider">Parties Involved</h4>
          
          <div className="space-y-3 text-xs uppercase font-bold text-slate-400">
            <div className="flex justify-between">
              <span>Sender</span>
              <span className="text-white">{doc.sender?.name} ({doc.sender?.email})</span>
            </div>
            <div className="flex justify-between">
              <span>Signer / Recipient</span>
              <span className="text-white">{doc.recipientName || 'Unassigned'} ({doc.recipientEmail || 'Unassigned'})</span>
            </div>
          </div>
        </div>

      </div>

      {/* Audit Timeline */}
      <div className="cyber-card p-6 rounded-xl">
        <h4 className="font-bold text-white border-b border-[#1f1f2e] pb-4 text-xs uppercase tracking-wider mb-6 flex items-center space-x-2">
          <CheckCircle size={14} className="text-[#f97316]" />
          <span>Immutable Audit Ledger</span>
        </h4>

        <div className="relative border-l-2 border-[#1f1f2e] ml-4 pl-6 space-y-6">
          {doc.auditLog.map((log) => (
            <div key={log._id} className="relative">
              
              {/* Dot */}
              <div className="absolute -left-[32px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-black bg-[#f97316] flex items-center justify-center" />

              {/* Log Card */}
              <div className="bg-black p-4 rounded-lg border border-[#1f1f2e] space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                  <span className="font-bold text-white uppercase tracking-wider tech-font">{log.action}</span>
                  <span className="text-slate-500 flex items-center space-x-1 tech-font">
                    <Calendar size={12} />
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-medium leading-relaxed">{log.details}</p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 border-t border-[#121216] pt-2 mt-2 tech-font">
                  <span>Actor: {log.actor}</span>
                  <span>IP: {log.ip}</span>
                  <span className="truncate max-w-[300px]">Agent: {log.userAgent}</span>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default VerifyPage;
