import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Backend from `npm run dev:server`; keeps API calls same-origin in dev.
    proxy: { "/api": "http://127.0.0.1:3001" },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "antd",
              test: /node_modules[\\/](antd|@ant-design|@rc-component|rc-)/,
              priority: 20,
            },
            {
              name: "react",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
