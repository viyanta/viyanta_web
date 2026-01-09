import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import SideMenu from './components/SideMenu.jsx'
import UtilityIcons from './components/UtilityIcons.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ExplorerAllUsers from './pages/ExplorerAllUsers.jsx'
import Profile from './pages/Profile.jsx'
import Subscription from './pages/Subscription.jsx'
import Login from './pages/Login.jsx'
import Welcome from './pages/Welcome.jsx'
import SignUp from './pages/SignUp.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { NavigationProvider } from './context/NavigationContext.jsx'
import { StatsProvider } from './context/StatsContext.jsx'
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
import EconomyDashboard from './pages/EconomyDashboard.jsx'
import EconomyDomestic from './pages/EconomyDomestic.jsx'
import EconomyInternational from './pages/EconomyInternational.jsx'
import IndustryMetricsDashboard from './pages/IndustryMetricsDashboard'; // Industry Metrics Dashboard
import {
  IrdaiDashboardPage,
  IrdaiCompanywisePage,
  IrdaiPremiumWisePage,
  IrdaiMarketSharePage,
  IrdaiGrowthPage,
  IrdaiMonthwisePage,
  IrdaiPvtVsPublicPage,
  IrdaiAnalyticsPage,
  IrdaiDocumentsPage,
  IrdaiPeersPage
} from './pages/IrdaiPages';
import IndustryMetricsDomestic from './pages/IndustryMetricsDomestic.jsx'
import IndustryMetricsInternational from './pages/IndustryMetricsInternational.jsx'
import MetricsDomestic from './pages/MetricsDomestic.jsx'
import IrdaiMonthlyData from './pages/IrdaiMonthlyData.jsx'

import UserAgreement from './components/UserAgreement.jsx'
import Template from './pages/Template.jsx'

import AdminPanel from './components/AdminPanel';

// Component to prevent duplicate windows per user (email-based)
// function DuplicateWindowPreventer() {
//   const { user, loading } = useAuth();

//   useEffect(() => {
//     // Only run if user is logged in
//     if (loading || !user || !user.email) {
//       return;
//     }

//     const userEmail = user.email.toLowerCase().trim();
//     const channelName = `viyanta-app-window-${userEmail}`;
//     const storageKey = `viyanta-window-check-${userEmail}`;
//     const windowSessionKey = `viyanta-window-session-${userEmail}`;

//     let broadcastChannel;
//     let isPrimaryWindow = false;
//     let checkInterval;
//     let heartbeatInterval;
//     let shouldClose = false;

//     // Generate unique window identifier - ALWAYS generate new, never reuse
//     // This ensures each tab/window gets a unique ID, even when duplicated
//     const generateUniqueWindowId = () => {
//       // Use multiple sources to ensure uniqueness
//       const uniqueId = `win_${performance.now()}_${Date.now()}_${Math.random().toString(36).substr(2, 15)}_${Math.random().toString(36).substr(2, 15)}`;
//       return uniqueId;
//     };

//     const windowId = generateUniqueWindowId();
//     const now = Date.now();

//     // IMMEDIATE CHECK - Check if another window is already active BEFORE we claim
//     const existingCheck = localStorage.getItem(storageKey);
//     if (existingCheck) {
//       try {
//         const data = JSON.parse(existingCheck);
//         // If another window is active (within last 2 seconds), we're a duplicate
//         if (data.userEmail === userEmail && 
//             data.windowId !== windowId && // Must be different window
//             now - data.timestamp < 2000) { // Very recent (within 2 seconds)
//           console.log('Duplicate window detected - another window is active, closing immediately...');
//           alert(`Another instance is already open for ${userEmail}. Closing this duplicate window.`);
//           window.close();
//           setTimeout(() => {
//             if (document.visibilityState !== 'hidden') {
//               window.location.href = 'about:blank';
//             }
//           }, 300);
//           return; // Exit immediately
//         }
//       } catch (e) {
//         // If parsing fails, continue (might be stale data)
//       }
//     }

//     // IMMEDIATELY claim this window as active (we passed the check)
//     try {
//       localStorage.setItem(storageKey, JSON.stringify({
//         type: 'window-exists',
//         windowId: windowId,
//         userEmail: userEmail,
//         timestamp: now
//       }));
//     } catch (e) {
//       // If we can't write, continue anyway
//     }

//     const closeDuplicateWindow = () => {
//       if (shouldClose) return;
//       shouldClose = true;
//       console.log(`Another window detected for user ${userEmail}, closing this duplicate window`);
//       alert(`Another instance of this application is already open for ${userEmail}. Please use that window instead.`);

//       // Try to close the window
//       window.close();

//       // If window.close() doesn't work (e.g., window wasn't opened by script), redirect to blank
//       setTimeout(() => {
//         if (document.visibilityState !== 'hidden') {
//           window.location.href = 'about:blank';
//         }
//       }, 1000);
//     };

