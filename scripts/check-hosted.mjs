// Existing Sites service access only. Accept the credential through hidden stdin,
// never a file, command argument, URL or browser storage. It supplies no identity.
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.setEncoding("utf8");
console.log("Ready for private Site service check JSON on hidden stdin.");
let input = "";
process.stdin.on("data", async (chunk) => {
  input += chunk;
  if (!input.includes("\n")) return;
  process.stdin.pause();
  try {
    const { url, token } = JSON.parse(input.trim());
    const u = new URL(url);
    if (u.origin !== "https://sassycam-studio.vhaloo.chatgpt.site")
      throw new Error("Unexpected Site origin.");
    const headers = { "OAI-Sites-Authorization": "Bearer " + token };
    const page = await fetch(u, { headers, redirect: "error" });
    const html = await page.text();
    const response = await fetch(new URL("/api/status", u), {
      headers,
      redirect: "error",
    });
    const state = await response.json();
    const mutation = await fetch(new URL("/api/reply", u), {
      method: "POST",
      headers: {
        ...headers,
        origin: u.origin,
        "content-type": "application/json",
        "x-sassycam-request": "1",
      },
      body: JSON.stringify({
        provider: "openai",
        text: "service isolation check",
      }),
    });
    const out = {
      pageStatus: page.status,
      pageContainsStudio:
        html.includes("La vedette") || html.includes("Le studio"),
      statusCode: response.status,
      version: state.version,
      userPresent: !!state.user,
      planCapability: state.capabilities?.personalPlan,
      anonymousMutationStatus: mutation.status,
    };
    console.log(JSON.stringify(out));
    process.exit(
      out.pageStatus === 200 &&
        out.version === "1.0.0" &&
        !out.userPresent &&
        out.anonymousMutationStatus === 401
        ? 0
        : 1,
    );
  } catch {
    console.error(
      "Private Site service check failed; no credential was logged.",
    );
    process.exit(1);
  }
});
