// imporfunction SideMenu({ isOpen = false, onClose = () => {} }) {
//   const location = useLocation();
//   const { stats } = useStats();
//   const [user, setUser] = useState(null);
//   const [isAdmin, setIsAdmin] = useState(false);

//   // Admin users configuration
//   const ADMIN_USERS = [
//     'admin@viyanta.com',
//     'superadmin@viyanta.com',
//     // Add more admin emails as needed
//   ];

//   useEffect(() => {
//     const unsubscribe = subscribeToAuthChanges((authUser) => {
//       setUser(authUser);
//       if (authUser && authUser.email) {
//         setIsAdmin(ADMIN_USERS.includes(authUser.email.toLowerCase()));
//       } else {
//         setIsAdmin(false);
//       }
//     });
//     return unsubscribe;
//   }, []);

//   const menuItems = [
//     { path: '/', label: 'Insurance Dashboard', icon: '🏦', description: 'KPI & Analytics' },
//     { path: '/explorer', label: 'Maker-Checker (All Users)', icon: '👥', description: 'Browse All Users Data' },
//     { path: '/smart-extraction', label: 'Smart Extraction (Admin)', icon: '🚀', description: 'AI-Powered PDF Extraction', adminOnly: true },
//     { path: '/insurance-data-demo', label: 'Insurance Data Table', icon: '📊', description: 'Interactive Data Analytics' },
//     { path: '/lform', label: 'Lform', icon: '📝', description: 'Form Management' },
//     { path: '/dmm-l2form', label: 'DMM L2 Form', icon: '📊', description: 'Data Management Module' },
//     { path: '/dashboard', label: 'Original Dashboard', icon: '📈', description: 'Overview & Analytics' },
//     { path: '/profile', label: 'Profile', icon: '👤', description: 'User Settings' }
//   ];

//   // Filter menu items based on admin status
//   const filteredMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);State, useEffect } from 'react'
// import { Link, useLocation } from 'react-router-dom'
// import { useStats } from '../context/StatsContext.jsx'
// import { subscribeToAuthChanges } from '../firebase/auth.js'

// function SideMenu({ isOpen = false, onClose = () => {} }) {
//   const location = useLocation();
//   const { stats } = useStats();

//   const menuItems = [
//     { path: '/', label: 'Dashboard', icon: '📊', description: 'Overview & Analytics' },
//     { path: '/explorer', label: 'Maker-Checker (All Users)', icon: '�', description: 'Browse All Users Data' },
//     { path: '/smart-extraction', label: 'Smart Extraction', icon: '🚀', description: 'AI-Powered PDF Extraction' },
//     { path: '/lform', label: 'Lform', icon: '📝', description: 'Form Management' },
//     { path: '/dmm-l2form', label: 'DMM L2 Form', icon: '📊', description: 'Data Management Module' },
//     { path: '/insurance-dashboard', label: 'Insurance Dashboard', icon: '🏦', description: 'KPI & Analytics' },
//     { path: '/insurance-data-demo', label: 'Insurance Data Table', icon: '📊', description: 'Interactive Data Analytics' },
//     { path: '/profile', label: 'Profile', icon: '👤', description: 'User Settings' }
//   ];

//   const isActiveRoute = (path) => location.pathname === path;

//   return (
//     <aside className={`sidebar ${isOpen ? 'open' : ''}`} role="navigation" aria-label="Sidebar Navigation">
//       {/* Mobile-only header */}
//       <div className="sidebar__mobile-header">
//         <button
//           className="sidebar__close-button"
//           onClick={onClose}
//           aria-label="Close menu"
//         >
//           ✕
//         </button>
//       </div>

//       <div className="sidebar__header">
//         <h2 className="sidebar__title">Navigation</h2>
//         <p className="sidebar__subtitle">Explore your workspace</p>
//       </div>
      
//       <nav className="sidebar__navigation">
//         <ul className="sidebar__menu">
//           {menuItems.map((item) => (
//             <li key={item.path} className="sidebar__menu-item">
//               <Link 
//                 to={item.path}
//                 className={`sidebar__menu-link ${isActiveRoute(item.path) ? 'sidebar__menu-link--active' : ''}`}
//                 onClick={onClose}
//               >
//                 <div className={`sidebar__menu-icon ${isActiveRoute(item.path) ? 'sidebar__menu-icon--active' : ''}`}>
//                   {item.icon}
//                 </div>
//                 <div className="sidebar__menu-content">
//                   <div className="sidebar__menu-label">
//                     {item.label}
//                   </div>
//                   <div className="sidebar__menu-description">
//                     {item.description}
//                   </div>
//                 </div>
//                 {isActiveRoute(item.path) && (
//                   <div className="sidebar__menu-indicator" />
//                 )}
//               </Link>
//             </li>
//           ))}
//         </ul>
//       </nav>

//       {/* Quick Stats */}
//       <div className="sidebar__stats">
//         <h4 className="sidebar__stats-title">Quick Stats</h4>
//         <div className="sidebar__stats-content">
//           <div className="sidebar__stats-item">
//             <span>📁 Files:</span>
//             <strong>{stats.total_files}</strong>
//           </div>
//           <div className="sidebar__stats-item">
//             <span>✅ Processed:</span>
//             <strong>{stats.processed_files}</strong>
//           </div>
//           <div className="sidebar__stats-item">
//             <span>⏱️ Last Activity:</span>
//             <strong>
//               {stats.last_activity ? new Date(stats.last_activity).toLocaleDateString() : 'Never'}
//             </strong>
//           </div>
//         </div>
//       </div>
//     </aside>
//   )
// }

// export default SideMenu