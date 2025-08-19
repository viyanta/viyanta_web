import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import SideMenu from './components/SideMenu.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ExplorerAllUsers from './pages/ExplorerAllUsers.jsx'
import Profile from './pages/Profile.jsx'
import Login from './pages/Login.jsx'
import { StatsProvider } from './context/StatsContext.jsx'
import { UserProvider } from './context/UserContext.jsx'
import Lform from './pages/Lform.jsx'
import DMML2Form from './pages/DMML2Form.jsx'
import PDFExtraction from './pages/PDFExtraction.jsx'
import SmartPDFExtraction from './pages/SmartPDFExtraction.jsx'
import InsuranceDashboard from './pages/InsuranceDashboard.jsx'
import InsuranceDataDemo from './pages/InsuranceDataDemo.jsx'
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

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);

  return (
<<<<<<< HEAD
    <UserProvider>
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
                        <Route path="/" element={<Dashboard onMenuClick={openSidebar} />} />
                        <Route path="/explorer" element={<Explorer onMenuClick={openSidebar} />} />
                        <Route path="/lform" element={<Lform onMenuClick={openSidebar} />} />
                        <Route path="/dmm-l2form" element={<DMML2Form onMenuClick={openSidebar} />} />
                        <Route path="/profile" element={<Profile onMenuClick={openSidebar} />} />
                        <Route path="/smart-extraction" element={<SmartPDFExtraction onMenuClick={openSidebar} />} />
                        <Route path="/extraction" element={<PDFExtraction onMenuClick={openSidebar} />} />
                        <Route path="/insurance-dashboard" element={<InsuranceDashboard onMenuClick={openSidebar} />} />
                        <Route path="/insurance-data-demo" element={<InsuranceDataDemo onMenuClick={openSidebar} />} />
                      </Routes>
                    </main>
                  </div>
                  {/* Mobile backdrop */}
                  <div className={`backdrop ${sidebarOpen ? 'show' : ''}`} onClick={closeSidebar} />
=======
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
                      <Route path="/" element={<Dashboard onMenuClick={openSidebar} />} />
                      <Route path="/explorer" element={<ExplorerAllUsers onMenuClick={openSidebar} />} />
                      <Route path="/lform" element={<Lform onMenuClick={openSidebar} />} />
                      <Route path="/dmm-l2form" element={<DMML2Form onMenuClick={openSidebar} />} />
                      <Route path="/profile" element={<Profile onMenuClick={openSidebar} />} />
                      <Route path="/smart-extraction" element={<SmartPDFExtraction onMenuClick={openSidebar} />} />
                      <Route path="/extraction" element={<PDFExtraction onMenuClick={openSidebar} />} />
                      <Route path="/insurance-dashboard" element={<InsuranceDashboard onMenuClick={openSidebar} />} />
                      <Route path="/insurance-data-demo" element={<InsuranceDataDemo onMenuClick={openSidebar} />} />
                    </Routes>
                  </main>
>>>>>>> e23839e (vikki:the data fetches and display from s3)
                </div>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </StatsProvider>
    </UserProvider>
  )
}

export default App
