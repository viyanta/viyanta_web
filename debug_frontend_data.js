// Debug script to check frontend data flow
console.log("🔍 DEBUGGING FRONTEND DATA FLOW");

// Check if we can access the component data
const checkComponentData = () => {
  // This would be run in browser console
  console.log("Checking TemplateBasedExtractor data...");
  
  // Look for the component in React DevTools
  console.log("1. Open React DevTools");
  console.log("2. Find TemplateBasedExtractor component");
  console.log("3. Check the 'extractionResult' prop");
  console.log("4. Verify extractionResult.Rows.length === 148");
  console.log("5. Check if all rows have data");
};

// Instructions for manual debugging
console.log(`
🔍 MANUAL DEBUGGING STEPS:

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Navigate to your L1 extraction page
4. Run the extraction
5. In the console, type: document.querySelectorAll('tbody tr').length
6. This should show 148 if all rows are rendered

ALTERNATIVE METHOD:
1. Right-click on the table
2. Select "Inspect Element"
3. Look for the <tbody> element
4. Count the <tr> elements inside it
5. Should be 148 rows

IF YOU SEE LESS THAN 148 ROWS:
- The issue is in the data being passed to the component
- Check the API response in Network tab
- Verify the backend is returning all 148 rows

IF YOU SEE 148 ROWS BUT CAN'T SCROLL:
- The issue is with CSS styling
- Check if maxHeight and overflowY are applied
- Verify the container has proper dimensions
`);

checkComponentData();
