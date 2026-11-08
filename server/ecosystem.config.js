// ecosystem.config.js - PM2 Configuration for Schedule-Rakana Standalone API
module.exports = {
  apps: [
    {
      name: 'schedule-rakana',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '150M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};

