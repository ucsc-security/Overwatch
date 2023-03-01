const once = false;
const name = 'threadUpdate';

import Database from 'better-sqlite3';
const db = new Database('heartbeat.db');

async function invoke(_oldThread, newThread) {
	if (newThread.archived) {
		const enrolled = db.prepare('SELECT * FROM enrolled WHERE threadID = ?').get(newThread.id);
		if (enrolled) {
			console.log(`Sending heartbeat to thread ${newThread.name}`);
			await newThread.send('Heartbeat!');
		}
	}
}

export { once, name, invoke };