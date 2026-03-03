import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";

function saveJsonPlugin() {
  return {
    name: "save-json",
    configureServer(server) {
      server.middlewares.use("/api/save-json", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          try {
            const { filename, data } = JSON.parse(body);
            if (!filename || typeof filename !== "string" || !/^[\w-]+\.json$/.test(filename)) {
              res.statusCode = 400;
              res.end("Invalid filename");
              return;
            }
            const publicDir = path.resolve(process.cwd(), "public");
            fs.writeFileSync(path.join(publicDir, filename), JSON.stringify(data));
            res.statusCode = 200;
            res.end("OK");
          } catch (e) {
            res.statusCode = 500;
            res.end(String(e));
          }
        });
      });
    },
  };
}

export default defineConfig({
  base: "/nsw-rental-price-explorer/",
  plugins: [react(), tailwindcss(), saveJsonPlugin()],
  server: {
    proxy: {
      "/api/nsw-data": {
        target: "https://www.nsw.gov.au",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nsw-data/, ""),
      },
    },
  },
});
