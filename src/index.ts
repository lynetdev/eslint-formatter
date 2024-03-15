import { ESLint } from "eslint";

import { pushNewBuild } from "./builds";
import { getGitInfo } from "./git";
import { parseResults } from "./parse";

const formatter: ESLint.Formatter["format"] = (results, context) => {
  const gitInfo = getGitInfo();

  if (!gitInfo) {
    // TODO: return the output formatted with the base formatter
    process.exit(0);
  }

  const projectToken = process.env["LYNET_TOKEN"];

  // https://eslint.org/blog/2021/12/eslint-v8.4.0-released/#context.cwd
  const cwd = context?.cwd ?? process.cwd();

  if (!projectToken) {
    throw new Error(
      "Missing project token. Please set LYNET_TOKEN environment variable.",
    );
  }

  const build = {
    git: gitInfo,
    linter: {
      rules: context?.rulesMeta,
      results: parseResults(results, cwd),
    },
  };

  pushNewBuild(projectToken, build);

  // TODO: return the output formatted with the base formatter
  process.exit(0);
};

module.exports = formatter;
