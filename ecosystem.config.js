module.exports = {
  apps: [
    {
      name: "magizh-gateway",
      script: "./services/gateway/index.ts",
      interpreter: "node_modules/.bin/tsx",
      cwd: "/var/www/magizhnaazh",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 8000
      }
    },
    {
      name: "magizh-auth",
      script: "./services/auth-service/index.ts",
      interpreter: "node_modules/.bin/tsx",
      cwd: "/var/www/magizhnaazh",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 8001
      }
    },
    {
      name: "magizh-marketplace",
      script: "./services/marketplace-service/index.ts",
      interpreter: "node_modules/.bin/tsx",
      cwd: "/var/www/magizhnaazh",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 8002
      }
    },
    {
      name: "magizh-event-budget",
      script: "./services/event-budget-service/index.ts",
      interpreter: "node_modules/.bin/tsx",
      cwd: "/var/www/magizhnaazh",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 8003
      }
    },
    {
      name: "magizh-booking",
      script: "./services/booking-payment-service/index.ts",
      interpreter: "node_modules/.bin/tsx",
      cwd: "/var/www/magizhnaazh",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 8004
      }
    },
    {
      name: "magizh-invitation",
      script: "./services/invitation-service/index.ts",
      interpreter: "node_modules/.bin/tsx",
      cwd: "/var/www/magizhnaazh",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 8005
      }
    },
    {
      name: "magizh-guest-feedback",
      script: "./services/guest-feedback-service/index.ts",
      interpreter: "node_modules/.bin/tsx",
      cwd: "/var/www/magizhnaazh",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 8006
      }
    },
    {
      name: "magizh-monitor",
      script: "./services/monitor-service/index.ts",
      interpreter: "node_modules/.bin/tsx",
      cwd: "/var/www/magizhnaazh",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 8007
      }
    }
  ]
};
