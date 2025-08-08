import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import SideMenu from './components/SideMenu.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Explorer from './pages/Explorer.jsx'
import Profile from './pages/Profile.jsx'
import Login from './pages/Login.jsx'
import { StatsProvider } from './context/StatsContext.jsx'
import Lform from './pages/Lform.jsx'
import PDFExtraction from './pages/PDFExtraction.jsx'
import SmartPDFExtraction from './pages/SmartPDFExtraction.jsx'
import InsuranceDashboard from './pages/InsuranceDashboard.jsx'
import { subscribeToAuthChanges } from './firebase/auth.js'

// Protected Route Component
function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((authUser) => {
      setUser(authUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: 'var(--background-color)'
      }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3>Loading...</h3>
          <p>Authenticating user...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);

  return (
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
                  <main className="main-content" onClick={closeSidebar}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/explorer" element={<Explorer />} />
                      <Route path="/lform" element={<Lform />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/smart-extraction" element={<SmartPDFExtraction />} />
                      <Route path="/extraction" element={<PDFExtraction />} />
                      <Route path="/insurance-dashboard" element={<InsuranceDashboard />} />
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
  )
}

export default App
