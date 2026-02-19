module.exports = {
  apps: [
    {
      name: "purcast",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/purcast",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/purcast/error.log",
      out_file: "/var/log/purcast/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    {
      name: "purcast-worker",
      script: "node_modules/.bin/tsx",
      args: "src/worker.ts",
      cwd: "/var/www/purcast",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "/var/log/purcast/worker-error.log",
      out_file: "/var/log/purcast/worker-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
