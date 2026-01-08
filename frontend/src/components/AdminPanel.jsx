import { useState, useEffect } from 'react';
import ApiService from '../services/api';
import './AdminPanel.css';
import StandardPageLayout from './StandardPageLayout';
import CompanyInformationSidebar from './CompanyInformationSidebar';

const PRODUCTS = {
  DIGITS_LIFE: 'Digits Life',
  DIGITS_NON_LIFE: 'Digits Non-Life',
  DIGITS_PLUS: 'Digits Plus',
  ASSURE_LIFE: 'Assure Life',
  ASSURE_NON_LIFE: 'Assure Non-Life',
  ASSURE_PLUS: 'Assure Plus'
};

const AdminPanel = ({ onMenuClick }) => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'all'
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [subscriptionDays, setSubscriptionDays] = useState(365);
  const [makeMasterAdmin, setMakeMasterAdmin] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const adminUserId = localStorage.getItem('user_id');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        const response = await fetch('http://localhost:8000/api/admin/pending-approval', {
          headers: {
            'X-Admin-User-Id': adminUserId
          }
        });
        const data = await response.json();
        setPendingUsers(data.users || []);
      } else {
        const response = await fetch('http://localhost:8000/api/admin/all-users', {
          headers: {
            'X-Admin-User-Id': adminUserId
          }
        });
        const data = await response.json();
        setAllUsers(data.users || []);
      }
    } catch (error) {
      showMessage('error', 'Failed to load users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    // Pre-select products user already has
    const currentProducts = user.current_products || user.products || {};
    const preSelected = Object.keys(currentProducts).filter(key => currentProducts[key]);
    setSelectedProducts(preSelected);
    setMakeMasterAdmin(user.is_master_admin || false);
  };

  const toggleProduct = (product) => {
    setSelectedProducts(prev =>
      prev.includes(product)
        ? prev.filter(p => p !== product)
        : [...prev, product]
    );
  };

  const handleApproveUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch('http://localhost:8000/api/admin/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-User-Id': adminUserId
        },
        body: JSON.stringify({
          user_id: selectedUser.user_id,
          products: selectedProducts,
          make_master_admin: makeMasterAdmin,
          user_detail: makeMasterAdmin ? 'Internal' : 'Subscription',
          subscription_days: subscriptionDays
        })
      });

      if (response.ok) {
        const data = await response.json();
        showMessage('success', `Successfully approved ${selectedUser.email}`);
        setSelectedUser(null);
        setSelectedProducts([]);
        loadData();
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to approve user');
      }
    } catch (error) {
      showMessage('error', 'Error approving user: ' + error.message);
    }
  };

  const handleUpdateAccess = async (userId, productUpdates) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/update-product-access', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-User-Id': adminUserId
        },
        body: JSON.stringify({
          user_id: userId,
          product_updates: productUpdates
        })
      });

      if (response.ok) {
        showMessage('success', 'Product access updated successfully');
        loadData();
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to update access');
      }
    } catch (error) {
      showMessage('error', 'Error updating access: ' + error.message);
    }
  };

  const handleToggleActive = async (userId, activate) => {
    try {
      const endpoint = activate ? 'reactivate-user' : 'deactivate-user';
      const response = await fetch(`http://localhost:8000/api/admin/${endpoint}/${userId}`, {
        method: 'PATCH',
        headers: {
          'X-Admin-User-Id': adminUserId
        }
      });

      if (response.ok) {
        showMessage('success', `User ${activate ? 'activated' : 'deactivated'} successfully`);
        loadData();
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to update user status');
      }
    } catch (error) {
      showMessage('error', 'Error updating user: ' + error.message);
    }
  };

  return (
    <StandardPageLayout
      title="Admin Panel"
      onMenuClick={onMenuClick}
      sidebar={<CompanyInformationSidebar />}
    >
      <div className="admin-panel">
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="navigation-tabs-container">
          <div className="navigation-tabs" style={{ justifyContent: 'flex-start' }}>
            <button
              className={`nav-tab ${activeTab === 'pending' ? 'active selected' : 'inactive'}`}
              onClick={() => setActiveTab('pending')}
            >
              Pending Approval ({pendingUsers.length})
            </button>
            <button
              className={`nav-tab ${activeTab === 'all' ? 'active selected' : 'inactive'}`}
              onClick={() => setActiveTab('all')}
            >
              All Users ({allUsers.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading...</div>
        ) : (
          <div className="content">
            <div className="users-list">
              <h2 className="section-title">{activeTab === 'pending' ? 'Users Waiting for Approval' : 'All Users'}</h2>

              {activeTab === 'pending' && pendingUsers.length === 0 && (
                <p className="no-users">No users pending approval</p>
              )}

              {activeTab === 'pending' && pendingUsers.map(user => (
                <div
                  key={user.user_id}
                  className={`user-card ${selectedUser?.user_id === user.user_id ? 'selected' : ''}`}
                  onClick={() => handleSelectUser(user)}
                >
                  <div className="user-info">
                    <h3>{user.email}</h3>
                    <p>{user.name || 'No name provided'}</p>
                    <span className="date">Signed up: {new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="user-status">
                    {user.has_any_product ? (
                      <span className="badge badge-trial">Trial Access</span>
                    ) : (
                      <span className="badge badge-pending">No Access</span>
                    )}
                  </div>
                </div>
              ))}

              {activeTab === 'all' && allUsers.map(user => (
                <div key={user.user_id} className="user-card">
                  <div className="user-info">
                    <h3>
                      {user.email}
                      {user.is_master_admin && <span className="badge badge-admin">MasterAdmin</span>}
                    </h3>
                    <p>{user.name || 'No name provided'}</p>
                    <span className="type">{user.user_type} - {user.user_detail}</span>
                    <div className="products-mini">
                      {Object.entries(user.products || {}).map(([key, value]) =>
                        value ? <span key={key} className="mini-badge">{PRODUCTS[key]}</span> : null
                      )}
                    </div>
                  </div>
                  <div className="user-actions">
                    <button
                      className="btn-small btn-primary"
                      onClick={() => handleSelectUser(user)}
                    >
                      Edit
                    </button>
                    <button
                      className={`btn-small ${user.is_active ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => handleToggleActive(user.user_id, !user.is_active)}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedUser && (
              <div className="approval-panel card">
                <h2>Approve User</h2>
                <div className="user-details">
                  <p><strong>Email:</strong> {selectedUser.email}</p>
                  <p><strong>Name:</strong> {selectedUser.name || 'Not provided'}</p>
                  {selectedUser.created_at && (
                    <p><strong>Signed up:</strong> {new Date(selectedUser.created_at).toLocaleDateString()}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={makeMasterAdmin}
                      onChange={(e) => {
                        setMakeMasterAdmin(e.target.checked);
                        if (e.target.checked) {
                          // Select all products for MasterAdmin
                          setSelectedProducts(Object.keys(PRODUCTS));
                        }
                      }}
                    />
                    Make MasterAdmin (grants all products)
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Products:</label>
                  <div className="products-grid">
                    {Object.entries(PRODUCTS).map(([key, label]) => (
                      <label key={key} className="product-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(key) || makeMasterAdmin}
                          disabled={makeMasterAdmin}
                          onChange={() => toggleProduct(key)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {!makeMasterAdmin && (
                  <div className="form-group">
                    <label className="form-label">Subscription Duration:</label>
                    <select
                      className="form-input"
                      value={subscriptionDays}
                      onChange={(e) => setSubscriptionDays(Number(e.target.value))}
                    >
                      <option value={30}>30 days (1 month)</option>
                      <option value={90}>90 days (3 months)</option>
                      <option value={180}>180 days (6 months)</option>
                      <option value={365}>365 days (1 year)</option>
                      <option value={730}>730 days (2 years)</option>
                    </select>
                  </div>
                )}

                <div className="action-buttons">
                  <button
                    className="btn btn--success"
                    onClick={handleApproveUser}
                    disabled={selectedProducts.length === 0}
                  >
                    Approve User
                  </button>
                  <button
                    className="btn btn--secondary"
                    onClick={() => {
                      setSelectedUser(null);
                      setSelectedProducts([]);
                      setMakeMasterAdmin(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </StandardPageLayout>
  );
};

export default AdminPanel;
