import { Buffer } from "buffer";
// import process from "process";
// window.process = process;

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { PricesProvider } from "./context/PricesContext";
window.Buffer = Buffer;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PricesProvider>
      <App />
    </PricesProvider>
  </StrictMode>
);
