import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import SideMenu from './components/SideMenu.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Explorer from './pages/Explorer.jsx'
import Profile from './pages/Profile.jsx'
import { StatsProvider } from './context/StatsContext.jsx'
import Lform from './pages/Lform.jsx'
import PDFExtraction from './pages/PDFExtraction.jsx'

import SmartPDFExtraction from './pages/SmartPDFExtraction.jsx'

import InsuranceDashboard from './pages/InsuranceDashboard.jsx'

function App() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);

  return (
    <StatsProvider>
      <Router>
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
      </Router>
    </StatsProvider>
  )
}

export default App
