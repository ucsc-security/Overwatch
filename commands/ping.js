import { SlashCommandBuilder } from 'discord.js';

const create = () => {
	const command = new SlashCommandBuilder()
		.setName('ping')
		.setDescription('got time?');

	return command.toJSON();
};

const invoke = (interaction) => {
	interaction.reply({
		content: 'Pong!',
		ephemeral: true,
	});
};

export { create, invoke };