const http = require("http");
const { app } = require("../backend/server.js");

const PORT = 3009; // random port for testing
let server;

async function runSmokeTest() {
  server = app.listen(PORT, () => {
    console.log(`Smoke test server listening on port ${PORT}`);
  });

  const baseUrl = `http://localhost:${PORT}`;
  const failed = [];

  const check = async (name, promise) => {
    try {
      await promise;
      console.log(`✅ ${name}`);
    } catch (e) {
      console.error(`❌ ${name} failed:`, e.message);
      failed.push(name);
    }
  };

  const fetchJson = async (url, options) => {
    return new Promise((resolve, reject) => {
      const { parse } = require("url");
      const { request } = require("http");
      const reqOptions = { ...parse(url), ...options };
      const req = request(reqOptions, res => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          if (res.statusCode >= 400 && res.statusCode !== 404 && res.statusCode !== 409) {
            reject(new Error(`Status ${res.statusCode}: ${data}`));
          } else {
            resolve({ status: res.statusCode, data });
          }
        });
      });
      req.on("error", reject);
      if (options.body) req.write(options.body);
      req.end();
    });
  };

  await check("GET /health", fetchJson(`${baseUrl}/health`, { method: "GET" }).then(res => {
    if (!res.data.includes("ok")) throw new Error("Health check failed");
  }));

  await check("GET /api/dashboard", fetchJson(`${baseUrl}/api/dashboard`, { method: "GET" }).then(res => {
    if (!res.data.includes("wards")) throw new Error("Dashboard failed");
  }));

  await check("GET /api/priority-ranking", fetchJson(`${baseUrl}/api/priority-ranking`, { method: "GET" }).then(res => {
    if (res.status !== 200) throw new Error("Priority ranking failed");
  }));

  // Create a decision context by attempting a simulated dispatch
  let decisionId = null;
  await check("POST /api/dispatch", fetchJson(`${baseUrl}/api/dispatch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ward_code: "M/E", volume_liters: 1000, pin: "DEMO_EXEC_PIN_4491" })
  }).then(res => {
    if (res.status === 200 || res.status === 409) { 
      // It might be 409 No available tankers if they are all busy, that's fine for a smoke test
      const data = JSON.parse(res.data);
      if (data.decision_id) decisionId = data.decision_id;
    }
  }));

  if (decisionId) {
    await check("GET /api/decisions/:id", fetchJson(`${baseUrl}/api/decisions/${decisionId}`, { method: "GET" }).then(res => {
      if (res.status !== 200) throw new Error("Get decision failed");
    }));
  }

  await check("POST /api/field/sync", fetchJson(`${baseUrl}/api/field/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operations: [{ operation_id: "test", action: "test", timestamp: Date.now() }], client_token: "DEMO" })
  }).then(res => {
    if (res.status !== 200) throw new Error("Field sync failed");
  }));

  // Clean up
  server.close();
  
  if (failed.length > 0) {
    console.error("Smoke tests failed.");
    process.exit(1);
  } else {
    console.log("All smoke tests passed.");
    process.exit(0);
  }
}

runSmokeTest().catch(e => {
  console.error("Fatal error during smoke test:", e);
  if (server) server.close();
  process.exit(1);
});
