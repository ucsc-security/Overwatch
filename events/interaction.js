import { Events } from 'discord.js';

const once = false;
const eventType = Events.InteractionCreate;

async function invoke(client, interaction) {
	if (!interaction.isChatInputCommand()) return;

	const commandModule = client.commands.get(interaction.commandName);
	await commandModule.invoke(interaction);
}

export { once, eventType, invoke };
