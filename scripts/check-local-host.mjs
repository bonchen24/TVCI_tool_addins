import https from "node:https";

const target = process.argv[2];
if (!target) {
  console.error("Missing local host URL.");
  process.exit(2);
}

let targetUrl;
try {
  targetUrl = new URL(target);
} catch {
  console.error("Invalid local host URL.");
  process.exit(2);
}

if (targetUrl.protocol !== "https:" || !["localhost", "127.0.0.1"].includes(targetUrl.hostname)) {
  console.error("The local host check only accepts HTTPS localhost URLs.");
  process.exit(2);
}

const request = https.get(targetUrl, { rejectUnauthorized: false }, (response) => {
  const chunks = [];
  response.setEncoding("utf8");
  response.on("data", (chunk) => chunks.push(chunk));
  response.on("end", () => {
    const content = chunks.join("");
    if (response.statusCode === 200 && /id=["']root["']/.test(content)) {
      process.exitCode = 0;
      return;
    }

    console.error(`HTTP ${response.statusCode ?? "unknown"} or task pane root element is missing.`);
    process.exitCode = 1;
  });
});

request.setTimeout(5000, () => request.destroy(new Error("Local host check timed out.")));
request.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
