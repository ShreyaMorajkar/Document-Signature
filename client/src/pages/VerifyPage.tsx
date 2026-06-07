import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, ArrowLeft, Calendar, 
  MapPin, UserCheck, Smartphone, CheckCircle
} from 'lucide-react';
import api from '../utils/api';

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
      <div className="text-center py-24 text-slate-400 text-sm animate-pulse">
        Loading document verification ledger...
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="max-w-md mx-auto my-16 glass p-8 border border-slate-800 rounded-2xl text-center">
        <ShieldAlert size={48} className="mx-auto text-rose-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Verification Failed</h3>
        <p className="text-sm text-slate-400">
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
          className="p-2 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold text-white mt-0 mb-1">
            Certificate of Authenticity
          </h1>
          <p className="text-xs text-slate-400">
            Verify the cryptographic seal, status, and immutable audit logs of document.
          </p>
        </div>
      </div>

      {/* Main Status Panel */}
      <div className={`glass p-8 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6 ${
        isSigned 
          ? 'border-emerald-500/20 bg-emerald-500/5 glow-indigo' 
          : 'border-amber-500/20 bg-amber-500/5'
      }`}>
        <div className="flex items-center space-x-4 text-center md:text-left flex-col md:flex-row gap-4 md:gap-0">
          <div className={`p-4 rounded-full ${isSigned ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {isSigned ? <ShieldCheck size={44} /> : <ShieldAlert size={44} />}
          </div>
          <div className="md:ml-4">
            <h3 className="font-display text-xl font-bold text-white">
              {isSigned ? 'Digitally Signed & Certified' : 'Document Pending Signature'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              {isSigned 
                ? 'This document contains active digital signature overlays and represents a legally finalized agreement.'
                : 'This document has placeholders set, but has not yet been executed by the recipient.'
              }
            </p>
          </div>
        </div>

        {isSigned && doc.signedPath && (
          <a
            href={`http://localhost:5000/api/docs/download/signed/${doc._id}`}
            className="w-full md:w-auto text-center px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-emerald-500/20"
          >
            Download Certified Copy
          </a>
        )}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* File Info Card */}
        <div className="glass p-6 rounded-2xl border border-slate-800/80 space-y-4">
          <h4 className="font-semibold text-white border-b border-slate-800 pb-2 text-sm">Document Attributes</h4>
          
          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">File Name</span>
              <span className="text-white font-medium truncate max-w-[200px]">{doc.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Document ID</span>
              <span className="text-slate-300 font-mono select-all">{doc._id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <span className={`font-semibold capitalize ${isSigned ? 'text-emerald-400' : 'text-amber-400'}`}>{doc.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Date Uploaded</span>
              <span className="text-slate-300">{new Date(doc.createdAt).toLocaleDateString()}</span>
            </div>

            {doc.originalHash && (
              <div className="flex flex-col space-y-1 pt-2 border-t border-slate-800/60">
                <span className="text-slate-400">Original PDF SHA-256</span>
                <span className="text-[10px] text-slate-300 font-mono break-all select-all bg-slate-950/30 p-2 rounded-lg border border-slate-900">{doc.originalHash}</span>
              </div>
            )}

            {doc.signedHash && (
              <div className="flex flex-col space-y-1 pt-2 border-t border-slate-800/60">
                <span className="text-slate-400">Signed PDF SHA-256</span>
                <span className="text-[10px] text-emerald-400 font-mono break-all select-all bg-slate-950/30 p-2 rounded-lg border border-slate-900">{doc.signedHash}</span>
              </div>
            )}
          </div>
        </div>

        {/* Parties Card */}
        <div className="glass p-6 rounded-2xl border border-slate-800/80 space-y-4">
          <h4 className="font-semibold text-white border-b border-slate-800 pb-2 text-sm">Parties Involved</h4>
          
          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Sender</span>
              <span className="text-white font-medium">{doc.sender?.name} ({doc.sender?.email})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Signer / Recipient</span>
              <span className="text-white font-medium">{doc.recipientName || 'Unassigned'} ({doc.recipientEmail || 'Unassigned'})</span>
            </div>
          </div>
        </div>

      </div>

      {/* Audit Timeline */}
      <div className="glass p-6 rounded-2xl border border-slate-800/80">
        <h4 className="font-semibold text-white border-b border-slate-800 pb-4 text-sm mb-6 flex items-center space-x-2">
          <CheckCircle size={16} className="text-indigo-400" />
          <span>Immutable Audit Ledger</span>
        </h4>

        <div className="relative border-l border-slate-800/80 ml-4 pl-6 space-y-6">
          {doc.auditLog.map((log) => (
            <div key={log._id} className="relative">
              
              {/* Dot */}
              <div className="absolute -left-[32px] top-1.5 w-4 h-4 rounded-full border border-slate-900 bg-indigo-500 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>

              {/* Log Card */}
              <div className="glass bg-slate-950/20 p-4 rounded-xl border border-slate-850 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                  <span className="font-bold text-white uppercase tracking-wider">{log.action}</span>
                  <span className="text-slate-500 flex items-center space-x-1">
                    <Calendar size={12} />
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-medium leading-relaxed">{log.details}</p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 border-t border-slate-900 pt-2 mt-2">
                  <span className="flex items-center space-x-1">
                    <UserCheck size={10} />
                    <span>Actor: {log.actor}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <MapPin size={10} />
                    <span>IP: {log.ip}</span>
                  </span>
                  <span className="flex items-center space-x-1 truncate max-w-[300px]">
                    <Smartphone size={10} />
                    <span>Agent: {log.userAgent}</span>
                  </span>
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
