import fs from 'fs';
import { ActivityType } from 'discord.js';
import {} from 'dotenv/config';

const once = true;
const name = 'ready';

async function invoke(client) {
	console.log('\nFetching commands...');
	const commands = fs
		.readdirSync('./commands')
		.filter((file) => file.endsWith('.js'))
		.map((file) => file.slice(0, -3));

	const commandsArray = [];

	for (let command of commands) {
		const commandFile = await import(`#commands/${command}`);
		const cmd = commandFile.create();
		cmd.name = (process.env.DEV == 'true') ? `dev-${cmd.name}` : cmd.name;
		commandsArray.push(cmd);
	}
	client.application.commands.set(commandsArray);
	
	console.log(`Loaded ${commandsArray.length} commands!`);
	for (let command of commandsArray) {
		console.log(`"${command.name}", description: ${command.description}`);
	}

	// Jobs
	console.log('\nFetching jobs...');
	const jobs = fs
		.readdirSync('./jobs')
		.filter((file) => file.endsWith('.js'))
		.map((file) => file.slice(0, -3));

	// Info
	console.log(`Loaded ${jobs.length} jobs!`);
	for (let job of jobs) {
		console.log(`"${job}"`);
	}

	// Execute the jobs
	for (let job of jobs) {
		const jobFile = await import(`#jobs/${job}`);
		console.log(`Executing job ${job}`);
		jobFile.default(client);
	}

	client.user.setPresence({ activities: [{ name: `over Slug Security`, type: ActivityType.Watching }], status: 'online' });
	console.log(`\nSuccessfully logged in as ${client.user.tag}!`);

}

export { once, name, invoke };
