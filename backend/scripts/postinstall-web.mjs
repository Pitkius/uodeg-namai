import { existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
const frontendPkg = path.join(backendRoot, "..", "frontend", "package.json");

if (process.env.SKIP_FRONTEND_BUILD === "1") {
  console.log("[postinstall] SKIP_FRONTEND_BUILD=1, skip SPA build");
  process.exit(0);
}

if (!existsSync(frontendPkg)) {
  console.warn("[postinstall] frontend/ not found next to backend/, skip SPA build");
  process.exit(0);
}

console.log("[postinstall] building SPA into backend/public/app …");
execSync("npm run build:web", { stdio: "inherit", cwd: backendRoot });
