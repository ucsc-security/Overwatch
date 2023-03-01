const once = false;
const name = 'threadDelete';

import Database from 'better-sqlite3';
const db = new Database('heartbeat.db');

async function invoke(thread) {
	const enrolled = db.prepare('SELECT * FROM enrolled WHERE threadID = ?').get(thread.id);
	if (enrolled) {
		db.prepare('DELETE FROM enrolled WHERE threadID = ?').run(thread.id);
		console.log(`Unenrolled thread ${thread.name} due to deletion`);
	}
}

export { once, name, invoke };