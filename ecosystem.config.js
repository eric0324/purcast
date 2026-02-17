module.exports = {
  apps: [
    {
      name: "podify",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/podify",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/podify/error.log",
      out_file: "/var/log/podify/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
