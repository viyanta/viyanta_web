# Viyanta Frontend - React Application

Modern React-based frontend for the Viyanta file processing system with interactive data visualization and file management.

## 🚀 Features

- **Modern React**: Built with React 18+ and modern hooks
- **Responsive Design**: Mobile-first design that works on all devices
- **Interactive Tables**: Advanced data table component with sorting and filtering
- **File Management**: Drag-and-drop file uploads with progress tracking
- **Real-time Updates**: Live statistics and processing status updates
- **Data Visualization**: Side-by-side comparison of original vs processed data
- **Clean UI**: Intuitive interface with consistent design system

## 📁 Project Structure

```
frontend/
├── public/                    # Static assets
│   ├── index.html            # HTML template
│   └── favicon.ico           # Application icon
├── src/                      # Source code
│   ├── components/           # Reusable UI components
│   │   ├── DataTable.jsx     # Interactive data table
│   │   ├── Modal.jsx         # Modal dialog component
│   │   ├── Navbar.jsx        # Navigation bar
│   │   ├── SideMenu.jsx      # Sidebar navigation
│   │   └── SourceFileViewer.jsx # Original file viewer
│   ├── pages/               # Main application pages
│   │   ├── Dashboard.jsx     # Main dashboard
│   │   ├── Explorer.jsx      # File upload and explorer
│   │   ├── Lform.jsx         # L-form processing
│   │   └── Profile.jsx       # User profile
│   ├── services/            # API integration
│   │   └── api.js           # API service layer
│   ├── context/             # React context providers
│   │   └── StatsContext.jsx  # Global statistics state
│   ├── utils/               # Utility components and functions
│   │   └── Button.jsx       # Reusable button component
│   ├── App.jsx              # Main application component
│   ├── main.jsx             # Application entry point
│   └── index.css            # Global styles
├── package.json             # Node.js dependencies
├── vite.config.js           # Vite build configuration
└── eslint.config.js         # ESLint configuration
```

## 🛠️ Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn package manager

### Setup Steps

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 📦 Dependencies

### Core Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.8.0"
}
```

### Development Dependencies
```json
{
  "@vitejs/plugin-react": "^4.0.0",
  "vite": "^4.4.5",
  "eslint": "^8.45.0"
}
```

## 🎨 Component Architecture

### Page Components

#### Dashboard (`pages/Dashboard.jsx`)
Main application dashboard with:
- **Statistics Cards**: File counts, processing status, storage usage
- **Recent Activity**: List of recently processed files with click-to-compare
- **Quick Actions**: Navigation shortcuts to key features
- **File Comparison Modal**: Side-by-side original vs processed view

```jsx
// Click handler for recent activity files
onClick={async (e) => {
  setSelectedFile(file);
  setCurrentFileId(file.file_id);
  setModalOpen(true);
  setModalTitle(`Files Comparison: ${file.original_filename}`);
  setViewMode('files');
}}
```

#### Explorer (`pages/Explorer.jsx`)
File upload and processing interface:
- **File Upload**: Drag-and-drop or click to upload
- **Processing Status**: Real-time processing feedback
- **File Information**: Display file metadata and processing results
- **Download Options**: Download original or processed files

### UI Components

#### DataTable (`components/DataTable.jsx`)
Advanced data table with:
- **Sortable Columns**: Click headers to sort data
- **Responsive Design**: Adapts to different screen sizes
- **Data Type Detection**: Automatic formatting for numbers, dates
- **Row Highlighting**: Interactive row hover effects

### State Management

#### StatsContext (`context/StatsContext.jsx`)
Global state management for:
- **File Statistics**: Total files, processed count, storage usage
- **File List**: Complete list of uploaded files
- **Real-time Updates**: Automatic refresh every 30 seconds
- **Error Handling**: Global error state management

## 🔌 API Integration

### API Service (`services/api.js`)
Centralized API communication layer with methods for:
- File upload with progress tracking
- Data preview (original and processed)
- File statistics and metadata
- File download functionality

## 🎨 Styling System

### CSS Variables
Consistent design system using CSS custom properties:

```css
:root {
  --main-color: #3f72af;
  --sub-color: #112d4e;
  --background-color: #f9f7fe;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --error-color: #dc3545;
}
```

## 🔄 Key Features

### Recent Activity Click-to-Compare
Users can click any file in recent activity to see detailed comparison between original and processed data.

### Enhanced Table Display
The DataTable component shows extracted data with:
- Proper column headers detected from extraction
- Organized table structure
- Interactive features for better data exploration

## 📱 Responsive Design

- **Mobile First**: Optimized for mobile devices
- **Breakpoints**: Tablet and desktop optimizations
- **Touch Friendly**: Large touch targets for mobile interaction

## 🛠️ Development

### Available Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Lint code
```

### Development Guidelines
- Use functional components with hooks
- Follow consistent component structure
- Implement proper error handling
- Maintain responsive design principles

---

**Frontend Application available at `http://localhost:5173` during development**
