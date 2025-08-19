

// You can still dynamically get the port if needed, or set it from an environment variable
const API_PORT = window.location.port === "5173" ? "3000" : window.location.port;
const API_HOST = window.location.hostname;
// const MODULE_ROUTE = window.location.port === "5173" ? "/api" : "/ProjectQueue/api";
const MODULE_ROUTE = window.location.port === "5173" ? "/api" : "/ProjectQueue/api";

const BASE_URL = `http://${API_HOST}:${API_PORT}`;
// Function to get the full URL for an endpoint
export const getApiUrl = (endpoint:any) => `${BASE_URL}${MODULE_ROUTE}${endpoint}`;
export const getPort = (endpoint:any) => `${API_PORT}`;

console.log('api endpoint: ' + getApiUrl('/YouHere'));

// const API_PORT = process.env.REACT_APP_API_PORT || "5000";
// const API_HOST = process.env.REACT_APP_API_HOST || window.location.hostname;
// const MODULE_ROUTE = process.env.REACT_APP_MODULE_ROUTE || "/importNewCSV";

// const BASE_URL = `http://${API_HOST}:${API_PORT}`;

// // Function to get the full URL for an endpoint
// export const getApiUrl = (endpoint) => `${BASE_URL}${MODULE_ROUTE}${endpoint}`;
// console.log('api endpoint: ' + getApiUrl('/YouHere'));
