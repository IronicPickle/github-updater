import { config } from "./deps.ts";
import { octokit } from "./lib/api.ts";
import { sleep } from "./lib/utils.ts";

const {
  GITHUB_REPO_OWNER,
  GITHUB_REPO_NAME,
  GITHUB_REPO_BRANCH,
  ON_CHANGE_COMMAND,
  ON_CHANGE_COMMAND_PATH,
} = config();

const login = async () => {
  try {
    const { data } = await octokit.rest.users.getAuthenticated();
    console.log(`> Authenticated as ${data.login}`);

    return data;
  } catch (err) {
    console.error(err);
  }
  return null;
};

const runCommand = async () => {
  try {
    const cmd = JSON.parse(ON_CHANGE_COMMAND);

    console.log(
      `> Running update command\n  Command - '${cmd.join(
        " "
      )}'\n  Path - '${ON_CHANGE_COMMAND_PATH}'\n`
    );

    await Deno.run({
      cmd,
      cwd: ON_CHANGE_COMMAND_PATH,
    }).status();
  } catch (err) {
    console.error(err);
    return;
  }
};

const checkEvents = async (events: any[]) => {
  const mostRecentPushEvent = events.find(({ type }) => type === "PushEvent");
  if (!mostRecentPushEvent) return;

  const {
    payload: { ref, push_id: pushId, head, size },
  } = mostRecentPushEvent;

  const branch = ref.split("/")[2];
  if (branch !== GITHUB_REPO_BRANCH) return;

  const lastPushId = localStorage.getItem("lastPushId");
  if (lastPushId == pushId) return console.log("> No changed detected");
  localStorage.setItem("lastPushId", pushId);

  console.log(
    `> Changed detected\n  Ref - ${ref}\n  Push - ${pushId}\n  Head - ${head}\n  Commits - ${size}\n`
  );
  await runCommand();
};

const poll = async () => {
  try {
    const { data: events, headers } =
      await octokit.rest.activity.listRepoEvents({
        owner: GITHUB_REPO_OWNER,
        repo: GITHUB_REPO_NAME,
      });
    const pollInterval = headers["x-poll-interval"];

    return { events, pollInterval };
  } catch (err) {
    console.error(err);
  }
  return null;
};

const startPoll = async () => {
  let pollInterval = 60;

  console.log(
    `> Starting poll of repo: ${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`
  );

  while (true) {
    console.log(`> Polling...`);

    const pollData = await poll();
    if (!pollData) continue;

    pollInterval = pollData.pollInterval;
    await checkEvents(pollData.events);

    console.log(`\n> ${pollInterval} second(s) until next poll`);
    await sleep(pollInterval * 1000);
  }
};

const start = async () => {
  const loginData = await login();
  if (!loginData) return;

  await startPoll();
};

start();
