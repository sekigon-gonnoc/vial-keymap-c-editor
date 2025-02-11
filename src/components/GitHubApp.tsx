import { Button, Container, Stack, Select, MenuItem, FormControl, InputLabel, Typography, Modal, Box, CircularProgress } from "@mui/material";
import { useState, useEffect } from "react";
import * as Hjson from "hjson";

// GitHub APIのレスポンス型定義
interface AvatarResponse {
    error?: string;
    avatar_url?: string;
}

// GitHubのリポジトリ情報の型定義
interface Repository {
    id: number;
    name: string;
    full_name: string;
}

// リポジトリ内のファイル情報の型定義
interface RepositoryFile {
    name: string;
    path: string;
    type: "file" | "dir";
}

// キーボード設定に必要なファイルの型定義
interface RequiredFiles {
    vialJson?: RepositoryFile;
    keyboardJson?: RepositoryFile;
    keymapC?: RepositoryFile;
    configH?: RepositoryFile;
}

// GitHubのブランチ情報の型定義
interface Branch {
    name: string;
    commit: {
        sha: string;
    };
}

// GitHubのファイルツリーAPIレスポンスの型定義
interface TreeResponse {
    tree: {
        path: string;
        type: "blob" | "tree";
        mode: string;
        sha: string;
    }[];
}

interface GitHubAppProps {
    onloaded: (vialJson: any, keyboardJson: any, keymapC: string, configH: string) => void;
    oncommit: () => string;
}

