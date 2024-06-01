import { ActivityType, Events } from 'discord.js';
import { loadCommands, loadJobs } from '#util/botStartup.js';

const once = true;
const eventType = Events.ClientReady;

async function invoke(client) {
	await loadCommands(client);
	await loadJobs(client);

	client.user.setPresence({ activities: [{ name: `over Slug Security`, type: ActivityType.Watching }], status: 'online' });
	console.log(`\nLogged in as ${client.user.tag}!`);
}

export { once, eventType, invoke };
