import React from 'react';
import { motion } from 'framer-motion';
import AppRouter from './components/AppRouter';
import { ThemeProvider } from './contexts/ThemeContext';
import { FontProvider } from './contexts/FontContext';
import { StorageProvider } from './contexts/StorageContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/toast';
import { EnhancedToastProvider } from './components/ui/enhanced-toast';
import './App.css';
import './styles/animations.css';

function App() {
  return (
    <ThemeProvider>
      <FontProvider>
        <StorageProvider>
          <AuthProvider>
            <ToastProvider>
              <EnhancedToastProvider>
                <motion.div
                  className="App min-h-screen bg-background transition-theme duration-300"
                  initial={{ opacity: 0, filter: 'blur(8px)' }}
                  animate={{
                    opacity: 1,
                    filter: 'blur(0px)',
                    transition: {
                      duration: 0.6,
                      ease: [0.4, 0, 0.2, 1]
                    }
                  }}
                >
                  <AppRouter />
                </motion.div>
              </EnhancedToastProvider>
            </ToastProvider>
          </AuthProvider>
        </StorageProvider>
      </FontProvider>
    </ThemeProvider>
  );
}

export default App;