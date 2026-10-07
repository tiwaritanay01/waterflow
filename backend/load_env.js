/**
 * WaterFlow OS — Automatic Environment Loader
 * Loads .env variables into process.env without requiring external dependencies.
 */
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const candidatePaths = [
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, ".env"),
    path.resolve(process.cwd(), ".env"),
  ];

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, "utf-8");
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const match = trimmed.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // Remove enclosing quotes if any
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
        break; // Successfully loaded primary .env
      } catch (err) {
        console.warn("⚠️ Failed reading .env at", envPath, err.message);
      }
    }
  }
}

loadEnv();

module.exports = {
  loadEnv,
};
