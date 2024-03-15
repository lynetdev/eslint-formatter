"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_eslint2 = require("eslint");

// src/builds.ts
var zlib = __toESM(require("zlib"));
var import_synckit = require("synckit");
var pushNewBuild = (projectToken, { git, linter }) => {
  console.log("Prepare to push linter results");
  const payload = JSON.stringify({
    git,
    linter: {
      ...linter,
      linterId: "eslint"
    }
  });
  console.log("Compressing payload");
  const compressedPayload = zlib.gzipSync(payload);
  let pushBuild;
  try {
    pushBuild = (0, import_synckit.createSyncFn)(require.resolve("./workers/push-build"));
  } catch {
    throw new Error("Cannot instantiate worker");
  }
  let pushBuiltResult;
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
var isServerResponse = (pushBuiltResult) => typeof pushBuiltResult === "object" && pushBuiltResult !== null && "ok" in pushBuiltResult && typeof pushBuiltResult.ok === "boolean";

// src/git.ts
var import_synckit3 = require("synckit");

// src/workers/git-commit.ts
var import_simple_git = require("simple-git");
var import_synckit2 = require("synckit");
var sg = (0, import_simple_git.simpleGit)();
var getCommitInfoFromGit = (0, import_synckit2.runAsWorker)(async () => {
  const [latestCommit, branch] = await Promise.all([
    sg.log().then((log) => log.latest),
    sg.branch().then((branches) => branches.current)
  ]);
  if (!latestCommit) {
    throw new Error("No commits found in the repository.");
  }
  const { author_email, author_name, date, hash, message } = latestCommit;
  return {
    author: {
      name: author_name,
      email: author_email
    },
    message,
    date,
    sha: hash,
    branch: process.env["HEAD_REF"] ?? branch
  };
});

// src/git.ts
var enrichWithGithub = (commit) => {
  const {
    GITHUB_EVENT_NAME,
    // the name of the event that triggered the workflow. For example, workflow_dispatch.
    GITHUB_REF_TYPE,
    // the type of ref that triggered the workflow run. Valid values are `branch` or `tag`.
    GITHUB_REF_NAME,
    // the short ref name of the branch or tag that triggered the workflow run. This value matches the branch or tag name shown on GitHub. For example, feature-branch-1.
    GITHUB_SERVER_URL,
    // https://github.com
    GITHUB_REPOSITORY,
    // the owner and repository name (e.g.`octocat/Hello-World`)
    GITHUB_SHA
    // the commit SHA that triggered the workflow
  } = process.env;
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
      sha: GITHUB_SHA || commit.sha
    }
  };
};
var isGithub = Boolean(process.env["GITHUB_ACTIONS"]);
var enrichWithCIData = (commit) => {
  if (isGithub) {
    return enrichWithGithub(commit);
  }
  return {
    provider: "unknown",
    commit
  };
};
var getGitInfo = () => {
  let getCommitInfoFromGit2;
  try {
    getCommitInfoFromGit2 = (0, import_synckit3.createSyncFn)(
      require.resolve("./workers/git-commit")
    );
  } catch {
    throw new Error("Cannot instantiate worker");
  }
  const commit = getCommitInfoFromGit2();
  return enrichWithCIData(commit);
};

// src/parse.ts
var import_eslint = require("eslint");
var parseMessage = ({
  ruleId,
  column,
  line,
  endLine,
  message,
  messageId,
  nodeType,
  fatal,
  severity,
  fix
}) => ({
  ruleId,
  column,
  line,
  endLine,
  message,
  messageId,
  nodeType,
  fatal,
  severity,
  fixable: Boolean(fix)
});
var parseResult = (cwd) => ({ filePath, messages }) => ({
  filePath: filePath.replace(`${cwd}`, ""),
  violations: messages.map(parseMessage)
});
var parseResults = (results, cwd) => results.map(parseResult(cwd));

// src/index.ts
var formatter = (results, context) => {
  const gitInfo = getGitInfo();
  if (!gitInfo) {
    process.exit(0);
  }
  const projectToken = process.env["LYNET_TOKEN"];
  const cwd = (context == null ? void 0 : context.cwd) ?? process.cwd();
  if (!projectToken) {
    throw new Error(
      "Missing project token. Please set LYNET_TOKEN environment variable."
    );
  }
  const build = {
    git: gitInfo,
    linter: {
      rules: context == null ? void 0 : context.rulesMeta,
      results: parseResults(results, cwd)
    }
  };
  pushNewBuild(projectToken, build);
  process.exit(0);
};
module.exports = formatter;
