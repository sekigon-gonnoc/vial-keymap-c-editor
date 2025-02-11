import { Button, Container, Stack, Select, MenuItem, FormControl, InputLabel, Typography } from "@mui/material";
import { useState, useEffect } from "react";

interface AvatarResponse {
    error?: string;
    avatar_url?: string;
}

interface Repository {
    id: number;
    name: string;
    full_name: string;
}

interface RepositoryFile {
    name: string;
    path: string;
    type: "file" | "dir";
}

interface RequiredFiles {
    vialJson?: RepositoryFile;
    keymapC?: RepositoryFile;
    configH?: RepositoryFile;
}

interface Branch {
    name: string;
    commit: {
        sha: string;
    };
}

interface TreeResponse {
    tree: {
        path: string;
        type: "blob" | "tree";
        mode: string;
        sha: string;
    }[];
}

export function GitHubApp() {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [repos, setRepos] = useState<Repository[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<string>('');
    const [requiredFiles, setRequiredFiles] = useState<RequiredFiles>({});
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('');

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

    useEffect(() => {
        if (avatarUrl) {
            fetch(`${import.meta.env.VITE_BACKEND_URL}/github/repos`, { credentials: 'include' })
                .then(res => res.json())
                .then((data: {repositories: Repository[]}) => {
                    setRepos(data.repositories);
                })
                .catch(error => console.error('Failed to fetch repositories:', error));
        }
    }, [avatarUrl]);

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

    const handleBranchChange = async (branch: string) => {
        setSelectedBranch(branch);
        try {
            const [owner, repo] = selectedRepo.split('/');
            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/github/repos/${owner}/${repo}/${branch}`,
                { credentials: 'include' }
            );
            const treeData: TreeResponse = await response.json();
            
            const foundFiles: RequiredFiles = {};
            treeData.tree.forEach(file => {
                if (file.type === 'blob') {
                    const fileName = file.path.split('/').pop() || '';
                    if (fileName === 'vial.json') foundFiles.vialJson = { name: fileName, path: file.path, type: 'file' };
                    if (fileName === 'keymap.c') foundFiles.keymapC = { name: fileName, path: file.path, type: 'file' };
                    if (fileName === 'config.h') foundFiles.configH = { name: fileName, path: file.path, type: 'file' };
                }
            });
            
            setRequiredFiles(foundFiles);
        } catch (error) {
            console.error('Failed to fetch repository files:', error);
        }
    };

    const handleLogout = () => {
        fetch(`${import.meta.env.VITE_BACKEND_URL}/github/logout`, { credentials: 'include' })
            .then(() => {
                setAvatarUrl(null);
            })
            .catch(error => console.error('Failed to logout:', error));
    };

    if (avatarUrl) {
        return (
            <Container>
                <Stack spacing={2}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <img src={avatarUrl} alt="GitHub avatar" style={{ width: 40, height: 40, borderRadius: '50%' }} />
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
                        <Button 
                            variant="outlined"
                            onClick={handleLogout}
                        >
                            Logout
                        </Button>
                    </Stack>
                    {selectedBranch && (
                        <Stack spacing={1}>
                            <Typography>Required files status:</Typography>
                            <Typography color={requiredFiles.vialJson ? 'success.main' : 'error.main'}>
                                vial.json: {requiredFiles.vialJson ? 'Found' : 'Not found'}
                            </Typography>
                            <Typography color={requiredFiles.keymapC ? 'success.main' : 'error.main'}>
                                keymap.c: {requiredFiles.keymapC ? 'Found' : 'Not found'}
                            </Typography>
                            <Typography color={requiredFiles.configH ? 'success.main' : 'error.main'}>
                                config.h: {requiredFiles.configH ? 'Found' : 'Not found'}
                            </Typography>
                        </Stack>
                    )}
                </Stack>
            </Container>
        );
    }

    return (
        <Button 
            variant="contained"
            onClick={() => window.location.href = `${import.meta.env.VITE_BACKEND_URL}/github`}
        >
            Login with GitHub
        </Button>
    );
}