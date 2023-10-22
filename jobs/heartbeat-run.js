import Database from 'better-sqlite3'
import cron from 'node-cron';
import { MessageFlags } from 'discord.js';

const db = new Database('databases/server.db');
const HEARTBEAT_MSG = {
	content: 'Heartbeat 💓',
	flags: MessageFlags.SuppressNotifications
};

async function sendHeartbeat(thread, ghost) {
	const msg = await thread.send(HEARTBEAT_MSG);

	console.log(`Heartbeat: Sent heartbeat to <#${thread.id}> ${ghost ? 'with ghost mode enabled' : ''}`);

	// delete heartbeat message after 5 seconds if ghost heartbeat
	if (ghost)
		setTimeout(() => msg.delete(), 5000);
}

async function pacemaker(client) {
	const enrolledThreads = db.prepare('SELECT * FROM heartbeat_enrolled').all();

	for (const row of enrolledThreads) {
		const threadID = row.threadID;
		const ghost = row.ghostEnabled === 1;
		const thread = await client.channels.fetch(threadID);

		if (!thread) {
			console.log(`Heartbeat: Failed to fetch thread <#${threadID}>`);
			continue;
		}

		const archiveDuration = thread.autoArchiveDuration * 60 * 1000; // Convert to milliseconds
		const lastMessage = (await thread.messages.fetch({ limit: 1 })).first();

		const lastMessageTimestamp = lastMessage.createdTimestamp;
		const timeTillArchive = archiveDuration - (Date.now() - lastMessageTimestamp);

		console.log(`Heartbeat: #${thread.name}: ${(timeTillArchive/1000/60).toFixed(2)} minutes till archive`);

		if (timeTillArchive < 3600000) // Less than 1 hour
			await sendHeartbeat(thread, ghost);
	}
}


export default (client) => {
	console.log('Heartbeat: Running pacemaker...')
	// Run the job immediately on startup
	pacemaker(client);
	// Schedule the job to run once every hour
	cron.schedule('0 * * * *', async () => {
		console.log('Heartbeat: Running hourly pacemaker...');
		pacemaker(client);
	});
}