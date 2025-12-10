import React, { createContext, useContext, useState, useEffect } from 'react';
import ApiService from '../services/api';

const NavigationContext = createContext();

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  const [activeNavItems, setActiveNavItems] = useState(['Dashboard']); // Default active items
  const [selectedSidebarItem, setSelectedSidebarItem] = useState(null);
  
  // Load selectedDescriptions from backend API (global for all users)
  const [selectedDescriptions, setSelectedDescriptionsState] = useState([]);
  const [loadingDescriptions, setLoadingDescriptions] = useState(true);

  // Load selected descriptions from backend on mount and periodically
  useEffect(() => {
    const loadSelectedDescriptions = async () => {
      try {
        setLoadingDescriptions(true);
        const descriptions = await ApiService.getSelectedDescriptions();
        const newDescriptions = Array.isArray(descriptions) ? descriptions : [];
        
        // Only update state if descriptions actually changed (prevents unnecessary re-renders)
        setSelectedDescriptionsState(prev => {
          const prevSorted = [...prev].sort().join(',');
          const newSorted = [...newDescriptions].sort().join(',');
          
          if (prevSorted !== newSorted) {
            console.log('✅ Selected descriptions updated from backend:', newDescriptions);
            return newDescriptions;
          }
          // No change, return previous state to prevent re-render
          return prev;
        });
      } catch (error) {
        console.error('Error loading selected descriptions from backend:', error);
        // Only set empty array if current state is not already empty
        setSelectedDescriptionsState(prev => prev.length > 0 ? [] : prev);
      } finally {
        setLoadingDescriptions(false);
      }
    };

    // Load immediately
    loadSelectedDescriptions();

    // Refresh every 30 seconds to get updates from admin (reduced from 5 seconds)
    // Only triggers re-render if descriptions actually changed
    const refreshInterval = setInterval(loadSelectedDescriptions, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  // Wrapper function to update selectedDescriptions (only updates local state)
  // The actual saving to backend is done in the components when admin makes changes
  const setSelectedDescriptions = (value) => {
    if (typeof value === 'function') {
      setSelectedDescriptionsState(prev => {
        const newValue = value(prev);
        return newValue;
      });
    } else {
      setSelectedDescriptionsState(value);
    }
  };

  // Define which horizontal nav items should be active for each sidebar selection
  const getActiveItemsForSidebarSelection = (sidebarItemId) => {
    switch(sidebarItemId) {
      case 1000: // Company Information
        return ['Dashboard', 'Background', 'L Forms', 'Metrics', 'Analytics', 'Annual Data', 'Documents', 'Peers', 'News'];
      case 1001: // Industry Metrics
        return ['Dashboard', 'Domestic Metrics', 'International Metrics', 'Documents', 'News'];
      case 1002: // Industry Aggregates
        return ['L Forms', 'Annual Data', 'Irdai Monthly Data'];
      case 1003: // Products
        return ['Child Plans', 'Investment Plans', 'Protection Plans', 'Term Plans', 'New Launches'];
      case 1004: // Report Generator
        return ['Define Template', 'Save Template'];
      case 1005: // Screener
        return ['Screener Inputs', 'Screener Output Sheets'];
      case 1006: // IRDAI Monthly Data
        return ['Dashboard', 'Analytics', 'Peers', 'Documents'];
      case 1007: // Economy
        return ['Dashboard', 'Domestic', 'International'];
      default:
        return ['Dashboard'];
    }
  };

  const handleSidebarItemClick = (itemId, itemName) => {
    setSelectedSidebarItem(itemId);
    const newActiveItems = getActiveItemsForSidebarSelection(itemId);
    setActiveNavItems(newActiveItems);
    console.log(`Sidebar item ${itemName} selected. Active nav items:`, newActiveItems);
  };

  const isNavItemActive = (navItemName) => {
    return activeNavItems.includes(navItemName);
  };

  const value = {
    activeNavItems,
    selectedSidebarItem,
    handleSidebarItemClick,
    isNavItemActive,
    setActiveNavItems,
    selectedDescriptions,
    setSelectedDescriptions
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};
