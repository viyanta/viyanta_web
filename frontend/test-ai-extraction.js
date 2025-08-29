// Test the AI PDF Form Extractor API
// Run this in your browser console or as a Node.js script

const API_BASE = 'http://localhost:8000/templates';

async function testAiExtraction() {
  console.log('🧪 Testing AI PDF Form Extractor...');
  
  try {
    // Step 1: Get available companies
    console.log('1️⃣ Getting available companies...');
    const companiesResponse = await fetch(`${API_BASE}/companies`);
    const companiesData = await companiesResponse.json();
    console.log('✅ Available companies:', companiesData.companies);
    
    // Step 2: List forms for SBI
    console.log('\n2️⃣ Listing forms for SBI...');
    const formsResponse = await fetch(`${API_BASE}/list-forms?company=sbi`);
    const formsData = await formsResponse.json();
    console.log(`✅ Found ${formsData.total_forms} forms for SBI`);
    console.log('First 3 forms:', formsData.forms.slice(0, 3));
    
    // Step 3: AI Extract L-4-PREMIUM form
    console.log('\n3️⃣ AI Extracting L-4-PREMIUM form...');
    const extractResponse = await fetch(`${API_BASE}/ai-extract-form/L-4-PREMIUM?company=sbi`);
    const extractData = await extractResponse.json();
    
    console.log('🤖 AI Extraction Result:');
    console.log(`✅ Status: ${extractData.status}`);
    console.log(`📊 Total Periods Found: ${extractData.total_periods}`);
    console.log(`🏢 Company: ${extractData.company}`);
    console.log(`📋 Form: ${extractData.form_no}`);
    
    if (extractData.data && extractData.data.length > 0) {
      console.log('\n📈 Extracted Periods:');
      extractData.data.forEach((period, index) => {
        console.log(`\nPeriod ${index + 1}:`);
        console.log(`  📅 Period: ${period.Period}`);
        console.log(`  📄 Page Used: ${period.PagesUsed}`);
        console.log(`  💰 Currency: ${period.Currency}`);
        console.log(`  🔢 Rows Count: ${period.Rows ? period.Rows.length : 0}`);
        console.log(`  📋 Headers: ${period.Headers ? period.Headers.length : 0} columns`);
        
        if (period.Rows && period.Rows.length > 0) {
          console.log(`  📊 First Row Data:`, period.Rows[0]);
        }
      });
      
      // Calculate total rows across all periods
      const totalRows = extractData.data.reduce((sum, period) => sum + (period.Rows ? period.Rows.length : 0), 0);
      console.log(`\n🎯 SUMMARY:`);
      console.log(`   Total Periods: ${extractData.total_periods}`);
      console.log(`   Total Rows Extracted: ${totalRows}`);
      console.log(`   Extraction Method: ${extractData.extraction_method}`);
    }
    
    return extractData;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

// Run the test
testAiExtraction().then(result => {
  if (result) {
    console.log('\n🎉 AI PDF Form Extractor test completed successfully!');
    console.log('\n📋 You can now use this in your React frontend:');
    console.log('```javascript');
    console.log('import ApiService from "./services/api";');
    console.log('const result = await ApiService.aiExtractTemplateForm("sbi", "L-4-PREMIUM");');
    console.log('console.log(result.data); // All extracted periods');
    console.log('```');
  }
});

// Example usage in React component:
/*
const handleAiExtraction = async () => {
  try {
    const result = await ApiService.aiExtractTemplateForm(company, formNo);
    
    // result.data contains array of periods:
    // [
    //   {
    //     "Form": "L-4-PREMIUM",
    //     "Title": "Premium Schedule", 
    //     "Period": "For the quarter ended December 31, 2023",
    //     "Currency": "Rs. in Lakhs",
    //     "Headers": ["Particulars", "Linked Life", ...],
    //     "Rows": [
    //       {
    //         "Particulars": "Direct – First year premiums",
    //         "Linked Life": "4,15,707",
    //         ...
    //       }
    //     ]
    //   },
    //   // ... more periods
    // ]
    
    setExtractionResult(result);
  } catch (error) {
    console.error('Extraction failed:', error);
  }
};
*/
