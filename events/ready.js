import fs from 'fs';
import { ActivityType } from 'discord.js';
import {} from 'dotenv/config';

const once = true;
const name = 'ready';

async function invoke(client) {
	console.log('Fetching commands...');
	const commands = fs
		.readdirSync('./commands')
		.filter((file) => file.endsWith('.js'))
		.map((file) => file.slice(0, -3));

	const commandsArray = [];

	for (let command of commands) {
		const commandFile = await import(`#commands/${command}`);
		const cmd = commandFile.create();
		cmd.name = (process.env.dev == 'true') ? `dev-${cmd.name}` : cmd.name;
		commandsArray.push(cmd);
	}

	client.application.commands.set(commandsArray);
	console.log('Commands fetched and loaded!')

	client.user.setPresence({ activities: [{ name: `over Slug Security`, type: ActivityType.Watching }], status: 'online' }); 
	console.log(`Successfully logged in as ${client.user.tag}!`);

	console.log(`Loaded ${commands.length} commands!`)
	for (let command of commands) {
		console.log(`"${commandsArray[commands.indexOf(command)].name}", description: ${commandsArray[commands.indexOf(command)].description}`);
	} 
	
	// Jobs
	console.log('Fetching jobs...');
	const jobs = fs
		.readdirSync('./jobs')
		.filter((file) => file.endsWith('.js'))
		.map((file) => file.slice(0, -3));

	// Execute the jobs
	for (let job of jobs) {
		const jobFile = await import(`#jobs/${job}`);
		console.log(`Executing job ${job}`);
		jobFile.default(client);
	}
	console.log('Jobs fetched and executed!');
}

export { once, name, invoke };