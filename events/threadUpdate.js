const once = false;
const name = 'threadUpdate';

import Database from 'better-sqlite3';
const db = new Database('databases/server.db');

async function invoke(_oldThread, newThread) {
	if (newThread.archived) {
		const enrolled = db.prepare('SELECT * FROM heartbeat_enrolled WHERE threadID = ?').get(newThread.id);
		if (enrolled) {
			db.prepare('DELETE FROM heartbeat_enrolled WHERE threadID = ?').run(newThread.id);
			console.log(`Heartbeat: Unenrolled thread ${newThread.name} <#${newThread.id}> due to archival`);
		}
	}
}

export { once, name, invoke };
