const http = require("http");
process.env.APP_MODE = "PRODUCTION"; process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:54322/postgres"; const { app } = require("../backend/server.js"); const db = require("../backend/db.js");

const PORT = 3009; // random port for testing
let server;

async function runSmokeTest() {
  await db.checkDb(); server = app.listen(PORT, () => {
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
    const data = JSON.parse(res.data);
    if (data.policy_version !== "3.0.0-research") {
      throw new Error(`Expected policy_version '3.0.0-research', got '${data.policy_version}'`);
    }
    if (data.total_wards !== 24) {
      throw new Error(`Expected total_wards 24, got ${data.total_wards}`);
    }
    const ward1 = data.queue.find(w => String(w.ward_id) === "1");
    if (!ward1 || ward1.total_score !== 79.2 || ward1.tier !== 1) {
      throw new Error(`Ward 1 priority score/tier mismatch: score=${ward1?.total_score}, tier=${ward1?.tier}`);
    }
    const ward2 = data.queue.find(w => String(w.ward_id) === "2");
    if (!ward2 || ward2.total_score !== 70.3 || ward2.tier !== 2) {
      throw new Error(`Ward 2 priority score/tier mismatch: score=${ward2?.total_score}, tier=${ward2?.tier}`);
    }
  }));

  // Create a decision context by attempting a simulated dispatch
  let decisionId = null;
  await check("POST /api/dispatch", fetchJson(`${baseUrl}/api/dispatch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ward_code: "1", volume_liters: 1000, pin: "DEMO_EXEC_PIN_4491" })
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
