import { Button, Container, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import * as Hjson from "hjson";
import { RequiredFiles, TreeResponse } from "./types";

interface UnauthenticatedViewProps {
    onloaded: (vialJson: any, keyboardJson: any, keymapC: string, configH: string, rulesMk: string) => void;
    oncommit: () => string;
}

export function UnauthenticatedView({ onloaded, oncommit }: UnauthenticatedViewProps) {
    const [publicRepoUrl, setPublicRepoUrl] = useState<string>('');
    const [selectedRepo, setSelectedRepo] = useState<string>('');
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [requiredFiles, setRequiredFiles] = useState<RequiredFiles>({});

    // パブリックリポジトリからファイルを読み込む関数
    const loadPublicRepo = async () => {
        try {
            // URLからowner/repo/branchを抽出
            const match = publicRepoUrl.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/);
            if (!match) {
                alert('Invalid GitHub repository URL');
                return;
            }
            
            const [_, owner, repo, branch = 'main'] = match;
            
            // GitHub APIを直接使用してファイルツリーを取得
            const treeResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
            );
            const treeData: TreeResponse = await treeResponse.json();
            
            const foundFiles: RequiredFiles = {};
            treeData.tree.forEach(file => {
                const fileName = file.path.split('/').pop() || '';
                if (fileName === 'vial.json') foundFiles.vialJson = { name: fileName, path: file.path, type: 'file' };
                if (fileName === 'keyboard.json') foundFiles.keyboardJson = { name: fileName, path: file.path, type: 'file' };
                if (fileName === 'keymap.c') foundFiles.keymapC = { name: fileName, path: file.path, type: 'file' };
                if (fileName === 'config.h') foundFiles.configH = { name: fileName, path: file.path, type: 'file' };
                if (fileName === 'rules.mk') {
                    // keymaps/*/rules.mk のパターンにマッチするか確認
                    if (file.path.includes('/keymaps/')) {
                        foundFiles.rulesMk = { name: fileName, path: file.path, type: 'file' };
                    }
                }
            });
            
            setRequiredFiles(foundFiles);
            setSelectedRepo(`${owner}/${repo}`);
            setSelectedBranch(branch);

            if (foundFiles.vialJson && foundFiles.keyboardJson && foundFiles.keymapC && foundFiles.configH && foundFiles.rulesMk) {
                // Raw contentのURLを使用してファイルを取得
                const getRawContent = async (path: string) => {
                    const response = await fetch(
                        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
                    );
                    return await response.text();
                };

                const [vialJsonText, keyboardJsonText, keymapC, configH, rulesMk] = await Promise.all([
                    getRawContent(foundFiles.vialJson.path),
                    getRawContent(foundFiles.keyboardJson.path),
                    getRawContent(foundFiles.keymapC.path),
                    getRawContent(foundFiles.configH.path),
                    getRawContent(foundFiles.rulesMk.path)
                ]);

                const vialJson = Hjson.parse(vialJsonText);
                const keyboardJson = Hjson.parse(keyboardJsonText);
                
                onloaded(vialJson, keyboardJson, keymapC, configH, rulesMk);
            }
        } catch (error) {
            console.error('Failed to load public repository:', error);
            alert('Failed to load repository. Please check the URL and try again.');
        }
    };

    // キーマップをダウンロードする関数
    const handleDownload = () => {
        const content = oncommit();
        if (!content) {
            alert('Cannot download: keymap is not ready');
            return;
        }

        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'keymap.c';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    return (
        <Container>
            <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                    <Button 
                        variant="contained"
                        onClick={() => window.location.href = `${import.meta.env.VITE_BACKEND_URL}/github`}
                    >
                        Login with GitHub
                    </Button>
                    <Typography>or</Typography>
                </Stack>
                <Stack direction="row" spacing={2}>
                    <TextField
                        fullWidth
                        label="Public Repository URL"
                        placeholder="https://github.com/owner/repo"
                        value={publicRepoUrl}
                        onChange={(e) => setPublicRepoUrl(e.target.value)}
                    />
                    <Button
                        variant="contained"
                        onClick={loadPublicRepo}
                    >
                        Load
                    </Button>
                </Stack>
                {selectedRepo && selectedBranch && (
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
                {requiredFiles.vialJson && requiredFiles.keyboardJson && 
                 requiredFiles.keymapC && requiredFiles.configH && requiredFiles.rulesMk && (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleDownload}
                    >
                        Download keymap.c
                    </Button>
                )}
            </Stack>
        </Container>
    );
}
