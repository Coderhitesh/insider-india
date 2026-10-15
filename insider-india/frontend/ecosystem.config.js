module.exports = {
  apps: [
    {
      name: "insider-india",

      script: "npm",

      args: "start",

      cwd: "/root/insider-india/frontend",

      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
