import { SlashCommandBuilder } from 'discord.js';

const create = () => {
	const command = new SlashCommandBuilder()
		.setName('ping')
		.setDescription('got latency?');

	return command.toJSON();
};

const invoke = (interaction) => {
	interaction.reply({
		content: 'Pong! ' + interaction.client.ws.ping + 'ms',
		ephemeral: true,
	});
};

export { create, invoke };