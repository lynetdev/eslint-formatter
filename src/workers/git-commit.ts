import { simpleGit } from "simple-git";
import { runAsWorker } from "synckit";

/**
 * Useful links:
 * - https://stackoverflow.com/questions/31488803/libgit2sharp-what-is-correct-sha-to-supply-to-github-api-merge-pull-request
 */
const sg = simpleGit();

export type Commit = {
  author: {
    name: string;
    email: string;
  };
  message: string;
  date: string;
  sha: string;
  branch: string;
};

export const getCommitInfoFromGit = runAsWorker(async (): Promise<Commit> => {
  const [latestCommit, branch] = await Promise.all([
    sg.log().then((log) => log.latest),
    sg.branch().then((branches) => branches.current),
  ]);

  if (!latestCommit) {
    throw new Error("No commits found in the repository.");
  }

  const { author_email, author_name, date, hash, message } = latestCommit;

  return {
    author: {
      name: author_name,
      email: author_email,
    },
    message,
    date,
    sha: hash,
    branch: process.env["HEAD_REF"] ?? branch,
  };
});
