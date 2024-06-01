import { Events } from 'discord.js';
import Database from 'better-sqlite3';

const once = false;
const eventType = Events.ThreadDelete;

const db = new Database('databases/server.db');

async function invoke(_client, thread) {
	const enrolled = db.prepare('SELECT * FROM heartbeat_enrolled WHERE threadID = ?').get(thread.id);
	if (!enrolled) return;

	db.prepare('DELETE FROM heartbeat_enrolled WHERE threadID = ?').run(thread.id);
	console.log(`Heartbeat: Unenrolled thread ${thread.name} <#${thread.id}> due to deletion`);
}

export { once, eventType, invoke };
