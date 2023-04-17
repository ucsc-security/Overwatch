const once = false;
const name = 'threadDelete';

import Database from 'better-sqlite3';
const db = new Database('server.db');

async function invoke(thread) {
	const enrolled = db.prepare('SELECT * FROM heartbeat_enrolled WHERE threadID = ?').get(thread.id);
	if (enrolled) {
		db.prepare('DELETE FROM heartbeat_enrolled WHERE threadID = ?').run(thread.id);
		console.log(`Heartbeat: Unenrolled thread ${thread.name} <#${thread.id}> due to deletion`);
	}
}

export { once, name, invoke };