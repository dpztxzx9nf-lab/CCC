const { spawn } = require("child_process");

const child = spawn("npm", ["run", "archivist:watch"], {
  cwd: "C:\\Projects\\CCC",
  shell: true,
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});