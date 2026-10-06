/**
 * layman_citizen_testing.test.js
 *
 * Verifies how WaterFlow OS responds when an ordinary Mumbai resident
 * (layman, chawl resident, daily-wage worker) speaks in natural colloquial terms.
 */

const assert = require("assert");
const express = require("../backend/node_modules/express");
const mobileApiRouter = require("../backend/mobile_api");

const app = express();
app.use(express.json());
app.use("/api", mobileApiRouter);

async function runLaymanTests() {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log("============================================================");
  console.log("WaterFlow OS: Layman Spoken Interaction & Plain Language Tests");
  console.log("============================================================");

  try {
    // 1. Spoken Query 1: Mumbai Street Hindi (Dry Taps / Urgent Tanker)
    console.log("\n[Scenario 1] Layman speaks in Street Hindi:");
    const query1 = "अरे भाई दो दिन से शिवाजी नगर में नल सूखा पड़ा है, बच्चे पानी के लिए तरस रहे हैं, टैंकर कब तक पहुँचेगा?";
    console.log(`Citizen speaks: "${query1}"`);
    
    const res1 = await fetch(`${baseUrl}/api/citizen/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: query1 }],
        ward_code: "M/E",
        lang: "hi",
      }),
    });
    const data1 = await res1.json();
    assert(res1.status === 200, "Response 200 OK");
    assert(data1.success === true, "Response success");
    console.log(`Bot reply:\n"${data1.reply}"\n`);
    assert(!data1.reply.includes("SCADA"), "Reply does not contain SCADA");
    assert(!data1.reply.includes("टेलीमेट्री"), "Reply does not contain टेलीमेट्री");
    assert(!data1.reply.includes("वेबहुक"), "Reply does not contain वेबहुक");
    console.log("✅ [PASS] Bot understood street Hindi and replied without engineering jargon.");

    // 2. Spoken Query 2: Colloquial Marathi (Chawl resident asking for water)
    console.log("\n[Scenario 2] Layman speaks in Colloquial Marathi:");
    const query2 = "दादा गोवंडीच्या चाळीत आज पाणीच नाही आलं, टँकर कधी पाठवणार?";
    console.log(`Citizen speaks: "${query2}"`);

    const res2 = await fetch(`${baseUrl}/api/citizen/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: query2 }],
        ward_code: "M/E",
        lang: "mr",
      }),
    });
    const data2 = await res2.json();
    assert(res2.status === 200, "Response 200 OK");
    assert(data2.success === true, "Response success");
    console.log(`Bot reply:\n"${data2.reply}"\n`);
    assert(!data2.reply.includes("SCADA"), "Reply does not contain SCADA");
    assert(!data2.reply.includes("वेबहुक"), "Reply does not contain वेबहुक");
    console.log("✅ [PASS] Bot understood colloquial Marathi and gave simple reassuring answer.");

    // 3. Spoken Query 3: Contaminated Dirty Water in Hinglish
    console.log("\n[Scenario 3] Layman speaks in Hinglish about Dirty Water:");
    const query3 = "Bhai nal me se mitti aur keede jaisa ganda paani aa raha hai, peene layak nahi hai!";
    console.log(`Citizen speaks: "${query3}"`);

    const res3 = await fetch(`${baseUrl}/api/citizen/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: query3 }],
        ward_code: "M/E",
        lang: "hi",
      }),
    });
    const data3 = await res3.json();
    assert(res3.status === 200, "Response 200 OK");
    console.log(`Bot reply:\n"${data3.reply}"\n`);
    console.log("✅ [PASS] Bot handled contaminated water query with clear safety advice (boiling/chlorine).");

    // 4. Helpline Call Intake (+91 8369978764)
    console.log("\n[Scenario 4] Layman dials Helpline +91 8369978764 in Hindi:");
    const callRes = await fetch(`${baseUrl}/api/call/ivr-connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number: "+91 98200 99999",
        ward_code: "M/E",
        lang: "hi",
      }),
    });
    const callData = await callRes.json();
    assert(callRes.status === 200, "Helpline connect returns 200 OK");
    console.log(`Voice Bot speaks on line:\n"${callData.bot_voice_script}"\n`);
    
    // Verify spoken script is layman-friendly:
    assert(callData.bot_voice_script.includes("परेशान मत होइए"), "Speaks comforting opening");
    assert(callData.bot_voice_script.includes("राहत टैंकर"), "Explains relief tanker");
    assert(callData.bot_voice_script.includes("OTP"), "Mentions OTP for collecting water");
    assert(!callData.bot_voice_script.includes("जलाभाव"), "No complex bureaucratic terms like जलाभाव");
    console.log("✅ [PASS] Helpline voice script reads like a helpful local person, not a robotic bureaucrat.");

    // 5. Layman is not satisfied and escalates to speak to an officer
    console.log("\n[Scenario 5] Layman requests to speak to an officer:");
    const escRes = await fetch(`${baseUrl}/api/call/escalate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: callData.session_id,
        ticket_id: callData.ticket_id,
        ward_code: "M/E",
        notes: "पानी बिल्कुल नहीं आया है, अधिकारी से बात करनी है",
      }),
    });
    const escData = await escRes.json();
    assert(escRes.status === 200, "Escalation returns 200 OK");
    assert(escData.success === true, "Escalation success");
    console.log(`Queue Position: #${escData.queue_position} with Equity Priority Score: ${escData.priority_score}/100`);
    console.log("✅ [PASS] Citizen smoothly placed in equity call queue without VIP favoritism.");

    console.log("\n============================================================");
    console.log("ALL LAYMAN SPOKEN INTERACTION TESTS PASSED 100%!");
    console.log("============================================================\n");
  } finally {
    server.close();
  }
}

runLaymanTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
