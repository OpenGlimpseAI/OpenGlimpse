const STORAGE_KEY = 'openglimpse-programme';

export function getSavedProgrammeId() {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

export function saveProgrammeId(id) {
    try {
        if (id) localStorage.setItem(STORAGE_KEY, id);
        else localStorage.removeItem(STORAGE_KEY);
    } catch {}
}

export function resolveProgramme(list) {
    if (!list || !list.length) return null;
    const saved = getSavedProgrammeId();
    if (saved && list.some((p) => p.id === saved)) return saved;
    const first = list[0].id;
    saveProgrammeId(first);
    return first;
}
