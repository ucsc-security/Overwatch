import { ActivityType, Events } from 'discord.js';
import { loadCommands, loadJobs } from '#util/botStartup.js';

const once = true;
const eventType = Events.ClientReady;

const ACTIVITIES = [
	'over Slug Security',
	'incoming connections',
	'outgoing connections',
	'network traffic',
	'/var/log/auth.log',
	'user logins',
	'firewall logs',
	'active connections',
	'error logs',
	'for configuration changes',
	'for threat reports',
	'system updates',
	'intrusion attempts',
	'malware signatures',
	'DNS queries',
	'honeypot activity',
	'SIEM alerts',
	'for port scans',
	'web server logs',
	'database logs',
	'for suspicious IPs',
	'for data exfiltration',
	'for security patches',
	'for privilege escalation'
];

async function updatePresence(client) {
	const setPresence = () => {
		const activity = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)]
		client.user.setPresence({
			activities: [{ name: activity, type: ActivityType.Watching }],
			status: 'online'
		});
	};

	setPresence();
	setInterval(setPresence, 30_000);
}

async function invoke(client) {
	await loadCommands(client);
	await loadJobs(client);

	await updatePresence(client);
	console.log(`\nLogged in as ${client.user.tag}!`);
}

export { once, eventType, invoke };
