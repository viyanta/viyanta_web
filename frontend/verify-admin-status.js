// Quick verification script to check isAdmin in browser console
// Copy and paste this into the browser console while logged in

// This should be run on any of the fixed pages
(function verifyAdminStatus() {
  console.log('='.repeat(70));
  console.log('ADMIN STATUS VERIFICATION');
  console.log('='.repeat(70));
  
  // Check if React DevTools is available
  if (typeof $r !== 'undefined') {
    console.log('✓ React DevTools detected');
    
    // Try to access the component props/state
    if ($r && $r.props) {
      console.log('\nComponent Props:', $r.props);
    }
  } else {
    console.log('⚠️  React DevTools not detected - install for better debugging');
  }
  
  // Check localStorage
  console.log('\n📦 LocalStorage Check:');
  console.log('-'.repeat(70));
  const userId = localStorage.getItem('user_id');
  const selectedProduct = Object.keys(localStorage)
    .find(key => key.startsWith('selected_product_'));
  
  console.log('user_id:', userId || '❌ Not found');
  if (selectedProduct) {
    console.log('selected_product:', localStorage.getItem(selectedProduct));
  }
  
  // Check for AuthContext in window (if exposed)
  console.log('\n🔐 Auth Context Check:');
  console.log('-'.repeat(70));
  console.log('To check isAdmin value:');
  console.log('1. Open React DevTools');
  console.log('2. Select any component (like EconomyDashboard)');
  console.log('3. In console, type: $r.props');
  console.log('4. Look for isAdmin value');
  
  console.log('\n🧪 Quick Test:');
  console.log('-'.repeat(70));
  console.log('Check if admin features are visible:');
  console.log('- "Add New Record" button exists?', 
    document.querySelector('[class*="add-btn"]') ? '✓ YES' : '❌ NO');
  console.log('- Edit buttons (✏️) exist?',
    document.querySelectorAll('[class*="edit"]').length > 0 ? '✓ YES' : '❌ NO');
  console.log('- Delete buttons (🗑️) exist?',
    document.querySelectorAll('[class*="delete"]').length > 0 ? '✓ YES' : '❌ NO');
  
  console.log('\n' + '='.repeat(70));
  console.log('If admin buttons are NOT visible but you are an admin:');
  console.log('1. Open React DevTools');
  console.log('2. Check Components tab');
  console.log('3. Find AuthContext.Provider');
  console.log('4. Check value.isAdmin - should be true');
  console.log('='.repeat(70));
})();
