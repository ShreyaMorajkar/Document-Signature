import React, { useEffect, useState } from 'react';
import { 
  FileText, Clock, CheckCircle, XCircle, FilePlus, Copy, Download, 
  ExternalLink, ListOrdered, Calendar, Mail, FileCheck, HelpCircle
} from 'lucide-react';
import api, { API_BASE_URL } from '../utils/api';

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
        return <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border border-slate-700 bg-slate-900/60 text-slate-400 tech-font">Draft</span>;
      case 'sent':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border border-[#f97316]/35 bg-[#f97316]/10 text-[#f97316] tech-font">Pending</span>;
      case 'signed':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-500/35 bg-emerald-500/10 text-emerald-400 tech-font">Signed</span>;
      case 'declined':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border border-rose-500/35 bg-rose-500/10 text-rose-400 tech-font">Declined</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 px-4 pb-12 max-w-7xl mx-auto">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight text-white uppercase mt-0 mb-2">
            Document Center
          </h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Upload, place signature boxes, send, and track signing history in real-time.
          </p>
        </div>
        <button
          onClick={() => setCurrentPage('builder')}
          className="flex items-center justify-center space-x-2 py-3 px-5 cyber-button-primary rounded-lg text-xs font-bold uppercase tracking-wider w-full md:w-auto self-start"
        >
          <FilePlus size={16} />
          <span>New Document</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="cyber-card p-5 rounded-lg flex flex-col justify-between hover:border-slate-700">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-505">Total</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black font-display text-white">{stats.total}</span>
            <FileText size={16} className="text-[#f97316]" />
          </div>
        </div>
        
        <div className="cyber-card p-5 rounded-lg flex flex-col justify-between hover:border-slate-700">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Drafts</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black font-display text-slate-400">{stats.drafts}</span>
            <FileText size={16} className="text-slate-500" />
          </div>
        </div>

        <div className="cyber-card p-5 rounded-lg flex flex-col justify-between hover:border-slate-700">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pending</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black font-display text-[#f97316]">{stats.sent}</span>
            <Clock size={16} className="text-[#f97316]" />
          </div>
        </div>

        <div className="cyber-card p-5 rounded-lg flex flex-col justify-between hover:border-[#10b981]/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Signed</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black font-display text-emerald-400">{stats.signed}</span>
            <CheckCircle size={16} className="text-emerald-400" />
          </div>
        </div>

        <div className="cyber-card p-5 rounded-lg flex flex-col justify-between hover:border-rose-500/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Declined</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black font-display text-rose-400">{stats.declined}</span>
            <XCircle size={16} className="text-rose-400" />
          </div>
        </div>
      </div>

      {/* Main workspace section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Document list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="cyber-card p-6 rounded-xl">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 pb-6 border-b border-[#1f1f2e] mb-6 gap-4">
              {/* Tab Selector */}
              <div className="flex flex-wrap gap-2">
                {(['all', 'draft', 'sent', 'signed', 'declined'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                      statusFilter === tab
                        ? 'bg-[#f97316] text-black border-[#ea580c] font-black'
                        : 'text-slate-400 hover:text-white border-transparent hover:border-[#1f1f2e] bg-black'
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
                placeholder="Search ledger..."
                className="px-4 py-2 cyber-input rounded-lg text-sm w-full md:max-w-xs"
              />
            </div>

            {/* List */}
            {loading ? (
              <div className="text-center py-12 text-slate-500 text-xs font-bold uppercase tracking-wider tech-font animate-pulse">Loading Document Ledger...</div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <FileText size={48} className="mx-auto mb-4 text-slate-800" />
                <p className="text-xs uppercase font-bold tracking-wider">No matching records found.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1f1f2e]">
                {filteredDocs.map((doc) => (
                  <div key={doc._id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <h4 
                          className="font-bold text-white text-base hover:text-[#f97316] cursor-pointer transition-colors"
                          onClick={() => setSelectedAuditDoc(doc)}
                        >
                          {doc.title}
                        </h4>
                        {getStatusBadge(doc.status)}
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <span className="flex items-center space-x-1">
                          <Calendar size={10} />
                          <span className="tech-font">{new Date(doc.createdAt).toLocaleDateString()}</span>
                        </span>
                        
                        {(doc.status !== 'draft') && (
                          <span className="flex items-center space-x-1">
                            <Mail size={10} />
                            <span>{doc.recipientName} ({doc.recipientEmail})</span>
                          </span>
                        )}

                        {doc.status === 'declined' && doc.declineReason && (
                          <span className="text-rose-400 font-bold tech-font">[REASON: {doc.declineReason}]</span>
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
                          className="px-3.5 py-2 cyber-button-secondary rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Configure Layout
                        </button>
                      )}

                      {doc.status === 'sent' && doc.signingToken && (
                        <>
                          <button
                            onClick={() => copySigningLink(doc.signingToken!)}
                            className="p-2 bg-black hover:bg-[#f97316] hover:text-black border border-[#1f1f2e] hover:border-[#ea580c] text-slate-400 hover:scale-102 transition-all rounded-lg cursor-pointer"
                            title="Copy Signing URL"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedToken(doc.signingToken!);
                              setCurrentPage('sign-portal');
                            }}
                            className="p-2 bg-black hover:bg-[#f97316] hover:text-black border border-[#1f1f2e] hover:border-[#ea580c] text-[#f97316] hover:scale-102 transition-all rounded-lg cursor-pointer"
                            title="Go to Sign Portal"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </>
                      )}

                      {doc.status === 'signed' && (
                        <>
                          <a
                            href={`${API_BASE_URL}/docs/download/signed/${doc._id}`}
                            className="p-2 bg-black hover:bg-emerald-500 hover:text-black border border-[#1f1f2e] hover:border-emerald-600 text-emerald-400 hover:scale-102 transition-all rounded-lg cursor-pointer flex items-center"
                            title="Download Signed PDF"
                          >
                            <Download size={14} />
                          </a>
                          <button
                            onClick={() => {
                              setSelectedDocId(doc._id);
                              setCurrentPage('verify');
                            }}
                            className="p-2 bg-black hover:bg-[#f97316] hover:text-black border border-[#1f1f2e] hover:border-[#ea580c] text-[#f97316] hover:scale-102 transition-all rounded-lg cursor-pointer"
                            title="Verify Certificate"
                          >
                            <FileCheck size={14} />
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => setSelectedAuditDoc(doc)}
                        className="px-3 py-2 bg-black hover:bg-slate-900 border border-[#1f1f2e] text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                      >
                        Audit
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
          <div className="cyber-card p-6 rounded-xl h-full flex flex-col justify-between min-h-[400px]">
            <div>
              <div className="flex items-center space-x-2 pb-4 border-b border-[#1f1f2e] mb-6">
                <ListOrdered size={16} className="text-[#f97316]" />
                <h3 className="font-display font-black text-lg text-white uppercase">History Ledger</h3>
              </div>

              {selectedAuditDoc ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-[#f97316] text-sm truncate uppercase">{selectedAuditDoc.title}</h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-1 truncate">ID: {selectedAuditDoc._id}</p>
                  </div>
                  
                  {/* Timeline */}
                  <div className="relative border-l-2 border-[#1f1f2e] ml-2 pl-4 space-y-5">
                    {selectedAuditDoc.auditLog.map((log) => (
                      <div key={log._id} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[24px] top-1.5 w-3 h-3 rounded-full border-2 border-black bg-[#f97316] flex items-center justify-center" />
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 tech-font">
                              {log.action}
                            </span>
                            <span className="text-[9px] text-slate-500 tech-font">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{log.details}</p>
                          <p className="text-[9px] text-slate-500 tech-font uppercase">By: {log.actor}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-600 flex flex-col items-center">
                  <HelpCircle size={40} className="mb-2 text-slate-900" />
                  <p className="text-[10px] uppercase font-bold tracking-wider leading-relaxed max-w-[200px] mx-auto text-slate-500">
                    Select "Audit" or click a document title to view the timeline.
                  </p>
                </div>
              )}
            </div>

            {selectedAuditDoc && (
              <button
                onClick={() => setSelectedAuditDoc(null)}
                className="w-full text-center py-2 bg-black hover:bg-slate-900 text-xs font-bold uppercase tracking-wider border border-[#1f1f2e] text-slate-500 hover:text-white rounded-lg transition-all mt-6 cursor-pointer"
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
