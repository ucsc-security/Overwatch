import fs from 'fs';

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
		commandsArray.push(commandFile.create());
	}

	client.application.commands.set(commandsArray);
	console.log('Commands fetched and loaded!')

	client.user.setActivity('Got root?', { type: 'WATCHING' });	
	console.log(`Successfully logged in as ${client.user.tag}!`);

	console.log(`Loaded ${commands.length} commands!`)
	for (let command of commands) {
		console.log(`"${command}", description: ${commandsArray[commands.indexOf(command)].description}`);
	} 
}

export { once, name, invoke };