export function GitHubApp(props: GitHubAppProps) {
    // GitHub認証済みユーザーのアバターURL
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    // ユーザーのリポジトリ一覧
    const [repos, setRepos] = useState<Repository[]>([]);
    // 選択中のリポジトリ名 (owner/repo形式)
    const [selectedRepo, setSelectedRepo] = useState<string>('');
    // 見つかった必要なファイル群
    const [requiredFiles, setRequiredFiles] = useState<RequiredFiles>({});
    // リポジトリのブランチ一覧
    const [branches, setBranches] = useState<Branch[]>([]);
    // 選択中のブランチ名
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    // コミット中フラグ
    const [isCommitting, setIsCommitting] = useState(false);

    // JSONファイルの内容を取得する関数
    const loadJsonFile = async (owner: string, repo: string, branch: string, path: string) => {
        try {
            // パスのスラッシュを明示的にエンコード
            const encodedPath = path.split('/').map(segment => encodeURIComponent(segment)).join('%2F');
            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/github/repos/${owner}/${repo}/${branch}/${encodedPath}`,
                { credentials: 'include' }
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
    const loadTextFile = async (owner: string, repo: string, branch: string, path: string) => {
        try {
            const encodedPath = path.split('/').map(segment => encodeURIComponent(segment)).join('%2F');
            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/github/repos/${owner}/${repo}/${branch}/${encodedPath}`,
                { credentials: 'include' }
            );
            const data = await response.json();
            return atob(data.content);
        } catch (error) {
            console.error(`Failed to fetch ${path}:`, error);
            return null;
        }
    };

    // マウント時にアバター画像を取得
    useEffect(() => {
        fetch(`${import.meta.env.VITE_BACKEND_URL}/github/avatar`, { credentials: 'include' })
            .then(res => res.json())
            .then((data: AvatarResponse) => {
                if (data.error) {
                    console.error(data.error);
                    return;
                }
                if (data.avatar_url) {
                    setAvatarUrl(data.avatar_url);
                }
            })
            .catch(error => console.error('Failed to fetch avatar:', error));
    }, []);

    // アバター取得成功時にリポジトリ一覧を取得
    useEffect(() => {
        if (avatarUrl) {
            fetch(`${import.meta.env.VITE_BACKEND_URL}/github/repos`, { credentials: 'include' })
                .then(res => res.json())
                .then((data: {repositories: Repository[]}) => {
                    if (data.repositories.length === 0) {
                        // リポジトリが0件の場合はGitHub Appsのインストールページへリダイレクト
                        window.location.href = `https://github.com/apps/vial-keymap-c-editor/installations/new`;
                        return;
                    }
                    setRepos(data.repositories);
                })
                .catch(error => console.error('Failed to fetch repositories:', error));
        }
    }, [avatarUrl]);

    // リポジトリ選択時の処理
    // 選択されたリポジトリのブランチ一覧を取得
    const handleRepoChange = async (repoFullName: string) => {
        setSelectedRepo(repoFullName);
        setSelectedBranch('');
        setRequiredFiles({});
        
        try {
            const [owner, repo] = repoFullName.split('/');
            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/github/repos/${owner}/${repo}/branches`,
                { credentials: 'include' }
            );
            const branchList: Branch[] = await response.json();
            setBranches(branchList);
        } catch (error) {
            console.error('Failed to fetch branches:', error);
        }
    };

    // ブランチ選択時の処理
    // 選択されたブランチ内のファイルツリーを取得し、必要なファイルを探す
    const handleBranchChange = async (branch: string) => {
        setSelectedBranch(branch);
        try {
            const [owner, repo] = selectedRepo.split('/');
            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/github/repos/${owner}/${repo}/${branch}`,
                { credentials: 'include' }
            );
            const treeData: TreeResponse = await response.json();

            console.log(treeData);
            
            const foundFiles: RequiredFiles = {};
            treeData.tree.forEach(file => {
                if (file.type === 'blob') {
                    const fileName = file.path.split('/').pop() || '';
                    if (fileName === 'vial.json') foundFiles.vialJson = { name: fileName, path: file.path, type: 'file' };
                    if (fileName === 'keyboard.json') foundFiles.keyboardJson = { name: fileName, path: file.path, type: 'file' };
                    if (fileName === 'keymap.c') foundFiles.keymapC = { name: fileName, path: file.path, type: 'file' };
                    if (fileName === 'config.h') foundFiles.configH = { name: fileName, path: file.path, type: 'file' };
                }
            });
            
            setRequiredFiles(foundFiles);

            if (foundFiles.vialJson && foundFiles.keyboardJson && foundFiles.keymapC && foundFiles.configH) {
                const [vialJson, keyboardJson, keymapC, configH] = await Promise.all([
                    loadJsonFile(owner, repo, branch, foundFiles.vialJson.path),
                    loadJsonFile(owner, repo, branch, foundFiles.keyboardJson.path),
                    loadTextFile(owner, repo, branch, foundFiles.keymapC.path),
                    loadTextFile(owner, repo, branch, foundFiles.configH.path)
                ]);
                
                if (vialJson && keyboardJson && keymapC && configH) {
                    props.onloaded(vialJson, keyboardJson, keymapC, configH);
                }
            }
        } catch (error) {
            console.error('Failed to fetch repository files:', error);
        }
    };

    // ログアウト処理
    // セッションを削除しアバターURLをクリア
    const handleLogout = () => {
        fetch(`${import.meta.env.VITE_BACKEND_URL}/github/logout`, { credentials: 'include' })
            .then(() => {
                setAvatarUrl(null);
            })
            .catch(error => console.error('Failed to logout:', error));
    };

    // コミット処理
    const handleCommit = async () => {    
        const content = props.oncommit();
        if (!content || !selectedRepo || !selectedBranch || !requiredFiles.keymapC) {
            alert('Cannot commit: Repository, branch or keymap is not ready');
            return;
        }

        setIsCommitting(true);
        try {
            const [owner, repo] = selectedRepo.split('/');
            const encodedPath = requiredFiles.keymapC.path.split('/').map(segment => encodeURIComponent(segment)).join('%2F');
            
            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/github/repos/${owner}/${repo}/${selectedBranch}/${encodedPath}`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        content: content,
                        message: 'Update keymap.c via Vial Keymap Editor'
                    })
                }
            );

            if (!response.ok) {
                throw new Error('Failed to commit changes');
            }

            alert('Keymap updated successfully!');
        } catch (error) {
            console.error('Failed to commit changes:', error);
            alert('Failed to update keymap. Please try again.');
        } finally {
            setIsCommitting(false);
        }
    };

    // ログイン済みの場合のUI
    if (avatarUrl) {
        return (
          <Container>
            {/* Loading Modal */}
            <Modal
              open={isCommitting}
              aria-labelledby="commit-modal-title"
              aria-describedby="commit-modal-description"
            >
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                bgcolor: 'background.paper',
                boxShadow: 24,
                p: 4,
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
              }}>
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
              {/* ヘッダー部分: アバター、リポジトリ選択、ブランチ選択、ログアウトボタン */}
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
                      window.open(`https://github.com/${selectedRepo}`, '_blank')
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
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </Stack>
              </Stack>
              {/* ブランチ選択後に必要なファイルの有無を表示 */}
              {selectedBranch && (
                <Stack spacing={1}>
                  <Typography>Required files status:</Typography>
                  <Typography
                    color={
                      requiredFiles.vialJson ? "success.main" : "error.main"
                    }
                  >
                    vial.json:{" "}
                    {requiredFiles.vialJson ? (
                      <a
                        href={`https://github.com/${selectedRepo}/blob/${selectedBranch}/${requiredFiles.vialJson.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'inherit' }}
                      >
                        {requiredFiles.vialJson.path}
                      </a>
                    ) : (
                      "Not found"
                    )}
                  </Typography>
                  <Typography
                    color={
                      requiredFiles.keyboardJson ? "success.main" : "error.main"
                    }
                  >
                    keyboard.json:{" "}
                    {requiredFiles.keyboardJson ? (
                      <a
                        href={`https://github.com/${selectedRepo}/blob/${selectedBranch}/${requiredFiles.keyboardJson.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'inherit' }}
                      >
                        {requiredFiles.keyboardJson.path}
                      </a>
                    ) : (
                      "Not found"
                    )}
                  </Typography>
                  <Typography
                    color={
                      requiredFiles.keymapC ? "success.main" : "error.main"
                    }
                  >
                    keymap.c:{" "}
                    {requiredFiles.keymapC ? (
                      <a
                        href={`https://github.com/${selectedRepo}/blob/${selectedBranch}/${requiredFiles.keymapC.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'inherit' }}
                      >
                        {requiredFiles.keymapC.path}
                      </a>
                    ) : (
                      "Not found"
                    )}
                  </Typography>
                  <Typography
                    color={
                      requiredFiles.configH ? "success.main" : "error.main"
                    }
                  >
                    config.h:{" "}
                    {requiredFiles.configH ? (
                      <a
                        href={`https://github.com/${selectedRepo}/blob/${selectedBranch}/${requiredFiles.configH.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'inherit' }}
                      >
                        {requiredFiles.configH.path}
                      </a>
                    ) : (
                      "Not found"
                    )}
                  </Typography>
                </Stack>
              )}
              {/* コミットボタン */}
              {requiredFiles.vialJson && requiredFiles.keyboardJson && 
               requiredFiles.keymapC && requiredFiles.configH && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCommit}
                >
                  Commit Changes
                </Button>
              )}
            </Stack>
          </Container>
        );
    }

    // 未ログイン時のUI
    return (
        <Button 
            variant="contained"
            onClick={() => window.location.href = `${import.meta.env.VITE_BACKEND_URL}/github`}
        >
            Login with GitHub
        </Button>
    );
}