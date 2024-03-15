import { defineConfig } from "tsup";

/**
 * `src/builds.ts` and `src/git.ts` are kept separate from the main bundle because they are loader
 * by `synckit` in order to make the eslint formatter async.
 *
 */
export default defineConfig({
  target: "node16",
  entry: [
    "src/index.ts",
    "src/workers/git-commit.ts",
    "src/workers/push-build.ts",
  ],
});
