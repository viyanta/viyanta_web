#!/usr/bin/env python3
"""
Fix the TemplateBasedExtractor component to properly display all 148 rows
"""
import re

# Read the current file
with open('frontend/src/components/TemplateBasedExtractor.jsx', 'r') as f:
    content = f.read()

# Find the table container div and update it to include vertical scrolling
old_table_container = '''        {extractionResult.Rows && extractionResult.Rows.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem'
            }}>'''

new_table_container = '''        {extractionResult.Rows && extractionResult.Rows.length > 0 ? (
          <div style={{ 
            overflowX: 'auto', 
            overflowY: 'auto', 
            maxHeight: '70vh',
            border: '1px solid var(--border-color)',
            borderRadius: '8px'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem'
            }}>'''

# Replace the table container
new_content = content.replace(old_table_container, new_table_container)

# Also add sticky header for better UX
old_thead = '''              <thead>
                {headerRows.map((row, rowIndex) => ('''

new_thead = '''              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                {headerRows.map((row, rowIndex) => ('''

# Replace the thead
new_content = new_content.replace(old_thead, new_thead)

# Write the updated file
with open('frontend/src/components/TemplateBasedExtractor.jsx', 'w') as f:
    f.write(new_content)

print("✅ Updated TemplateBasedExtractor component to properly display all 148 rows")
print("📊 Added vertical scrolling with maxHeight: 70vh")
print("📌 Added sticky header for better navigation")
print("🎯 All 148 rows should now be visible and scrollable")
