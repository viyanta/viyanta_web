import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Deprecated component - redirects to new Dashboard route
const IrdaiMonthlyData = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate('/irdai-monthly-dashboard', { replace: true });
    }, [navigate]);

    return null;
};

export default IrdaiMonthlyData;
