import { SlashCommandBuilder } from 'discord.js';
import Database from 'better-sqlite3';
const db = new Database('server.db');

const create = () => {
	const command = new SlashCommandBuilder()
		.setName('heartbeat')
		.setDescription('Sends a message if the thread is about to disappear from inactivity within an hour')
		.setDMPermission(false)
		.addBooleanOption((option) => option
			.setName('ghost')
			.setDescription('Delete heartbeat message after 5 seconds (default: false)')
		);

	db.exec("CREATE TABLE IF NOT EXISTS heartbeat_enrolled ('threadID' text, 'ghostEnabled' integer, PRIMARY KEY('threadID'))");
	return command.toJSON();
}

const invoke = (interaction) => {
	if (!interaction.channel.isThread()) {
		interaction.reply({
			content: 'This command can only be used in threads!',
			ephemeral: true,
		});
		return;
	}
	
	let threadID = interaction.channelId;
	const enrolled = db.prepare('SELECT * FROM heartbeat_enrolled WHERE threadID = ?').get(threadID);
	const ghost = interaction.options.getBoolean('ghost') ?? false;

	if (enrolled) {
		db.prepare('DELETE FROM heartbeat_enrolled WHERE threadID = ?').run(threadID);
		interaction.reply({
			content: `<#${threadID}> unenrolled from Heartbeat! 💔`
		});

		console.log(`<#${threadID}> has been unenrolled from Heartbeat`);
	} else {
		db.prepare('INSERT INTO heartbeat_enrolled (threadID, ghostEnabled) VALUES (?, ?)').run(threadID, ghost ? 1 : 0);
		interaction.reply({
			content: `<#${threadID}> has been enrolled into Heartbeat with ghost mode set to ${ghost}! 💓`
		});

		console.log(`<#${threadID}> has been enrolled into Heartbeat with ghost mode set to ${ghost}`);
	}
}

export { create, invoke };