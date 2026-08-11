export function timeAgo(iso) {
    if (!iso) return "";
    const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (sec < 60) return "just now";
    if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
    return `${Math.floor(sec / 3600)}h ago`;
}

const PROGRAMME_KEY = "openglimpse-programme";

// Shared "current programme" selection so pages (dashboard, directory) stay in sync.
export function getStoredProgrammeId() {
    try {
        return localStorage.getItem(PROGRAMME_KEY) || null;
    } catch {
        return null;
    }
}

export function setStoredProgrammeId(id) {
    try {
        if (id) localStorage.setItem(PROGRAMME_KEY, id);
        else localStorage.removeItem(PROGRAMME_KEY);
    } catch {
        // ignore
    }
}
