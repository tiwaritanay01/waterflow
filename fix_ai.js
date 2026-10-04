const fs = require('fs');
let content = fs.readFileSync('backend/server.js', 'utf8');

const regex = /async function callAIEngine\(endpoint, body\) \{[\s\S]*?return null;\s*\}/;
const replacement = `async function callAIEngine(endpoint, body) {
  if (!AI_ENGINE_URL || AI_ENGINE_URL === "null" || AI_ENGINE_URL === "undefined") {
    console.log("⚠️  AI_ENGINE_UNAVAILABLE: Skipping " + endpoint);
    return null;
  }
  try {
    const response = await fetch(\`\${AI_ENGINE_URL}\${endpoint}\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(\`AI Engine \${response.status}\`);
    return await response.json();
  } catch (err) {
    console.log(\`⚠️  AI_ENGINE_UNAVAILABLE: \${endpoint} failed - \${err.message}\`);
    return null;
  }
}`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('backend/server.js', content, 'utf8');
  console.log('Fixed callAIEngine');
} else {
  console.log('Regex did not match');
}
