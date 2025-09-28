import React from 'react';
import { motion } from 'framer-motion';
import MainFormApp from './components/MainFormApp';
import { ThemeProvider } from './contexts/ThemeContext';
import { FontProvider } from './contexts/FontContext';
import { ToastProvider } from './components/ui/toast';
import './App.css';
import './styles/animations.css';

function App() {
  return (
    <ThemeProvider>
      <FontProvider>
        <ToastProvider>
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
            <MainFormApp />
          </motion.div>
        </ToastProvider>
      </FontProvider>
    </ThemeProvider>
  );
}

export default App;