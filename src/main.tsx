import React from "react";
import { createRoot } from "react-dom/client";
import ContraScope from "./ContraScope";
import "./index.css";

const container = document.getElementById("root")!;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ContraScope />
  </React.StrictMode>
);
