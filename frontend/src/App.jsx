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
            <main className="main-content" onClick={() => sidebarOpen && closeSidebar()}>
              <Routes>
                <Route path="/" element={<Dashboard onMenuClick={openSidebar} />} />
                <Route path="/explorer" element={<Explorer onMenuClick={openSidebar} />} />
                <Route path="/lform" element={<Lform onMenuClick={openSidebar} />} />
                <Route path="/profile" element={<Profile onMenuClick={openSidebar} />} />
                <Route path="/smart-extraction" element={<SmartPDFExtraction onMenuClick={openSidebar} />} />
                <Route path="/extraction" element={<PDFExtraction onMenuClick={openSidebar} />} />
                <Route path="/insurance-dashboard" element={<InsuranceDashboard onMenuClick={openSidebar} />} />
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
