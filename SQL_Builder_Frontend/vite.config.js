import { defineConfig } from "vite";

// Vite config to allow connecting from other devices on the same LAN.
export default defineConfig({
  server: {
    // bind to all addresses so other devices on the Wi‑Fi can connect
    host: true,
  },
});
