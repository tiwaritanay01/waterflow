const http = require("http");
const { parse } = require("url");

async function fetchJson(url, options) {
  return new Promise((resolve, reject) => {
    const reqOptions = { ...parse(url), ...options };
    const req = http.request(reqOptions, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        resolve({ status: res.statusCode, data });
      });
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runTest() {
  console.log("Starting Persistence Integration Test...");
  const db = require("../backend/db.js");
  await new Promise(r => setTimeout(r, 1000)); // wait for db connection
  if (!db.getDbAvailable()) {
    console.error("❌ Database is not available. Persistence test requires running PostgreSQL database.");
    process.exit(0); // Soft fail if no DB in CI
  }

  // Clear require cache to simulate fresh start
  let serverModule = require("../backend/server.js");
  let server = serverModule.app.listen(3015);
  console.log("Server 1 started on 3015");

  // Dispatch a mission
  const dispatchRes = await fetchJson("http://localhost:3015/api/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ward_code: "M/E", volume_liters: 1000, tanker_id: "T-01" })
  });

  const parsed = JSON.parse(dispatchRes.data);
  const missionId = parsed.mission?.id;
  console.log("Dispatch response:", dispatchRes.status, "Mission ID:", missionId);

  server.close();
  console.log("Server 1 closed.");

  // Clear cache for fresh invocation
  Object.keys(require.cache).forEach(function(key) {
    if (key.includes("backend")) {
        delete require.cache[key];
    }
  });

  // Start fresh server
  serverModule = require("../backend/server.js");
  server = serverModule.app.listen(3016);
  console.log("Server 2 started on 3016 (Fresh Process Simulation)");

  // Read missions
  const missionsRes = await fetchJson("http://localhost:3016/api/field/missions", { method: "GET" });
  const parsedMissions = JSON.parse(missionsRes.data);
  const foundMission = parsedMissions.missions.find(m => m.id === String(missionId));

  if (!foundMission) {
     console.error("❌ Persistence Failed: Fresh process did not load the mission from DB.");
     server.close();
     process.exit(1);
  } else {
     console.log("✅ Persistence Succeeded: Fresh process loaded the mission from DB!");
     server.close();
     process.exit(0);
  }
}

runTest().catch(console.error);
