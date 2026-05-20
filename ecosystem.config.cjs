module.exports = {
  apps: [
    {
      name: "ccc-archivist",
      script: "npm",
      args: "run archivist:watch",
      interpreter: "cmd.exe",
      interpreter_args: "/c",
      cwd: "C:/Projects/CCC",
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