//     try {
//       // Use BroadcastChannel if available (modern browsers)
//       if (typeof BroadcastChannel !== 'undefined') {
//         broadcastChannel = new BroadcastChannel(channelName);

//         let responseReceived = false;
//         let activeWindows = new Set();

//         // Listen for other windows of the same user
//         broadcastChannel.onmessage = (event) => {
//           const data = event.data;

//           if (data.type === 'window-check' && data.userEmail === userEmail) {
//             // Another window is checking, respond that we exist (if we're primary)
//             if (isPrimaryWindow) {
//               broadcastChannel.postMessage({
//                 type: 'window-exists',
//                 windowId: windowId,
//                 userEmail: userEmail,
//                 timestamp: Date.now()
//               });
//             }
//           } else if (data.type === 'window-exists' && 
//                      data.userEmail === userEmail) {
//             // Track active windows (excluding our own window ID)
//             if (data.windowId !== windowId) {
//               activeWindows.add(data.windowId);
//               responseReceived = true;
//               if (!isPrimaryWindow) {
//                 closeDuplicateWindow();
//               }
//             }
//           } else if (data.type === 'window-closed' && data.userEmail === userEmail) {
//             // A window closed, remove it from active set
//             if (data.windowId) {
//               activeWindows.delete(data.windowId);
//             }
//           }
//         };

//         // Check if other windows exist immediately
//         broadcastChannel.postMessage({
//           type: 'window-check',
//           windowId: windowId,
//           userEmail: userEmail,
//           timestamp: Date.now()
//         });

//         // Wait a bit to see if we get a response (shorter timeout for faster detection)
//         setTimeout(() => {
//           if (!responseReceived || activeWindows.size === 0) {
//             // No other window responded, we're the primary
//             isPrimaryWindow = true;
//             console.log(`This window is now primary for user ${userEmail}`);
//           } else {
//             // Another window responded, we should close immediately
//             closeDuplicateWindow();
//           }
//         }, 500); // Reduced from 1000ms to 500ms for faster detection
//       }

//       // Fallback: Use localStorage events (works in all browsers)
//       const handleStorageChange = (e) => {
//         if (e.key === storageKey && e.newValue) {
//           try {
//             const data = JSON.parse(e.newValue);
//             // Only react if it's from a different window (different tab/window)
//             if (data.windowId !== windowId &&
//                 data.type === 'window-exists' && 
//                 data.userEmail === userEmail &&
//                 Date.now() - data.timestamp < 3000) {
//               // Another window exists and is active for the same user (within 3 seconds)
//               if (!isPrimaryWindow) {
//                 closeDuplicateWindow();
//               }
//             }
//           } catch (parseError) {
//             // Ignore parsing errors
//           }
//         }
//       };

//       window.addEventListener('storage', handleStorageChange);

//       // Send heartbeat via localStorage
//       const sendHeartbeat = () => {
//         if (shouldClose) return;
//         try {
//           localStorage.setItem(storageKey, JSON.stringify({
//             type: 'window-exists',
//             windowId: windowId,
//             userEmail: userEmail,
//             timestamp: Date.now()
//           }));
//         } catch (e) {
//           // Ignore storage errors
//         }
//       };

//       // Check for existing windows on startup (with longer timeout for refresh detection)
//       const checkExistingWindow = () => {
//         try {
//           const lastCheck = localStorage.getItem(storageKey);
//           if (lastCheck) {
//             const data = JSON.parse(lastCheck);
//             // Only close if it's a different window AND recent (within 3 seconds - more aggressive)
//             if (data.windowId !== windowId &&
//                 data.userEmail === userEmail && 
//                 Date.now() - data.timestamp < 3000) {
//               // Another window is active (responded within 3 seconds) for the same user
//               closeDuplicateWindow();
//               return;
//             }
//           }
//           // No active window found for this user, or this is a refresh of the same window
//           if (!isPrimaryWindow) {
//             isPrimaryWindow = true;
//             sendHeartbeat();
//           }
//         } catch (e) {
//           // Ignore parsing errors
//           if (!isPrimaryWindow) {
//             isPrimaryWindow = true;
//             sendHeartbeat();
//           }
//         }
//       };

//       // Initial check immediately and then again after a short delay
//       checkExistingWindow(); // Run immediately
//       setTimeout(checkExistingWindow, 300); // Run again after 300ms

//       // Send heartbeat more frequently (only if we're primary)
//       heartbeatInterval = setInterval(() => {
//         if (isPrimaryWindow && !shouldClose) {
//           sendHeartbeat();
//         }
//       }, 1000); // Reduced from 2000ms to 1000ms for more frequent updates

