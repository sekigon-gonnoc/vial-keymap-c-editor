export interface Repository {
    id: number;
    name: string;
    full_name: string;
}

export interface Branch {
    name: string;
    commit: {
        sha: string;
    };
}

export interface TreeResponse {
    tree: {
        path: string;
        type: "blob" | "tree";
        mode: string;
        sha: string;
    }[];
}

export interface RepositoryFile {
    name: string;
    path: string;
    type: "file" | "dir";
}

export interface RequiredFiles {
    vialJson?: RepositoryFile;
    keyboardJson?: RepositoryFile;
    keymapC?: RepositoryFile;
    configH?: RepositoryFile;
}
