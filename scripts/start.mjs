import { spawn } from "node:child_process";

const port = process.env.PORT || "43123";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code ?? signal}`));
    });
  });
}

await run("node_modules/.bin/prisma", ["db", "push", "--skip-generate", "--accept-data-loss"]);
await run("node_modules/.bin/tsx", ["prisma/seed.ts"]);

const server = spawn(
  "node_modules/.bin/next",
  ["start", "--hostname", "0.0.0.0", "--port", String(port)],
  { stdio: "inherit" },
);

function stop(signal) {
  if (!server.killed) server.kill(signal);
}

process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));

server.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

server.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
