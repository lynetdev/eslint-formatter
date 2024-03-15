"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/workers/git-commit.ts
var git_commit_exports = {};
__export(git_commit_exports, {
  getCommitInfoFromGit: () => getCommitInfoFromGit
});
module.exports = __toCommonJS(git_commit_exports);
var import_simple_git = require("simple-git");
var import_synckit = require("synckit");
var sg = (0, import_simple_git.simpleGit)();
var getCommitInfoFromGit = (0, import_synckit.runAsWorker)(async () => {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getCommitInfoFromGit
});
