import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'
import { Toaster } from 'react-hot-toast'
import { TradingProvider } from './store/tradingStore'

// Components
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Portfolio from './pages/Portfolio'
import Trading from './pages/Trading'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Alerts from './pages/Alerts'

// Services - commented out temporarily
// import { useWebSocket } from './hooks/useWebSocket'
// import { useNotifications } from './hooks/useNotifications'

// AppContent component with real-time features
function AppContent() {
  // Enable real-time features - DISABLED TEMPORARILY
  // useWebSocket()
  // useNotifications()

  useEffect(() => {
    // Set page title
    document.title = 'Trading Bot Dashboard'
    
    // Add viewport meta tag for mobile responsiveness
    const viewport = document.querySelector('meta[name=viewport]')
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    }
  }, [])

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Layout>
        <Routes>
          {/* Main Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Portfolio Management */}
          <Route path="/portfolio" element={<Portfolio />} />
          
          {/* Trading Interface */}
            <Route path="/trading" element={<Trading />} />
            
            {/* Analytics & Reports */}
            <Route path="/analytics" element={<Analytics />} />
            
            {/* Alerts Management */}
            <Route path="/alerts" element={<Alerts />} />
            
            {/* Settings */}
            <Route path="/settings" element={<Settings />} />
            
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            }
          }}
        />
      </Box>
  )
}

function App() {
  return (
    <TradingProvider>
      <AppContent />
    </TradingProvider>
  )
}

export default App
