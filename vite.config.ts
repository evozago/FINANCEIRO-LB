import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    host: "::",
    port: 8080,
    allowedHosts: ["8080-i0e5zu16p7yr0ix1l6tcf-ef03d5bc.manusvm.computer", "8081-i0e5zu16p7yr0ix1l6tcf-ef03d5bc.manusvm.computer"],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
