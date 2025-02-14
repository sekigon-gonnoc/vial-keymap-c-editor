import { useState, useEffect } from "react";
import { AuthenticatedView } from "./AuthenticatedView";
import { UnauthenticatedView } from "./UnauthenticatedView";

interface GitHubAppProps {
    onloaded: (vialJson: any, keyboardJson: any, keymapC: string, configH: string, rulesMk: string) => void;
    onunloaded: () => void;
    oncommit: () => {[label: string]: string};
}

export function GitHubApp(props: GitHubAppProps) {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${import.meta.env.VITE_BACKEND_URL}/github/avatar`, { credentials: 'include' })
            .then(res => res.json())
            .then((data: {error?: string; avatar_url?: string}) => {
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

    const handleLogout = () => {
        props.onunloaded();
        fetch(`${import.meta.env.VITE_BACKEND_URL}/github/logout`, { credentials: 'include' })
            .then(() => {
                setAvatarUrl(null);
            })
            .catch(error => console.error('Failed to logout:', error));
    };

    return avatarUrl ? (
        <AuthenticatedView
            avatarUrl={avatarUrl}
            onloaded={props.onloaded}
            onunloaded={props.onunloaded}
            oncommit={props.oncommit}
            onLogout={handleLogout}
        />
    ) : (
        <UnauthenticatedView
            onloaded={props.onloaded}
            oncommit={props.oncommit}
        />
    );
}