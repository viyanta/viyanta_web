import React from 'react';
import IrdaiPageLayout from '../components/IrdaiPageLayout';

// Import Tab Components
import IrdaiDashboard from './IrdaiDashboard';
import IrdaiCompanywise from './IrdaiCompanywise';
import IrdaiPremiumWise from './IrdaiPremiumWise';
import IrdaiMarketShare from './IrdaiMarketShare';
import IrdaiGrowth from './IrdaiGrowth';
import IrdaiMonthwise from './IrdaiMonthwise';
import IrdaiPvtVsPublic from './IrdaiPvtVsPublic';
import IrdaiDocuments from './IrdaiDocuments';
import IrdaiPeers from './IrdaiPeers';

// Wrapper Components
export const IrdaiDashboardPage = () => (
    <IrdaiPageLayout activeTab="Dashboard">
        <IrdaiDashboard />
    </IrdaiPageLayout>
);

export const IrdaiCompanywisePage = () => (
    <IrdaiPageLayout activeTab="Companywise">
        <IrdaiCompanywise />
    </IrdaiPageLayout>
);

export const IrdaiPremiumWisePage = () => (
    <IrdaiPageLayout activeTab="Premium wise">
        <IrdaiPremiumWise />
    </IrdaiPageLayout>
);

export const IrdaiMarketSharePage = () => (
    <IrdaiPageLayout activeTab="Market Share">
        <IrdaiMarketShare />
    </IrdaiPageLayout>
);

export const IrdaiGrowthPage = () => (
    <IrdaiPageLayout activeTab="Growth">
        <IrdaiGrowth />
    </IrdaiPageLayout>
);

export const IrdaiMonthwisePage = () => (
    <IrdaiPageLayout activeTab="Monthwise">
        <IrdaiMonthwise />
    </IrdaiPageLayout>
);

export const IrdaiPvtVsPublicPage = () => (
    <IrdaiPageLayout activeTab="Pvt Vs Public">
        <IrdaiPvtVsPublic />
    </IrdaiPageLayout>
);

export const IrdaiAnalyticsPage = () => (
    <IrdaiPageLayout activeTab="Analytics">
        <div className="placeholder-content">
            <h3>Analytics Content Coming Soon</h3>
        </div>
    </IrdaiPageLayout>
);

export const IrdaiDocumentsPage = () => (
    <IrdaiPageLayout activeTab="Documents">
        <IrdaiDocuments />
    </IrdaiPageLayout>
);

export const IrdaiPeersPage = () => (
    <IrdaiPageLayout activeTab="Peers">
        <IrdaiPeers />
    </IrdaiPageLayout>
);
