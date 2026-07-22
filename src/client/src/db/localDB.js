import Dexie from 'dexie';

export const db = new Dexie('OpenGlimpseDB');

db.version(1).stores({
  requestCache:   'path',
  pendingChanges: 'id'
});
