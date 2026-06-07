import React, { useEffect, useState } from 'react';
import { 
  FileText, Clock, CheckCircle, XCircle, FilePlus, Copy, Download, 
  ExternalLink, ListOrdered, Calendar, Mail, FileCheck, HelpCircle
} from 'lucide-react';
import api from '../utils/api';

interface AuditEntry {
  _id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
}

interface Document {
  _id: string;
  title: string;
  status: 'draft' | 'sent' | 'signed' | 'declined';
  recipientName?: string;
  recipientEmail?: string;
  signingToken?: string;
  declineReason?: string;
  createdAt: string;
  auditLog: AuditEntry[];
}

interface DashboardProps {
  setCurrentPage: (page: string) => void;
  setSelectedDocId: (id: string) => void;
  setSelectedToken: (token: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  setCurrentPage, 
  setSelectedDocId, 
  setSelectedToken 
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'signed' | 'declined'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuditDoc, setSelectedAuditDoc] = useState<Document | null>(null);

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      const response = await api.get('/docs');
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Copy Signing Link
  const copySigningLink = (token: string) => {
    const link = `${window.location.origin}/sign/${token}`;
    navigator.clipboard.writeText(link);
    alert('Signing link copied to clipboard!');
  };

  // Stats Counters
  const stats = {
    total: documents.length,
    drafts: documents.filter(d => d.status === 'draft').length,
    sent: documents.filter(d => d.status === 'sent').length,
    signed: documents.filter(d => d.status === 'signed').length,
    declined: documents.filter(d => d.status === 'declined').length,
  };

