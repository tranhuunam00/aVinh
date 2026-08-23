module.exports = {
  apps: [
    {
      name: 'vinmec-reporting',
      script: 'server.js',
      exec_mode: 'fork',
      instances: 1, // Single instance for SQLite WAL mode integrity
      autorestart: true,
      watch: false, // Turn off in production
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4001
      },
      // Logging
      output: './logs/pm2-out.log',
      error: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
