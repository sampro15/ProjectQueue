// theme.ts or theme.js

//wrap the main app like this:
//<ThemeProvider theme={theme}> {/* Applying theme globally */}
//<App />
//</ThemeProvider>

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontFamily: '"Calibri", "Arial", sans-serif', // Set Calibri as the default font
  },
  palette: {
    primary: {
      main: '#1383BE', // Set the primary color
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Removes uppercase transformation globally
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Removes uppercase transformation for Tab label
          outline: 'none', // Remove the focus border
          '&:focus': {
            outline: 'none', // Remove outline on focus
          },
        },
      },
    },
  },
});

export default theme;