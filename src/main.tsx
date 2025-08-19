import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme'; // Path to the theme.js or theme.ts file
import './index.css';
import App from './App.tsx';

import initializeI18n from './i18n';


const userLanguage = 'en'; // Set this dynamically (from URL, user preferences, etc.)
initializeI18n(userLanguage);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
    <ThemeProvider theme={theme}> {/* Applying theme globally */}
      <App />
    </ThemeProvider>

    </Router>
  </StrictMode>
);
