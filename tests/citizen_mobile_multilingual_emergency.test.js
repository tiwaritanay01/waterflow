/**
 * Test Suite: Citizen Mobile Access, Trilingual Support, Emergency Call Webhook,
 * Groq LLM AI Chatbot, and Offline SMS Ticket Generation.
 */

const express = require("../backend/node_modules/express");
const mobileApiRouter = require("../backend/mobile_api");

const app = express();
app.use(express.json());
app.use("/api", mobileApiRouter);

async function runTests() {
  console.log("============================================================");
  console.log("WaterFlow OS: Practical Field & Citizen Access Verification");
  console.log("============================================================");

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  try {
    // 1. Emergency Call Webhook Test
    console.log("\n[Test 1] POST /api/emergency/call-webhook");
    const emergencyRes = await fetch(`${baseUrl}/api/emergency/call-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number: "+91-9820012345",
        ward_code: "M/E",
        ward_name: "Govandi / Mankhurd",
        lat: 19.055,
        lng: 72.918,
        landmark: "Shivaji Nagar Sector 4",
        emergency_type: "Severe Dry Tap (>72h)",
        source: "citizen_mobile_sos_button",
      }),
    });
    const emergencyData = await emergencyRes.json();

    assert(emergencyRes.status === 201, `Emergency webhook returns 201 Created (got ${emergencyRes.status})`);
    assert(emergencyData.success === true, "Response reports success: true");
    assert(typeof emergencyData.ticket_id === "string" && emergencyData.ticket_id.startsWith("WF-EMERG-"), `Ticket ID generated: ${emergencyData.ticket_id}`);
    assert(emergencyData.details?.ivr_callback?.scheduled === true, "IVR callback outbound call scheduled");
    assert(emergencyData.details?.priority_tier === "Tier-1 Critical (RED_ALERT)", "Priority Tier set to Tier-1 Critical RED_ALERT");

    // 2. Emergency Status Query Test
    console.log("\n[Test 2] GET /api/emergency/status");
    const statusRes = await fetch(`${baseUrl}/api/emergency/status`);
    const statusData = await statusRes.json();
    assert(statusRes.status === 200, `Status returns 200 OK (got ${statusRes.status})`);
    assert(statusData.active_red_alerts >= 1, `Active red alerts logged: ${statusData.active_red_alerts}`);

    // 3. Offline SMS Sync Test
    console.log("\n[Test 3] POST /api/citizen/offline-sync");
    const syncRes = await fetch(`${baseUrl}/api/citizen/offline-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offline_reports: [
          {
            ticket_id: "WF-SMS-781924",
            phone_number: "+91-9820099887",
            issue_type: "Dry Pipeline Standpost #4",
            ward_code: "M/E",
            lat: 19.055,
            lng: 72.918,
            created_at: new Date().toISOString(),
          },
        ],
      }),
    });
    const syncData = await syncRes.json();

    assert(syncRes.status === 200, `Offline sync returns 200 OK (got ${syncRes.status})`);
    assert(syncData.synced_count === 1, `Synced count is 1`);
    assert(syncData.reports?.[0]?.report_id === "WF-SMS-781924", `Offline ticket ID retained: WF-SMS-781924`);

    // 4. Citizen Chatbot Groq LLM API Test (Hindi)
    console.log("\n[Test 4] POST /api/citizen/chat (Hindi Query with Groq LLM)");
    const chatHiRes = await fetch(`${baseUrl}/api/citizen/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "वार्ड M/E में पानी कब आएगा?" }],
        ward_code: "M/E",
        lang: "hi",
      }),
    });
    const chatHiData = await chatHiRes.json();

    assert(chatHiRes.status === 200, `Chat Hindi endpoint returns 200 OK (got ${chatHiRes.status})`);
    assert(chatHiData.success === true, "Chat response success is true");
    assert(typeof chatHiData.reply === "string" && chatHiData.reply.length > 20, `Chatbot generated reply: ${chatHiData.reply.slice(0, 70)}...`);

    // 5. Citizen Chatbot Groq LLM API Test (Marathi)
    console.log("\n[Test 5] POST /api/citizen/chat (Marathi Query with Groq LLM)");
    const chatMrRes = await fetch(`${baseUrl}/api/citizen/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "माझा पाण्याचा टँकर कुठे आहे?" }],
        ward_code: "M/E",
        lang: "mr",
      }),
    });
    const chatMrData = await chatMrRes.json();

    assert(chatMrRes.status === 200, `Chat Marathi endpoint returns 200 OK (got ${chatMrRes.status})`);
    assert(chatMrData.success === true, "Chat response success is true");
    assert(typeof chatMrData.reply === "string" && chatMrData.reply.length > 20, `Chatbot generated Marathi reply: ${chatMrData.reply.slice(0, 70)}...`);

    console.log(`\n============================================================`);
    console.log(`RESULTS: ${passed}/${total} assertions passed successfully!`);
    console.log(`============================================================\n`);
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
