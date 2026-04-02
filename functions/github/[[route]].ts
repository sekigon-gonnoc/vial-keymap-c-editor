import { githubAuth } from "@hono/oauth-providers/github";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
// CORS handling for cross-origin auth is disabled (same-origin only)
import type { Context } from "hono";

type Bindings = {
  GITHUB_ID: string;
  GITHUB_SECRET: string;
  FRONTEND_URL?: string;
};

type AppContext = Context<{ Bindings: Bindings }>;

type RepositoryResponse = {
  total_count: number;
  repositories: Array<{ id: number; full_name: string }>;
};

type GitHubInstallationsResponse = {
  total_count: number;
  installations?: Array<{ id: number }>;
};

type GitHubContentsResponse = {
  content: string;
  sha: string;
};

type BranchRefResponse = {
  object: {
    sha: string;
  };
};

type FileUpdate = {
  path: string;
  content: string;
};

type ExecutionContextLike = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
  props: Record<string, unknown>;
};

const app = new Hono<{ Bindings: Bindings }>();

const createGitHubHeaders = (token: string, extraHeaders?: HeadersInit): HeadersInit => ({
  "User-Agent": "vial-keymap-c-editor",
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  ...extraHeaders,
});

const getRequestOrigin = (c: AppContext) => new URL(c.req.url).origin;

const getFrontendUrl = (c: AppContext) => c.env.FRONTEND_URL?.trim() || getRequestOrigin(c);

const setSessionCookie = (c: AppContext, token: string) => {
  const secure = new URL(c.req.url).protocol === "https:";

  setCookie(c, "github_token", token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
};

const clearSessionCookie = (c: AppContext) => {
  const secure = new URL(c.req.url).protocol === "https:";

  setCookie(c, "github_token", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
};

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const getTokenOrUnauthorized = (c: AppContext) => {
  const token = getCookie(c, "github_token");
  if (!token) {
    return null;
  }

  return token;
};

const fetchGitHubJson = async <T>(
  token: string,
  input: string,
  init?: RequestInit
) => {
  const response = await fetch(input, {
    ...init,
    headers: createGitHubHeaders(token, init?.headers),
  });

  return {
    response,
    data: (await response.json()) as T,
  };
};

app.use("/github", githubAuth({}));

app.get("/github", async (c) => {
  const token = c.get("token");
  const user = c.get("user-github");

  if (!token || !user) {
    return c.json({ authenticated: false });
  }

  setSessionCookie(c, token.token);
  return c.redirect(getFrontendUrl(c));
});

app.get("/github/repos", async (c) => {
  const token = getTokenOrUnauthorized(c);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { data: installations } = await fetchGitHubJson<GitHubInstallationsResponse>(
    token,
    "https://api.github.com/user/installations"
  );

  if (installations.total_count === 0 || !installations.installations?.length) {
    return c.json({ total_count: 0, repositories: [] });
  }

  const { data } = await fetchGitHubJson<RepositoryResponse>(
    token,
    `https://api.github.com/user/installations/${installations.installations[0].id}/repositories`
  );

  return c.json(data);
});

app.get("/github/repos/:owner/:repo/branches", async (c) => {
  const token = getTokenOrUnauthorized(c);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { owner, repo } = c.req.param();
  const { data } = await fetchGitHubJson<Array<{ name: string; commit: { sha: string } }>>(
    token,
    `https://api.github.com/repos/${owner}/${repo}/branches`
  );

  return c.json(data);
});

app.get("/github/repos/:owner/:repo/:branch", async (c) => {
  const token = getTokenOrUnauthorized(c);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { owner, repo, branch } = c.req.param();
  const branchResult = await fetchGitHubJson<BranchRefResponse>(
    token,
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`
  );

  if (!branchResult.response.ok) {
    return c.json({ error: "Branch not found" }, 404);
  }

  const treeResult = await fetchGitHubJson<unknown>(
    token,
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branchResult.data.object.sha}?recursive=1`
  );

  if (!treeResult.response.ok) {
    return jsonResponse({ error: "Failed to fetch tree" }, treeResult.response.status);
  }

  return c.json(treeResult.data);
});

app.get("/github/repos/:owner/:repo/:branch/:path", async (c) => {
  const token = getTokenOrUnauthorized(c);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { owner, repo, path, branch } = c.req.param();
  const result = await fetchGitHubJson<GitHubContentsResponse>(
    token,
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
  );

  if (!result.response.ok) {
    return c.json({ error: "File not found" }, 404);
  }

  return c.json({ content: result.data.content });
});

app.put("/github/repos/:owner/:repo/:branch/:path", async (c) => {
  const token = getTokenOrUnauthorized(c);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { owner, repo, path, branch } = c.req.param();
  const { content, message } = await c.req.json<{ content: string; message: string }>();

  const currentFileResult = await fetchGitHubJson<GitHubContentsResponse>(
    token,
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
  );

  const updateResult = await fetchGitHubJson<unknown>(
    token,
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content: btoa(content),
        sha: currentFileResult.data.sha,
        branch,
      }),
    }
  );

  if (!updateResult.response.ok) {
    return jsonResponse({ error: "Failed to update file" }, updateResult.response.status);
  }

  return c.json(updateResult.data);
});

app.post("/github/repos/:owner/:repo/:branch", async (c) => {
  const token = getTokenOrUnauthorized(c);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { owner, repo, branch } = c.req.param();
  const formData = await c.req.formData();
  const files = formData.getAll("files").map((entry) => JSON.parse(entry.toString()) as FileUpdate);

  const fileAdditions = files.map((file) => ({
    path: file.path,
    contents: file.content,
  }));

  const refResult = await fetchGitHubJson<BranchRefResponse>(
    token,
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`
  );

  const mutation = `
    mutation CreateCommit($input: CreateCommitOnBranchInput!) {
      createCommitOnBranch(input: $input) {
        commit {
          oid
          url
        }
      }
    }
  `;

  const graphqlResult = await fetchGitHubJson<unknown>(
    token,
    "https://api.github.com/graphql",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            branch: {
              repositoryNameWithOwner: `${owner}/${repo}`,
              branchName: branch,
            },
            message: {
              headline: "Updated via vial-keymap-c-editor",
            },
            fileChanges: {
              additions: fileAdditions,
            },
            expectedHeadOid: refResult.data.object.sha,
          },
        },
      }),
    }
  );

  return jsonResponse(graphqlResult.data, graphqlResult.response.status);
});

app.get("/github/avatar", async (c) => {
  const token = getTokenOrUnauthorized(c);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { data, response } = await fetchGitHubJson<{ avatar_url: string }>(
    token,
    "https://api.github.com/user"
  );

  if (!response.ok) {
    return jsonResponse({ error: "Failed to fetch avatar" }, response.status);
  }

  return c.json(data);
});

app.get("/github/logout", async (c) => {
  clearSessionCookie(c);
  return c.json({ message: "Logged out" });
});

export const onRequest: PagesFunction<Bindings> = (context) =>
  app.fetch(context.request, context.env, {
    waitUntil: context.waitUntil,
    passThroughOnException: context.passThroughOnException,
    props: {},
  } as ExecutionContextLike);
