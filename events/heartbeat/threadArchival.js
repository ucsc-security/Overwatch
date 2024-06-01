import { Events } from 'discord.js';
import Database from 'better-sqlite3';

const once = false;
const eventType = Events.ThreadUpdate;

const db = new Database('databases/server.db');

async function invoke(_client, _oldThread, newThread) {
	if (!newThread.archived) return;

	const enrolled = db.prepare('SELECT * FROM heartbeat_enrolled WHERE threadID = ?').get(newThread.id);
	if (!enrolled) return;

	db.prepare('DELETE FROM heartbeat_enrolled WHERE threadID = ?').run(newThread.id);
	console.log(`Heartbeat: Unenrolled thread ${newThread.name} <#${newThread.id}> due to archival`);
}

export { once, eventType, invoke };
