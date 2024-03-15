import { createSyncFn } from "synckit";

import { type Commit } from "./workers/git-commit";

export type GitInfo = {
  provider: "github" | "unknown";
  serverUrl?: string;
  repositorySlug?: string;
  commit: Commit;
};

const enrichWithGithub = (commit: Commit): GitInfo | undefined => {
  // https://docs.github.com/en/actions/learn-github-actions/variables
  const {
    GITHUB_EVENT_NAME, // the name of the event that triggered the workflow. For example, workflow_dispatch.
    GITHUB_REF_TYPE, // the type of ref that triggered the workflow run. Valid values are `branch` or `tag`.

    GITHUB_REF_NAME, // the short ref name of the branch or tag that triggered the workflow run. This value matches the branch or tag name shown on GitHub. For example, feature-branch-1.

    GITHUB_SERVER_URL, // https://github.com
    GITHUB_REPOSITORY, // the owner and repository name (e.g.`octocat/Hello-World`)
    GITHUB_SHA, // the commit SHA that triggered the workflow
  } = process.env;

  /**
   * We only care to push new builds when new commits are added to a branch.
   */
  if (GITHUB_EVENT_NAME !== "push" || GITHUB_REF_TYPE !== "branch") {
    return;
  }

  if (!GITHUB_SERVER_URL || !GITHUB_REPOSITORY) {
    throw new Error("Missing Github Actions env variables");
  }

  return {
    provider: "github",
    serverUrl: GITHUB_SERVER_URL,
    repositorySlug: GITHUB_REPOSITORY,
    commit: {
      ...commit,
      branch: GITHUB_REF_NAME || commit.branch,
      sha: GITHUB_SHA || commit.sha,
    },
  };
};

const isGithub = Boolean(process.env["GITHUB_ACTIONS"]);

const enrichWithCIData = (commit: Commit): GitInfo | undefined => {
  if (isGithub) {
    return enrichWithGithub(commit);
  }

  return {
    provider: "unknown",
    commit,
  };
};

export const getGitInfo = (): GitInfo | undefined => {
  /**
   * `require.resolve` generates a [require-resolve-not-external] error when used at runtime.
   * We can silence the warning using try/catch since we know the file will be bundled.
   * @see tsup.config.ts
   * @see: https://github.com/evanw/esbuild/commit/36116c18be4c3b0290b7a949a930ba915a492a2c
   * @see: https://github.com/evanw/esbuild/pull/1155
   */
  let getCommitInfoFromGit;
  try {
    getCommitInfoFromGit = createSyncFn(
      require.resolve("./workers/git-commit"),
    );
  } catch {
    throw new Error("Cannot instantiate worker");
  }

  const commit = getCommitInfoFromGit();

  return enrichWithCIData(commit);
};
