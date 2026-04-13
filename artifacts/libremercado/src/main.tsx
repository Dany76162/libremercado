import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { apiUrl } from "./lib/apiBase";

const nativeFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === "string") {
    if (input.startsWith("/api") || input.startsWith("/uploads")) {
      return nativeFetch(apiUrl(input), init);
    }
  }
  return nativeFetch(input as RequestInfo, init);
};

createRoot(document.getElementById("root")!).render(<App />);
