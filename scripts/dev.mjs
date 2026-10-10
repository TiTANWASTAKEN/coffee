// Runs the API server and the Vite dev server side by side.
import { spawn } from "node:child_process";

const tasks = [
  { name: "api", script: "dev:api", color: "\x1b[33m" },
  { name: "web", script: "dev:web", color: "\x1b[36m" },
];

const children = tasks.map(({ name, script, color }) => {
  const child = spawn("npm", ["run", "--silent", script], { shell: true, stdio: ["inherit", "pipe", "pipe"] });
  const prefix = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, out) =>
    stream.on("data", (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) if (line) out.write(prefix + line + "\n");
    });
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on("exit", (code) => {
    console.log(`${prefix}exited with code ${code}`);
    shutdown(code ?? 0);
  });
  return child;
});

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill();
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
