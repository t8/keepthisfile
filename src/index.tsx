import './index.css';
import React from "react";
import { render } from "react-dom";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ErrorProvider } from "./contexts/ErrorContext";

// Load Google Analytics dynamically to avoid Vite parsing issues
if (typeof window !== 'undefined') {
  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', 'G-13RTTHFSTF');

  // Load the gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-13RTTHFSTF';
  document.head.appendChild(script);
}

render(
  <BrowserRouter>
    <ErrorProvider>
      <App />
    </ErrorProvider>
  </BrowserRouter>,
  document.getElementById("root")
);