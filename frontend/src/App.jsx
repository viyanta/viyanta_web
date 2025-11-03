import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import SideMenu from './components/SideMenu.jsx'
import UtilityIcons from './components/UtilityIcons.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ExplorerAllUsers from './pages/ExplorerAllUsers.jsx'
import Profile from './pages/Profile.jsx'
import Login from './pages/Login.jsx'
import { StatsProvider } from './context/StatsContext.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { NavigationProvider } from './context/NavigationContext.jsx'
import Lform from './pages/Lform.jsx'
import DMML2Form from './pages/DMML2Form.jsx'
import Analytics from './pages/Analytics.jsx'
import AnnualData from './pages/AnnualData.jsx'
import Metrics from './pages/Metrics.jsx'
import Documents from './pages/Documents.jsx'
import Peers from './pages/Peers.jsx'
import News from './pages/News.jsx'
// import PDFExtraction from './pages/PDFExtraction.jsx'
import SmartPDFExtraction from './pages/SmartPDFExtraction.jsx'
import InsuranceDashboard from './pages/InsuranceDashboard.jsx'
import InsuranceDataDemo from './pages/InsuranceDataDemo.jsx'

import UserAgreement from './components/UserAgreement.jsx'
import Template from './pages/Template.jsx'
// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading, agreementAccepted, acceptAgreement, logout } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-card">
          <h3>Loading...</h3>
          <p>Authenticating user...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Show user agreement if user is authenticated but hasn't accepted the agreement
  if (user && !agreementAccepted) {
    return (
      <UserAgreement 
        onAccept={acceptAgreement}
        onReject={logout}
      />
    );
  }

  return children;
}

// Admin-only Route Component
function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-card">
          <h3>Loading...</h3>
          <p>Authenticating user...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page. Admin access required.</p>
        <Navigate to="/" replace />
      </div>
    );
  }

  return children;
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);

  return (
    <AuthProvider>
      <StatsProvider>
        <Router>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route path="/*" element={
              <ProtectedRoute>
                <NavigationProvider>
                  <div className="app-container">
                  <Navbar 
                    onMenuClick={openSidebar} 
                  />
                  <div className="layout">
                    <SideMenu isOpen={sidebarOpen} onClose={closeSidebar} />
                    <main 
                      className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`} 
                      onClick={() => sidebarOpen && closeSidebar()}
                    >
                      <Routes>
                        <Route path="/" element={<Navigate to="/insurance-dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard onMenuClick={openSidebar} />} />
                        <Route path="/explorer" element={<ExplorerAllUsers onMenuClick={openSidebar} />} />
                        <Route path="/lform" element={<Lform onMenuClick={openSidebar} />} />
                        <Route path="/analytics" element={<Analytics onMenuClick={openSidebar} />} />
                        <Route path="/annual-data" element={<AnnualData onMenuClick={openSidebar} />} />
                        <Route path="/metrics" element={<Metrics onMenuClick={openSidebar} />} />
                        <Route path="/documents" element={<Documents onMenuClick={openSidebar} />} />
                        <Route path="/template" element={<Template onMenuClick={openSidebar} />} />
                        <Route path="/peers" element={<Peers onMenuClick={openSidebar} />} />
                        <Route path="/news" element={<News onMenuClick={openSidebar} />} />
                        <Route path="/dmm-l2form" element={<DMML2Form onMenuClick={openSidebar} />} />
                        <Route path="/profile" element={<Profile onMenuClick={openSidebar} />} />
                        <Route path="/smart-extraction" element={
                          <AdminRoute>
                            <SmartPDFExtraction onMenuClick={openSidebar} />
                          </AdminRoute>
                        } />
                        {/* <Route path="/extraction" element={<PDFExtraction onMenuClick={openSidebar} />} /> */}
                        <Route path="/insurance-dashboard" element={
                          <InsuranceDashboard 
                            onMenuClick={openSidebar} 
                          />
                        } />
                        <Route path="/insurance-data-demo" element={<InsuranceDataDemo onMenuClick={openSidebar} />} />
                      </Routes>
                    </main>
                  </div>
                  {/* Utility Icons Bar */}
                  <UtilityIcons />
                  {/* Mobile backdrop */}
                  <div className={`backdrop ${sidebarOpen ? 'show' : ''}`} onClick={closeSidebar} />
                  </div>
                </NavigationProvider>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
    </StatsProvider>
  </AuthProvider>
  )
}

export default App
