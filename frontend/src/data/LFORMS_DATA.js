// L-Forms data for Life Insurance companies
// Each L-Form is separate and properly categorized

export const LFORMS_DATA_FORMATTED = [
    { value: 'L-1-A-REVENUE ACCOUNT', label: 'L-1 Revenue Account', category: 'Accounts' },
    { value: 'L-2-A-PROFIT AND LOSS ACCOUNT', label: 'L-2 Profit & Loss Account', category: 'Accounts' },
    { value: 'L-3-A-BALANCE SHEET', label: 'L-3 Balance Sheet', category: 'Accounts' },
  
    { value: 'L-4-PREMIUM SCHEDULE', label: 'L-4 Premium', category: 'Schedules' },
    { value: 'L-5-COMMISSION SCHEDULE', label: 'L-5 Commission Expenses', category: 'Schedules' },
    { value: 'L-6-OPERATING EXPENSES SCHEDULE', label: 'L-6 Operating Expenses', category: 'Schedules' },
    { value: 'L-7-BENEFITS PAID SCHEDULE', label: 'L-7 Benefits Paid', category: 'Schedules' },
  
    { value: 'L-8-SHARE CAPITAL SCHEDULE', label: 'L-8 Share Capital', category: 'Schedules' },
    { value: 'L-9-PATTERN OF SHAREHOLDING SCHEDULE', label: 'L-9 Pattern of Shareholding', category: 'Schedules' },
    { value: 'L-9A-DETAILED SHAREHOLDING PATTERN', label: 'L-9A Detailed Shareholding Pattern', category: 'Schedules' },
  
    { value: 'L-10-RESERVE AND SURPLUS SCHEDULE', label: 'L-10 Reserves and Surplus', category: 'Schedules' },
    { value: 'L-11-BORROWINGS SCHEDULE', label: 'L-11 Borrowings', category: 'Schedules' },
  
    { value: 'L-12-INVESTMENT SHAREHOLDERS SCHEDULE', label: 'L-12 Investment - Shareholders', category: 'Investments' },
    { value: 'L-13-INVESTMENT POLICYHOLDERS SCHEDULE', label: 'L-13 Investment - Policyholders', category: 'Investments' },
    { value: 'L-14-INVESTMENT - ASSETS HELD TO COVER LINKED LIABILITIES SCHEDULE', label: 'L-14 Investment - Linked Liabilities', category: 'Investments' },
    { value: 'L-14A-INVESTMENT ADDITIONAL INFORMATION', label: 'L-14A Investment Additional Information', category: 'Investments' },
  
    { value: 'L-15-LOANS SCHEDULE', label: 'L-15 Loans', category: 'Assets' },
    { value: 'L-16-FIXED ASSETS SCHEDULE', label: 'L-16 Fixed Assets', category: 'Assets' },
    { value: 'L-17-CASH AND BANK BALANCE SCHEDULE', label: 'L-17 Cash and Bank Balance', category: 'Assets' },
    { value: 'L-18-ADVANCES AND OTHER ASSETS SCHEDULE', label: 'L-18 Advances & Other Assets', category: 'Assets' },
  
    { value: 'L-19-CURRENT LIABILITIES SCHEDULE', label: 'L-19 Current Liabilities', category: 'Liabilities' },
    { value: 'L-20-PROVISIONS SCHEDULE', label: 'L-20 Provisions', category: 'Liabilities' },
    { value: 'L-21-MISC EXPENDITURE SCHEDULE', label: 'L-21 Misc Expenditure', category: 'Liabilities' },
  
    { value: 'L-22-ANALYTICAL RATIOS', label: 'L-22 Analytical Ratios', category: 'Analysis' },
  
    { value: 'L-24-VALUATION OF NET LIABILITIES', label: 'L-24 Valuation of Net Liabilities', category: 'Valuation' },
  
    { value: 'L-25-GEOGRAPHICAL DISTN OF BSNS- GROUP & INDIVIDUALS', label: 'L-25 Geographical Distribution of Business', category: 'Business' },
    { value: 'L-26-INVESTMENT ASSETS', label: 'L-26 Investment Assets', category: 'Investments' },
    { value: 'L-27-UNIT LINKED BUSINESS', label: 'L-27 ULIP Fund', category: 'Business' },
    { value: 'L-28-ULIP NAV', label: 'L-28 ULIP NAV', category: 'Business' },
    { value: 'L-29-DEBT SECURITIES', label: 'L-29 Debt Securities', category: 'Investments' },
  
    { value: 'L-30-RELATED PARTY TRANSACTIONS', label: 'L-30 Related Party Transactions', category: 'Compliance' },
    { value: 'L-31-BOD', label: 'L-31 Board of Directors & Key Management Persons', category: 'Compliance' },
    { value: 'L-32-SOLVENCY MARGIN', label: 'L-32 Available Solvency Margin and Solvency Ratio', category: 'Compliance' },
    { value: 'L-33-NPAS', label: 'L-33 NPAs', category: 'Assets' },
    { value: 'L-34-YIELD ON INVESTMENT', label: 'L-34 Investment Break Up by Class and Yield on Investment', category: 'Investments' },
    { value: 'L-35-DOWNGRADING OF INVESTMENT', label: 'L-35 Downgrading of Investment', category: 'Investments' },
  
    { value: 'L-36-BSNS NUMBERS', label: 'L-36 Premium and Number of Lives Covered by Policy Type', category: 'Business' },
    { value: 'L-37-BSNS ACQUISITION (GROUP)', label: 'L-37 Business Acquisition - Group', category: 'Business' },
    { value: 'L-38-BSNS ACQUISITION (INDIVIDUALS)', label: 'L-38 Business Acquisition - Individual', category: 'Business' },
  
    { value: 'L-39-CLAIMS AGEING', label: 'L-39 Ageing of Claims', category: 'Claims' },
    { value: 'L-40-CLAIMS DATA', label: 'L-40 Claims Data', category: 'Claims' },
  
    { value: 'L-41-GRIEVANCES (LIFE)', label: 'L-41 Grievance Disposal', category: 'Compliance' },
    { value: 'L-42-VALUATION BASIS (LIFE)', label: 'L-42 Parameters of Valuation', category: 'Valuation' },
    { value: 'L-43-VOTING ACTIVITY DISCLOSURE UNDER STEWARDSHIP CODE', label: 'L-43 Voting Activity Disclosure under Stewardship Code', category: 'Compliance' },
    { value: 'L-45-OFFICES AND OTHER INFORMATION', label: 'L-45 Offices and Other Information', category: 'Compliance' }
  ];
  
  // Extract just the labels for simpler use
  export const LFORMS_LABELS = LFORMS_DATA_FORMATTED.map(item => item.label);
  