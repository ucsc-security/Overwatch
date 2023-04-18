import { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';

const create = () => {
	const command = new SlashCommandBuilder()
		.setName('archive')
		.setDescription('Archives and locks channel')
		.addStringOption((option) =>
			option.setName('article').setDescription('Link to article')
		)
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

	return command.toJSON();
};

const invoke = (interaction) => {
	const articleLink = interaction.options.getString('article');

	const embed = new EmbedBuilder()
		.setTitle('Channel Archived!')
		.setDescription('This channel has been archived and locked as the event has concluded. You can still read previous messages, but you cannot post new ones. If you have any questions, please contact an officer.')
		.setColor('#fdc700')

	const row = new ActionRowBuilder()
		// Add Site Button
		.addComponents(
			new ButtonBuilder()
				.setLabel('Visit Our Site')
				.setURL('https://slugsec.ucsc.edu')
				.setStyle(ButtonStyle.Link)
		)
		// Add FAQ Button
		.addComponents(
			new ButtonBuilder()
				.setLabel('FAQs')
				.setURL('https://slugsec.ucsc.edu/faqs')
				.setStyle(ButtonStyle.Link)
		);
	if (articleLink !== null) 
		// Add Article Button, style of secondary
		row.addComponents(
			new ButtonBuilder()
				.setLabel('Related Article')
				.setURL(articleLink ?? 'https://slugsec.ucsc.edu')
				.setStyle(ButtonStyle.Link)
		)

	interaction.channel.send({
		embeds: [embed],
		components: [row],
	});

	if (!interaction.channel.parent) {
		interaction.reply({ 
			content: 'This channel has no parent category!', 
			ephemeral: true 
		});
		return;
	}
	
	interaction.reply({
		content: 'Channel archived!',
		ephemeral: true,
	});

	console.log(`Archive: User ${interaction.user.username} archived channel ${interaction.channel.name} in ${interaction.channel.parent.name}`);
	//interaction.channel.lockPermissions();
};

export { create, invoke };
