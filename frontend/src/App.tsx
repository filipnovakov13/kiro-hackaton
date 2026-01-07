import React, { useState, useEffect } from "react";
import { apiClient } from "./services/api";

interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
}

function App() {
  const [backendStatus, setBackendStatus] = useState<string>("Checking...");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const response = await apiClient.get<HealthResponse>("/health");
        setBackendStatus(`Backend is ${response.status} (${response.service})`);
        setError("");
      } catch (err) {
        setBackendStatus("Backend unavailable");
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };

    checkBackendHealth();
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Iubar - AI-Enhanced Personal Knowledge Management</h1>
      <p>Welcome to Iubar, your intelligent learning companion.</p>

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          border: "1px solid #ccc",
          borderRadius: "5px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h3>Backend Connection Status</h3>
        <p>
          <strong>Status:</strong> {backendStatus}
        </p>
        {error && (
          <p style={{ color: "red" }}>
            <strong>Error:</strong> {error}
          </p>
        )}
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3>Next Steps</h3>
        <ul>
          <li>Upload your first document</li>
          <li>Start a conversation with the AI</li>
          <li>Explore your knowledge connections</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
