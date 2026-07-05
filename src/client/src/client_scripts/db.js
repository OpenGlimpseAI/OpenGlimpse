import Dexie from "dexie";
export const db = new Dexie("OpenGlimpseOffline")

db.version(1).stores({
    messages: "content, timestamp, senderId",
    syncQueue: "++id,endpoint,method"
})

