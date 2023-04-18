console.log('Starting bot...');
import {} from 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import fs from "fs";

const client = new Client({ 
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers
	],
	partials: [
		Partials.Channel,
		Partials.Message,
		Partials.User,
		Partials.GuildMember
	],
});

// Events
console.log('Fetching events...');
const events = fs
	.readdirSync('./events')
	.filter((file) => file.endsWith('.js'));

// Check for an event and execute the corresponding file in ./events
for (let event of events) {
	const eventFile = await import(`#events/${event}`);
	// But first check if it's an event emitted once
	if (eventFile.once)
		client.once(eventFile.name, (...args) => {
			eventFile.invoke(...args);
		});
	else
		client.on(eventFile.name, (...args) => {
			eventFile.invoke(...args);
		});
}
console.log('Events fetched!');

console.log('Logging in...');
client.login(process.env.bot_token);
