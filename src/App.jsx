import React, { useState } from 'react';
import './styles/global.css';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Prontuario from './pages/Prontuario';
import Financeiro from './pages/Financeiro';
import Estoque from './pages/Estoque';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':   return <Dashboard onNavigate={setCurrentPage} />;
      case 'agenda':      return <Agenda />;
      case 'prontuario':  return <Prontuario />;
      case 'financeiro':  return <Financeiro />;
      case 'estoque':     return <Estoque />;
      case 'relatorios':  return <Estoque />;
      case 'pacientes':   return <Prontuario />;
      default:            return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  const isMobile = window.innerWidth <= 768;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {!isMobile && <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />}
      <div style={{ flex: 1, paddingBottom: isMobile ? 64 : 0, minWidth: 0 }}>
        {renderPage()}
      </div>
      {isMobile && <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />}
    </div>
  );
}
