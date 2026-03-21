import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("[Sentrix] Frontend build marker:", "sentrix-build-canary-1");

createRoot(document.getElementById("root")!).render(<App />);
