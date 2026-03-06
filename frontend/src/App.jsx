import { useState } from "react";

const apiUrl = import.meta.env.VITE_API_URL;
const envName = import.meta.env.VITE_ENV_NAME || "local";

export default function App() {
  const [yieldValue, setYieldValue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFetchYield = async () => {
    if (!apiUrl) {
      setError("VITE_API_URL is not configured.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${apiUrl}/yield`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      setYieldValue(data.yield);
    } catch (err) {
      console.error("Yield API error:", err);
      setError("Failed to fetch current yield.");
      setYieldValue(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="card">
        <p className="env-label">Environment: {envName}</p>
        <h1>Yield Demo</h1>
        <button onClick={handleFetchYield} disabled={loading}>
          {loading ? "Loading..." : "Fetch Current Yield"}
        </button>

        {yieldValue !== null && !error && (
          <p className="result">
            Current Yield: <strong>{yieldValue}</strong>
          </p>
        )}

        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}
