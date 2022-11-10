import { config } from "https://deno.land/x/dotenv/mod.ts";
import { Octokit } from "../deps.ts";

const { GITHUB_ACCESS_KEY } = config();

export const octokit = new Octokit({
  auth: GITHUB_ACCESS_KEY,
});
