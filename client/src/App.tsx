import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DocumentBuilder from './pages/DocumentBuilder';
import SignPortal from './pages/SignPortal';
import VerifyPage from './pages/VerifyPage';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('login');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<string>('');

  // Client-side routing logic
  useEffect(() => {
    const handleRouting = () => {
      const path = window.location.pathname;
      const matchSign = path.match(/^\/sign\/([^/]+)/);
      const matchVerify = path.match(/^\/verify\/([^/]+)/);

      if (matchSign) {
        setSelectedToken(matchSign[1]);
        setCurrentPage('sign-portal');
      } else if (matchVerify) {
        setSelectedDocId(matchVerify[1]);
        setCurrentPage('verify');
      } else {
        const token = localStorage.getItem('token');
        setCurrentPage(token ? 'dashboard' : 'login');
      }
    };

    handleRouting();
    window.addEventListener('popstate', handleRouting);
    return () => window.removeEventListener('popstate', handleRouting);
  }, []);

  // Custom setter that updates history pushState to maintain correct browser URLs
  const navigate = (page: string, param?: string) => {
    let url = '/';
    if (page === 'sign-portal' && param) {
      url = `/sign/${param}`;
      setSelectedToken(param);
    } else if (page === 'verify' && param) {
      url = `/verify/${param}`;
      setSelectedDocId(param);
    }
    
    window.history.pushState({}, '', url);
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <Login setCurrentPage={(p) => navigate(p)} />;
      case 'dashboard':
        return (
          <ProtectedRoute setCurrentPage={(p) => navigate(p)}>
            <Dashboard 
              setCurrentPage={(p) => navigate(p)} 
              setSelectedDocId={setSelectedDocId}
              setSelectedToken={setSelectedToken}
            />
          </ProtectedRoute>
        );
      case 'builder':
        return (
          <ProtectedRoute setCurrentPage={(p) => navigate(p)}>
            <DocumentBuilder 
              documentId={selectedDocId} 
              setCurrentPage={(p) => navigate(p)}
              setSelectedDocId={setSelectedDocId}
            />
          </ProtectedRoute>
        );
      case 'sign-portal':
        return (
          <SignPortal 
            token={selectedToken} 
            setCurrentPage={(p) => navigate(p)} 
          />
        );
      case 'verify':
        return (
          <VerifyPage 
            documentId={selectedDocId || ''} 
            setCurrentPage={(p) => navigate(p)} 
          />
        );
      default:
        return <Login setCurrentPage={(p) => navigate(p)} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar currentPage={currentPage} setCurrentPage={(p) => navigate(p)} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {renderPage()}
      </main>
      <footer className="py-6 border-t border-slate-800/40 text-center text-xs text-slate-500 mt-12 bg-slate-950/20">
        © 2026 SignFlow Digital Trust Systems. Sealed, audited, and secured.
      </footer>
    </div>
  );
};

export default App;
