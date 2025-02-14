import { Typography } from "@mui/material";
import { RepositoryFile } from "./types";

interface FileStatusItemProps {
  label: string;
  file?: RepositoryFile;
  repo: string;
  branch: string;
}

export function FileStatusItem({ label, file, repo, branch }: FileStatusItemProps) {
  return (
    <Typography color={file ? "success.main" : "error.main"}>
      {label}:{" "}
      {file ? (
        <a
          href={`https://github.com/${repo}/blob/${branch}/${file.path}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "inherit" }}
        >
          {file.path}
        </a>
      ) : (
        "Not found"
      )}
    </Typography>
  );
}
