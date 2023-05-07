import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

const create = () => {
	const command = new SlashCommandBuilder()
		.setName('purge')
		.setDescription('Purges messages from channel')
		.addIntegerOption((option) => option
			.setName('amount')
			.setDescription('Amount of messages to purge')
			.setRequired(true)
			.setMinValue(1)
			.setMaxValue(100)
		)
		.addBooleanOption((option) => option
			.setName('bots-only')
			.setDescription('Only purge messages from bots (default: false)')
			.setRequired(false)
		)
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

	return command.toJSON();
};

const invoke = async (interaction) => {
	const amount = interaction.options.getInteger('amount');
	const botsOnly = interaction.options.getBoolean('bots-only') ?? false;

	const messages = await interaction.channel.messages.fetch({ limit: amount + 1 });
	const messagesToDelete = botsOnly ? messages.filter((m) => m.author.bot) : messages;
	const deletedMessages = await interaction.channel.bulkDelete(messagesToDelete, true);

	// Group messages by user
	const messageCountByUser = new Map();
	deletedMessages.forEach((message) => {
		const currentCount = messageCountByUser.get(message.author.tag) || 0;
		messageCountByUser.set(message.author.tag, currentCount + 1);
	});

	// Construct response
	const userMessageCounts = Array.from(messageCountByUser.entries())
		.map(([user, count]) => `**${user}**: ${count}`)
		.join('\n');

	const removedMessagesCount = deletedMessages.size - 1;
	const replyContent = removedMessagesCount > 0
						? `*${removedMessagesCount} messages were removed.*\n\n${userMessageCounts}`
						: `*No messages were removed.*`;

	const reply = await interaction.reply({
		content: replyContent,
		fetchReply: true,
	});

	console.log(`Purge: User ${interaction.user.username} purged ${removedMessagesCount} messages in<#${interaction.channel.name}`);
	setTimeout(async () => {
		await reply.delete();
	}, 5000);
};

export { create, invoke };