  // Filtered documents list
  const filteredDocs = documents.filter((doc) => {
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.recipientName && doc.recipientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.recipientEmail && doc.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-400 border border-slate-700/50">Draft</span>;
      case 'sent':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending Signature</span>;
      case 'signed':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Signed & Valid</span>;
      case 'declined':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Declined</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 px-4 pb-12 max-w-7xl mx-auto">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white mb-2 mt-0">
            Document Center
          </h1>
          <p className="text-sm text-slate-400">
            Upload, place signature boxes, send, and track signing history in real-time.
          </p>
        </div>
        <button
          onClick={() => setCurrentPage('builder')}
          className="flex items-center justify-center space-x-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all cursor-pointer w-full md:w-auto self-start"
        >
          <FilePlus size={18} />
          <span>New Document</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-bold font-display text-white">{stats.total}</span>
            <FileText size={16} className="text-indigo-400" />
          </div>
        </div>
        
        <div className="glass p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Drafts</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-bold font-display text-slate-300">{stats.drafts}</span>
            <FileText size={16} className="text-slate-500" />
          </div>
        </div>

        <div className="glass p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-bold font-display text-amber-400">{stats.sent}</span>
            <Clock size={16} className="text-amber-400" />
          </div>
        </div>

        <div className="glass p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Signed</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-bold font-display text-emerald-400">{stats.signed}</span>
            <CheckCircle size={16} className="text-emerald-400" />
          </div>
        </div>

        <div className="glass p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Declined</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-bold font-display text-rose-400">{stats.declined}</span>
            <XCircle size={16} className="text-rose-400" />
          </div>
        </div>
      </div>

      {/* Main workspace section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Document list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass p-6 rounded-2xl border border-slate-800/80">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 pb-6 border-b border-slate-800/80 mb-6 gap-4">
              {/* Tab Selector */}
              <div className="flex flex-wrap gap-2">
                {(['all', 'draft', 'sent', 'signed', 'declined'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      statusFilter === tab
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                        : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Search bar */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents or recipient..."
                className="px-4 py-2 bg-slate-950/40 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-500 text-white w-full md:max-w-xs"
              />
            </div>

            {/* List */}
            {loading ? (
              <div className="text-center py-12 text-slate-500 text-sm animate-pulse">Loading documents...</div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <FileText size={48} className="mx-auto mb-4 text-slate-700" />
                <p className="text-sm">No documents found matching the criteria.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {filteredDocs.map((doc) => (
                  <div key={doc._id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-white text-base hover:text-indigo-400 cursor-pointer" onClick={() => setSelectedAuditDoc(doc)}>
                          {doc.title}
                        </h4>
                        {getStatusBadge(doc.status)}
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Calendar size={12} />
                          <span>Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</span>
                        </span>
                        
                        {(doc.status !== 'draft') && (
                          <span className="flex items-center space-x-1">
                            <Mail size={12} />
                            <span>Recipient: {doc.recipientName} ({doc.recipientEmail})</span>
                          </span>
                        )}

                        {doc.status === 'declined' && doc.declineReason && (
                          <span className="text-rose-400 font-medium">Reason: {doc.declineReason}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="flex items-center space-x-2 self-start md:self-auto">
                      {doc.status === 'draft' && (
                        <button
                          onClick={() => {
                            setSelectedDocId(doc._id);
                            setCurrentPage('builder');
                          }}
                          className="px-3.5 py-2 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 hover:border-indigo-500 text-indigo-400 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        >
                          Configure Layout
                        </button>
                      )}

                      {doc.status === 'sent' && doc.signingToken && (
                        <>
                          <button
                            onClick={() => copySigningLink(doc.signingToken!)}
                            className="p-2 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer"
                            title="Copy Signing URL"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedToken(doc.signingToken!);
                              setCurrentPage('sign-portal');
                            }}
                            className="p-2 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 text-indigo-400 hover:text-indigo-300 rounded-lg transition-all cursor-pointer"
                            title="Go to Sign Portal"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </>
                      )}

                      {doc.status === 'signed' && (
                        <>
                          <a
                            href={`http://localhost:5000/api/docs/download/signed/${doc._id}`}
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-white rounded-lg transition-all cursor-pointer flex items-center"
                            title="Download Signed PDF"
                          >
                            <Download size={14} />
                          </a>
                          <button
                            onClick={() => {
                              setSelectedDocId(doc._id);
                              setCurrentPage('verify');
                            }}
                            className="p-2 bg-indigo-500/10 hover:bg-indigo-505 border border-indigo-500/20 hover:border-indigo-500 text-indigo-400 hover:text-white rounded-lg transition-all cursor-pointer"
                            title="Verify Cryptographic Hash & Audit Trail"
                          >
                            <FileCheck size={14} />
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => setSelectedAuditDoc(doc)}
                        className="px-2.5 py-2 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer"
                      >
                        Audit Trail
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* Audit Trail Sidebar Panel */}
        <div className="lg:col-span-1">
          <div className="glass p-6 rounded-2xl border border-slate-800/80 h-full flex flex-col justify-between min-h-[400px]">
            <div>
              <div className="flex items-center space-x-2 pb-4 border-b border-slate-800 mb-6">
                <ListOrdered size={18} className="text-indigo-400" />
                <h3 className="font-display font-bold text-lg text-white">History & Auditing</h3>
              </div>

              {selectedAuditDoc ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-indigo-400 text-sm truncate">{selectedAuditDoc.title}</h4>
                    <p className="text-[11px] text-slate-500 font-mono mt-1 truncate">ID: {selectedAuditDoc._id}</p>
                  </div>
                  
                  {/* Timeline */}
                  <div className="relative border-l border-slate-800 ml-2.5 pl-5 space-y-5">
                    {selectedAuditDoc.auditLog.map((log) => (
                      <div key={log._id} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[26px] top-1.5 w-3.5 h-3.5 rounded-full border border-slate-900 bg-indigo-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              {log.action}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{log.details}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">By: {log.actor}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-600 flex flex-col items-center">
                  <HelpCircle size={40} className="mb-2 text-slate-800" />
                  <p className="text-xs leading-relaxed max-w-[200px] mx-auto">
                    Select "Audit Trail" or click a document title to load its immutable history log.
                  </p>
                </div>
              )}
            </div>

            {selectedAuditDoc && (
              <button
                onClick={() => setSelectedAuditDoc(null)}
                className="w-full text-center py-2 bg-slate-900/60 hover:bg-slate-850 hover:text-white border border-slate-800 text-xs text-slate-400 rounded-xl transition-all mt-6 cursor-pointer"
              >
                Clear History View
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
