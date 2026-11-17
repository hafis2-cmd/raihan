const API_BASE_URL = import.meta.env.PROD 
  ? "https://api.healthline.com"  // Your cloud hosted backend URL
  : (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173");

export default API_BASE_URL;
