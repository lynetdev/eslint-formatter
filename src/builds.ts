import * as zlib from "node:zlib";
import { createSyncFn } from "synckit";

import type { GitInfo } from "./git";

/**
 * A Build is only a snapshot of the CLI output and it's not related to the git history timeline in
 * any way
 */
export type Build = {
  git: GitInfo;
  linter: {
    rules?: Record<string, unknown>;
    results: Array<unknown>;
  };
};

export const pushNewBuild = (projectToken: string, { git, linter }: Build) => {
  console.log("Prepare to push linter results");

  const payload = JSON.stringify({
    git,
    linter: {
      ...linter,
      linterId: "eslint",
    },
  });

  console.log("Compressing payload");

  const compressedPayload = zlib.gzipSync(payload);

  let pushBuild;

  /**
   * `require.resolve` generates a [require-resolve-not-external] error when used at runtime.
   * We can silence the warning using try/catch since we know the file will be bundled.
   * @see tsup.config.ts
   * @see: https://github.com/evanw/esbuild/commit/36116c18be4c3b0290b7a949a930ba915a492a2c
   * @see: https://github.com/evanw/esbuild/pull/1155
   */
  try {
    pushBuild = createSyncFn(require.resolve("./workers/push-build"));
  } catch {
    throw new Error("Cannot instantiate worker");
  }

  let pushBuiltResult: unknown;

  try {
    console.log("Pushing results");
    pushBuiltResult = pushBuild(projectToken, compressedPayload);
  } catch (error) {
    console.error("Error while making request to Lynet", error);
    process.exit(1);
  }

  if (isServerResponse(pushBuiltResult) && pushBuiltResult.ok) {
    console.log("Linter results pushed successfully", pushBuiltResult);
    return;
  }

  console.error("Error while pushing results to Lynet", pushBuiltResult);
  process.exit(1);
};

const isServerResponse = (
  pushBuiltResult: unknown,
): pushBuiltResult is { ok: boolean } =>
  typeof pushBuiltResult === "object" &&
  pushBuiltResult !== null &&
  "ok" in pushBuiltResult &&
  typeof pushBuiltResult.ok === "boolean";
