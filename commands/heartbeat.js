import { SlashCommandBuilder } from 'discord.js';
import Database from 'better-sqlite3';

const db = new Database('databases/server.db');
db.exec(`
	CREATE TABLE IF NOT EXISTS heartbeat_enrolled (
		'threadID' TEXT,
		'ghostEnabled' INTEGER,
		'lastHeartbeat' INTEGER DEFAULT 0,  -- Add this line for the new column
		PRIMARY KEY('threadID')
	)
`);

const create = () => {
	const command = new SlashCommandBuilder()
		.setName('heartbeat')
		.setDescription('Sends a message if the thread is about to disappear from inactivity within an hour')
		.setDMPermission(false)
		.addBooleanOption((option) => option
			.setName('ghost')
			.setDescription('Delete heartbeat message after 5 seconds (default: false)')
		);

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

	const threadID = interaction.channelId;
	const enrolled = db.prepare('SELECT * FROM heartbeat_enrolled WHERE threadID = ?').get(threadID);
	const ghost = interaction.options.getBoolean('ghost') ?? false;

	if (enrolled) {
		db.prepare('DELETE FROM heartbeat_enrolled WHERE threadID = ?').run(threadID);
		interaction.reply({
			content: `<#${threadID}> unenrolled from Heartbeat! 💔`
		});

		console.log(`Heartbeat: <#${threadID}> has been unenrolled from Heartbeat`);
	} else {
		db.prepare('INSERT INTO heartbeat_enrolled (threadID, ghostEnabled, lastHeartbeat) VALUES (?, ?, ?)').run(threadID, ghost ? 1 : 0, Date.now());
		interaction.reply({
			content: `<#${threadID}> has been enrolled into Heartbeat ${ghost ? 'with ghost mode enabled' : ''}! 💓`
		});

		console.log(`Heartbeat: <#${threadID}> has been enrolled into Heartbeat ${ghost ? 'with ghost mode enabled' : ''}`);
	}
}

export { create, invoke };
