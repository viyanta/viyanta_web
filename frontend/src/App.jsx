import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import SideMenu from './components/SideMenu.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Explorer from './pages/Explorer.jsx'
import Profile from './pages/Profile.jsx'
import { StatsProvider } from './context/StatsContext.jsx'
import Lform from './pages/Lform.jsx'
import InsuranceDashboard from './pages/InsuranceDashboard.jsx'

function App() {
  return (
    <StatsProvider>
      <Router>
        <div style={{ 
          minHeight: '100vh',
          backgroundColor: 'var(--background-color)'
        }}>
          <Navbar />
          <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)' }}>
            <SideMenu />
            <main style={{ 
              flex: 1, 
              padding: '2rem',
              backgroundColor: 'white',
              minHeight: 'calc(100vh - 80px)',
              overflowY: 'auto'
            }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/explorer" element={<Explorer />} />
                <Route path="/lform" element={<Lform />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/insurance-dashboard" element={<InsuranceDashboard />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </StatsProvider>
  )
}

export default App