//       // Handle page unload - notify other windows
//       const handleBeforeUnload = () => {
//         if (broadcastChannel && isPrimaryWindow) {
//           broadcastChannel.postMessage({
//             type: 'window-closed',
//             windowId: windowId,
//             userEmail: userEmail,
//             timestamp: Date.now()
//           });
//         }
//         // Clear storage on unload (but allow refresh)
//         try {
//           // Only clear if it's our window ID (not a refresh or duplicate)
//           const lastCheck = localStorage.getItem(storageKey);
//           if (lastCheck) {
//             const data = JSON.parse(lastCheck);
//             if (data.windowId === windowId) {
//               localStorage.removeItem(storageKey);
//             }
//           }
//         } catch (e) {
//           // Ignore cleanup errors
//         }
//       };

//       window.addEventListener('beforeunload', handleBeforeUnload);

//       // Cleanup
//       return () => {
//         if (broadcastChannel) {
//           if (isPrimaryWindow) {
//             broadcastChannel.postMessage({
//               type: 'window-closed',
//               windowId: windowId,
//               userEmail: userEmail,
//               timestamp: Date.now()
//             });
//           }
//           broadcastChannel.close();
//         }
//         window.removeEventListener('storage', handleStorageChange);
//         window.removeEventListener('beforeunload', handleBeforeUnload);
//         if (checkInterval) {
//           clearInterval(checkInterval);
//         }
//         if (heartbeatInterval) {
//           clearInterval(heartbeatInterval);
//         }
//       };
//     } catch (error) {
//       console.error('Error setting up duplicate window prevention:', error);
//     }
//   }, [user, loading]); // Re-run when user changes

//   return null; // This component doesn't render anything
// }
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
    return <Navigate to="/welcome" replace />;
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
    return <Navigate to="/welcome" replace />;
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
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Welcome />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes */}
          <Route path="/*" element={
            <ProtectedRoute>
              <NavigationProvider>
                <StatsProvider>
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
                          <Route path="/admin" element={
                            <AdminRoute>
                              <AdminPanel />
                            </AdminRoute>
                          } />
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
                          <Route path="/subscription" element={<Subscription onMenuClick={openSidebar} />} />
                          <Route path="/smart-extraction" element={<SmartPDFExtraction onMenuClick={openSidebar} />} />
                          {/* <Route path="/extraction" element={<PDFExtraction onMenuClick={openSidebar} />} /> */}
                          <Route path="/insurance-dashboard" element={
                            <InsuranceDashboard
                              onMenuClick={openSidebar}
                            />
                          } />
                          <Route path="/insurance-data-demo" element={<InsuranceDataDemo onMenuClick={openSidebar} />} />
                          <Route path="/economy-dashboard" element={<EconomyDashboard onMenuClick={openSidebar} />} />
                          <Route path="/economy-domestic" element={<EconomyDomestic onMenuClick={openSidebar} />} />
                          <Route path="/economy-international" element={<EconomyInternational onMenuClick={openSidebar} />} />
                          <Route path="/industry-metrics-dashboard" element={<IndustryMetricsDashboard onMenuClick={openSidebar} />} />
                          <Route path="/industry-metrics-domestic" element={<IndustryMetricsDomestic onMenuClick={openSidebar} />} />
                          <Route path="/industry-metrics-international" element={<IndustryMetricsInternational onMenuClick={openSidebar} />} />
                          <Route path="/irdai-monthly-data" element={<IrdaiDashboardPage />} />
                          <Route path="/irdai-monthly-dashboard" element={<IrdaiDashboardPage />} />
                          <Route path="/irdai-companywise" element={<IrdaiCompanywisePage />} />
                          <Route path="/irdai-premium-wise" element={<IrdaiPremiumWisePage />} />
                          <Route path="/irdai-market-share" element={<IrdaiMarketSharePage />} />
                          <Route path="/irdai-growth" element={<IrdaiGrowthPage />} />
                          <Route path="/irdai-monthwise" element={<IrdaiMonthwisePage />} />
                          <Route path="/irdai-pvt-vs-public" element={<IrdaiPvtVsPublicPage />} />
                          <Route path="/irdai-analytics" element={<IrdaiAnalyticsPage />} />
                          <Route path="/irdai-documents" element={<IrdaiDocumentsPage />} />
                          <Route path="/irdai-peers" element={<IrdaiPeersPage />} />
                          <Route path="/metrics-domestic" element={<MetricsDomestic onMenuClick={openSidebar} />} />
                        </Routes>
                      </main>
                    </div>
                    {/* Utility Icons Bar */}
                    <UtilityIcons />
                    {/* Mobile backdrop */}
                    <div className={`backdrop ${sidebarOpen ? 'show' : ''}`} onClick={closeSidebar} />
                  </div>
                </StatsProvider>
              </NavigationProvider>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
