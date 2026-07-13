import Dexie from 'dexie';

const db = new Dexie('OpenGlimpseDB');

db.version(1).stores({
    messages: '++id, content, timestamp, senderId',
});

export { db };
