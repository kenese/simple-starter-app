import { configDefaults, defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname =
    typeof __dirname !== "undefined"
        ? __dirname
        : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    test: {
        exclude: [...configDefaults.exclude, "**/dist/**"],
        include: ["src/**/*.test.{ts,js}"],
    },
});
