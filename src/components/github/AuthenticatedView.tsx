import {
  Button,
  Container,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Modal,
  Box,
  CircularProgress,
} from "@mui/material";
import { useState, useEffect } from "react";
import * as Hjson from "hjson";
import { RequiredFiles, Repository, Branch, TreeResponse } from "./types";
import { FileStatusItem } from "./FileStatusItem";

interface AuthenticatedViewProps {
  avatarUrl: string;
  onloaded: (
    vialJson: any,
    keyboardJson: any,
    keymapC: string,
    configH: string,
    rulesMk: string
  ) => void;
  onunloaded: () => void;
  oncommit: () => string;
  onLogout: () => void;
}

export function AuthenticatedView({
  avatarUrl,
  onloaded,
  onunloaded,
  oncommit,
  onLogout,
}: AuthenticatedViewProps) {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [requiredFiles, setRequiredFiles] = useState<RequiredFiles>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [isCommitting, setIsCommitting] = useState(false);

  // JSONファイルの内容を取得する関数
  const loadJsonFile = async (
    owner: string,
    repo: string,
    branch: string,
    path: string
  ) => {
    try {
      // パスのスラッシュを明示的にエンコード
      const encodedPath = path
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("%2F");
      const response = await fetch(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/github/repos/${owner}/${repo}/${branch}/${encodedPath}`,
        { credentials: "include" }
      );
      const jsonData = await response.json();
      const decodedContent = atob(jsonData.content);
      return Hjson.parse(decodedContent);
    } catch (error) {
      console.error(`Failed to fetch ${path}:`, error);
      return null;
    }
  };

  // テキストファイルの内容を取得する関数
  const loadTextFile = async (
    owner: string,
    repo: string,
    branch: string,
    path: string
  ) => {
    try {
      const encodedPath = path
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("%2F");
      const response = await fetch(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/github/repos/${owner}/${repo}/${branch}/${encodedPath}`,
        { credentials: "include" }
      );
      const data = await response.json();
      return atob(data.content);
    } catch (error) {
      console.error(`Failed to fetch ${path}:`, error);
      return null;
    }
  };

  useEffect(() => {
    fetch(`${import.meta.env.VITE_BACKEND_URL}/github/repos`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data: { repositories: Repository[] }) => {
        if (data.repositories.length === 0) {
          window.location.href = `https://github.com/apps/vial-keymap-c-editor/installations/new`;
          return;
        }
        setRepos(data.repositories);
      })
      .catch((error) => console.error("Failed to fetch repositories:", error));
  }, []);

  // リポジトリ選択時の処理
  const handleRepoChange = async (repoFullName: string) => {
    onunloaded(); // 今のリポジトリの情報をクリア
    setSelectedRepo(repoFullName);
    setSelectedBranch("");
    setRequiredFiles({});

    try {
      const [owner, repo] = repoFullName.split("/");
      const response = await fetch(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/github/repos/${owner}/${repo}/branches`,
        { credentials: "include" }
      );
      const branchList: Branch[] = await response.json();
      setBranches(branchList);
    } catch (error) {
      console.error("Failed to fetch branches:", error);
    }
  };

  // ブランチ選択時の処理
  const handleBranchChange = async (branch: string) => {
    setSelectedBranch(branch);
    try {
      const [owner, repo] = selectedRepo.split("/");
      const response = await fetch(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/github/repos/${owner}/${repo}/${branch}`,
        { credentials: "include" }
      );
      const treeData: TreeResponse = await response.json();

      const foundFiles: RequiredFiles = {};
      treeData.tree.forEach((file) => {
        if (file.type === "blob") {
          const fileName = file.path.split("/").pop() || "";
          if (fileName === "vial.json")
            foundFiles.vialJson = {
              name: fileName,
              path: file.path,
              type: "file",
            };
          if (fileName === "keyboard.json")
            foundFiles.keyboardJson = {
              name: fileName,
              path: file.path,
              type: "file",
            };
          if (fileName === "keymap.c")
            foundFiles.keymapC = {
              name: fileName,
              path: file.path,
              type: "file",
            };
          if (fileName === "config.h")
            foundFiles.configH = {
              name: fileName,
              path: file.path,
              type: "file",
            };
          if (fileName === "rules.mk") {
            if (file.path.includes("/keymaps/")) {
              foundFiles.rulesMk = {
                name: fileName,
                path: file.path,
                type: "file",
              };
            }
          }
        }
      });

      setRequiredFiles(foundFiles);

      if (
        foundFiles.vialJson &&
        foundFiles.keyboardJson &&
        foundFiles.keymapC &&
        foundFiles.configH &&
        foundFiles.rulesMk
      ) {
        const [vialJson, keyboardJson, keymapC, configH, rulesMk] =
          await Promise.all([
            loadJsonFile(owner, repo, branch, foundFiles.vialJson.path),
            loadJsonFile(owner, repo, branch, foundFiles.keyboardJson.path),
            loadTextFile(owner, repo, branch, foundFiles.keymapC.path),
            loadTextFile(owner, repo, branch, foundFiles.configH.path),
            loadTextFile(owner, repo, branch, foundFiles.rulesMk.path),
          ]);

        if (vialJson && keyboardJson && keymapC && configH && rulesMk) {
          onloaded(vialJson, keyboardJson, keymapC, configH, rulesMk);
        }
      }
    } catch (error) {
      console.error("Failed to fetch repository files:", error);
    }
  };

  // コミット処理
  const handleCommit = async () => {
    const content = oncommit();
    if (
      !content ||
      !selectedRepo ||
      !selectedBranch ||
      !requiredFiles.keymapC
    ) {
      alert("Cannot commit: Repository, branch or keymap is not ready");
      return;
    }

    setIsCommitting(true);
    try {
      const [owner, repo] = selectedRepo.split("/");
      const encodedPath = requiredFiles.keymapC.path
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("%2F");

      const response = await fetch(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/github/repos/${owner}/${repo}/${selectedBranch}/${encodedPath}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: content,
            message: "Update keymap.c via Vial Keymap Editor",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to commit changes");
      }

      alert("Keymap updated successfully!");
    } catch (error) {
      console.error("Failed to commit changes:", error);
      alert("Failed to update keymap. Please try again.");
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <Container>
      <Modal
        open={isCommitting}
        aria-labelledby="commit-modal-title"
        aria-describedby="commit-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <CircularProgress />
          <Typography id="commit-modal-title" variant="h6">
            Committing changes...
          </Typography>
          <Typography id="commit-modal-description">
            Please wait while your changes are being saved to GitHub.
          </Typography>
        </Box>
      </Modal>

      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          <img
            src={avatarUrl}
            alt="GitHub avatar"
            style={{ width: 40, height: 40, borderRadius: "50%" }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Repository</InputLabel>
            <Select
              value={selectedRepo}
              label="Repository"
              onChange={(e) => handleRepoChange(e.target.value)}
            >
              {repos.map((repo) => (
                <MenuItem key={repo.id} value={repo.full_name}>
                  {repo.full_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedRepo && (
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Branch</InputLabel>
              <Select
                value={selectedBranch}
                label="Branch"
                onChange={(e) => handleBranchChange(e.target.value)}
              >
                {branches.map((branch) => (
                  <MenuItem key={branch.commit.sha} value={branch.name}>
                    {branch.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="primary"
              onClick={() =>
                window.open(`https://github.com/${selectedRepo}`, "_blank")
              }
              disabled={!selectedRepo}
            >
              Open Repository
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={() =>
                (window.location.href =
                  "https://github.com/apps/vial-keymap-c-editor/installations/new")
              }
            >
              Add Repository
            </Button>
            <Button variant="outlined" color="error" onClick={onLogout} >
              Logout
            </Button>
          </Stack>
        </Stack>
        {selectedBranch && (
          <Stack spacing={1}>
            <Typography>Required files status:</Typography>
            {[
              { label: "vial.json", key: "vialJson" },
              { label: "keyboard.json", key: "keyboardJson" },
              { label: "keymap.c", key: "keymapC" },
              { label: "config.h", key: "configH" },
              { label: "rules.mk", key: "rulesMk" },
            ].map(({ label, key }) => (
              <FileStatusItem
                key={key}
                label={label}
                file={requiredFiles[key as keyof RequiredFiles]}
                repo={selectedRepo}
                branch={selectedBranch}
              />
            ))}
          </Stack>
        )}
        {requiredFiles.vialJson &&
          requiredFiles.keyboardJson &&
          requiredFiles.keymapC &&
          requiredFiles.configH &&
          requiredFiles.rulesMk && (
            <Button variant="contained" color="primary" onClick={handleCommit}>
              Commit Changes
            </Button>
          )}
      </Stack>
    </Container>
  );
}
