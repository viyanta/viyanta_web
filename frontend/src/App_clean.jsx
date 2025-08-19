import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import SideMenu from './components/SideMenu.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ExplorerAllUsers from './pages/ExplorerAllUsers.jsx'
import Profile from './pages/Profile.jsx'
import Login from './pages/Login.jsx'
import { StatsProvider } from './context/StatsContext.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import Lform from './pages/Lform.jsx'
import DMML2Form from './pages/DMML2Form.jsx'
import PDFExtraction from './pages/PDFExtraction.jsx'
import SmartPDFExtraction from './pages/SmartPDFExtraction.jsx'
import InsuranceDashboard from './pages/InsuranceDashboard.jsx'
import InsuranceDataDemo from './pages/InsuranceDataDemo.jsx'

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

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

  return user ? children : <Navigate to="/login" replace />;
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
                <div className="app-container">
                  <Navbar onMenuClick={openSidebar} />
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
                        <Route path="/dmm-l2form" element={<DMML2Form onMenuClick={openSidebar} />} />
                        <Route path="/profile" element={<Profile onMenuClick={openSidebar} />} />
                        <Route path="/smart-extraction" element={
                          <AdminRoute>
                            <SmartPDFExtraction onMenuClick={openSidebar} />
                          </AdminRoute>
                        } />
                        <Route path="/extraction" element={<PDFExtraction onMenuClick={openSidebar} />} />
                        <Route path="/insurance-dashboard" element={<InsuranceDashboard onMenuClick={openSidebar} />} />
                        <Route path="/insurance-data-demo" element={<InsuranceDataDemo onMenuClick={openSidebar} />} />
                      </Routes>
                    </main>
                  </div>
                  {/* Mobile backdrop */}
                  <div className={`backdrop ${sidebarOpen ? 'show' : ''}`} onClick={closeSidebar} />
                </div>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </StatsProvider>
    </AuthProvider>
  )
}

export default App
