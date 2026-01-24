import './index.css';
import React from "react";
import { render } from "react-dom";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ErrorProvider } from "./contexts/ErrorContext";
import { AnalyticsTracker } from "./components/AnalyticsTracker";

// Google Analytics is loaded via index.html for reliable tracking

render(
  <BrowserRouter>
    <AnalyticsTracker />
    <ErrorProvider>
      <App />
    </ErrorProvider>
  </BrowserRouter>,
  document.getElementById("root")
);