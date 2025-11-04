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

// Component to prevent duplicate windows per user (email-based)
function DuplicateWindowPreventer() {
  const { user, loading } = useAuth();
  
  useEffect(() => {
    // Only run if user is logged in
    if (loading || !user || !user.email) {
      return;
    }
    
    const userEmail = user.email.toLowerCase().trim();
    const channelName = `viyanta-app-window-${userEmail}`;
    const storageKey = `viyanta-window-check-${userEmail}`;
    const windowSessionKey = `viyanta-window-session-${userEmail}`;
    
    let broadcastChannel;
    let isPrimaryWindow = false;
    let windowId = `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let checkInterval;
    let heartbeatInterval;
    let shouldClose = false;
    
    // Check if this is a page refresh (same session) or a duplicated tab
    const getSessionId = () => {
      try {
        let sessionId = sessionStorage.getItem(windowSessionKey);
        let windowUuid = sessionStorage.getItem(`${windowSessionKey}_uuid`);
        
        // If UUID doesn't exist, this is a new tab/window (not a refresh)
        if (!windowUuid) {
          windowUuid = `uuid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage.setItem(`${windowSessionKey}_uuid`, windowUuid);
        }
        
        // Check if sessionId exists but is very old (likely a duplicated tab)
        if (sessionId) {
          const sessionData = JSON.parse(sessionId);
          const sessionAge = Date.now() - sessionData.timestamp;
          // If session is older than 1 second, it might be from a duplicated tab
          if (sessionAge > 1000) {
            // This might be a duplicated tab, generate new session
            sessionId = null;
          }
        }
        
        if (!sessionId) {
          // Generate new session ID for this tab/window
          sessionId = JSON.stringify({
            id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            uuid: windowUuid
          });
          sessionStorage.setItem(windowSessionKey, sessionId);
        }
        
        const sessionData = JSON.parse(sessionId);
        return {
          sessionId: sessionData.id,
          uuid: windowUuid,
          timestamp: sessionData.timestamp
        };
      } catch (e) {
        // Fallback if sessionStorage not available
        const uuid = `uuid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return {
          sessionId: sessionId,
          uuid: uuid,
          timestamp: Date.now()
        };
      }
    };
    
    const sessionInfo = getSessionId();
    const sessionId = sessionInfo.sessionId;
    const windowUuid = sessionInfo.uuid;
    
    const closeDuplicateWindow = () => {
      if (shouldClose) return;
      shouldClose = true;
      console.log(`Another window detected for user ${userEmail}, closing this duplicate window`);
      alert(`Another instance of this application is already open for ${userEmail}. Please use that window instead.`);
      
      // Try to close the window
      window.close();
      
      // If window.close() doesn't work (e.g., window wasn't opened by script), redirect to blank
      setTimeout(() => {
        if (document.visibilityState !== 'hidden') {
          window.location.href = 'about:blank';
        }
      }, 1000);
    };
    
    try {
      // Use BroadcastChannel if available (modern browsers)
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel(channelName);
        
        let responseReceived = false;
        let activeWindows = new Set();
        
        // Listen for other windows of the same user
        broadcastChannel.onmessage = (event) => {
          const data = event.data;
          
          if (data.type === 'window-check' && data.userEmail === userEmail) {
            // Another window is checking, respond that we exist (if we're primary)
            if (isPrimaryWindow) {
              broadcastChannel.postMessage({
                type: 'window-exists',
                windowId: windowId,
                sessionId: sessionId,
                windowUuid: windowUuid,
                userEmail: userEmail,
                timestamp: Date.now()
              });
            }
          } else if (data.type === 'window-exists' && 
                     data.userEmail === userEmail) {
            // Track active windows (excluding our own session and UUID)
            if (data.sessionId !== sessionId && data.windowUuid !== windowUuid) {
              activeWindows.add(data.sessionId);
              responseReceived = true;
              if (!isPrimaryWindow) {
                closeDuplicateWindow();
              }
            }
          } else if (data.type === 'window-closed' && data.userEmail === userEmail) {
            // A window closed, remove it from active set
            if (data.sessionId) {
              activeWindows.delete(data.sessionId);
            }
          }
        };
        
        // Check if other windows exist immediately
        broadcastChannel.postMessage({
          type: 'window-check',
          windowId: windowId,
          sessionId: sessionId,
          windowUuid: windowUuid,
          userEmail: userEmail,
          timestamp: Date.now()
        });
        
        // Wait a bit to see if we get a response
        setTimeout(() => {
          if (!responseReceived || activeWindows.size === 0) {
            // No other window responded, we're the primary
            isPrimaryWindow = true;
            console.log(`This window is now primary for user ${userEmail}`);
          } else {
            // Another window responded, we should close
            if (!isPrimaryWindow) {
              closeDuplicateWindow();
            }
          }
        }, 1000);
      }
      
      // Fallback: Use localStorage events (works in all browsers)
      const handleStorageChange = (e) => {
        if (e.key === storageKey && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            // Only react if it's from a different session or UUID (different tab/window)
            if (data.sessionId !== sessionId && 
                data.windowUuid !== windowUuid &&
                data.type === 'window-exists' && 
                data.userEmail === userEmail &&
                Date.now() - data.timestamp < 5000) {
              // Another window exists and is active for the same user (within 5 seconds)
              if (!isPrimaryWindow) {
                closeDuplicateWindow();
              }
            }
          } catch (parseError) {
            // Ignore parsing errors
          }
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      // Send heartbeat via localStorage
      const sendHeartbeat = () => {
        if (shouldClose) return;
        try {
          localStorage.setItem(storageKey, JSON.stringify({
            type: 'window-exists',
            windowId: windowId,
            sessionId: sessionId,
            windowUuid: windowUuid,
            userEmail: userEmail,
            timestamp: Date.now()
          }));
        } catch (e) {
          // Ignore storage errors
        }
      };
      
      // Check for existing windows on startup (with longer timeout for refresh detection)
      const checkExistingWindow = () => {
        try {
          const lastCheck = localStorage.getItem(storageKey);
          if (lastCheck) {
            const data = JSON.parse(lastCheck);
            // Only close if it's a different session/UUID AND recent (within 5 seconds)
            if (data.sessionId !== sessionId && 
                data.windowUuid !== windowUuid &&
                data.userEmail === userEmail && 
                Date.now() - data.timestamp < 5000) {
              // Another window is active (responded within 5 seconds) for the same user
              closeDuplicateWindow();
              return;
            }
          }
          // No active window found for this user, or this is a refresh of the same window
          if (!isPrimaryWindow) {
            isPrimaryWindow = true;
            sendHeartbeat();
          }
        } catch (e) {
          // Ignore parsing errors
          if (!isPrimaryWindow) {
            isPrimaryWindow = true;
            sendHeartbeat();
          }
        }
      };
      
      // Initial check after a delay (longer to allow for refresh scenarios)
      setTimeout(checkExistingWindow, 1000);
      
      // Send heartbeat periodically (only if we're primary)
      heartbeatInterval = setInterval(() => {
        if (isPrimaryWindow && !shouldClose) {
          sendHeartbeat();
        }
      }, 2000);
      
      // Handle page unload - notify other windows
      const handleBeforeUnload = () => {
        if (broadcastChannel && isPrimaryWindow) {
          broadcastChannel.postMessage({
            type: 'window-closed',
            sessionId: sessionId,
            windowUuid: windowUuid,
            userEmail: userEmail,
            timestamp: Date.now()
          });
        }
        // Clear storage on unload (but allow refresh)
        try {
          // Only clear if it's our session and UUID (not a refresh or duplicate)
          const lastCheck = localStorage.getItem(storageKey);
          if (lastCheck) {
            const data = JSON.parse(lastCheck);
            if (data.sessionId === sessionId && data.windowUuid === windowUuid) {
              localStorage.removeItem(storageKey);
            }
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Cleanup
      return () => {
        if (broadcastChannel) {
          if (isPrimaryWindow) {
            broadcastChannel.postMessage({
              type: 'window-closed',
              sessionId: sessionId,
              windowUuid: windowUuid,
              userEmail: userEmail,
              timestamp: Date.now()
            });
          }
          broadcastChannel.close();
        }
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (checkInterval) {
          clearInterval(checkInterval);
        }
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
      };
    } catch (error) {
      console.error('Error setting up duplicate window prevention:', error);
    }
  }, [user, loading]); // Re-run when user changes
  
  return null; // This component doesn't render anything
}
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
        <DuplicateWindowPreventer />
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
