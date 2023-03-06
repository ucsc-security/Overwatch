import { SlashCommandBuilder } from 'discord.js';
import Database from 'better-sqlite3';
const db = new Database('heartbeat.db');

const create = () => {
	const command = new SlashCommandBuilder()
		.setName('heartbeat')
		.setDescription('Enroll thread to be kept alive, or remove enrollment')
		.setDMPermission(false);

	db.exec("CREATE TABLE IF NOT EXISTS enrolled('threadID' text);");
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
	const enrolled = db.prepare('SELECT * FROM enrolled WHERE threadID = ?').get(threadID);
	if (enrolled) {
		db.prepare('DELETE FROM enrolled WHERE threadID = ?').run(threadID);
		console.log(`Unenrolled thread ${threadID}`);
		interaction.reply({
			content: `${interaction.channel.name} unenrolled!`
		});
	} else {
		db.prepare('INSERT INTO enrolled VALUES (?)').run(threadID);
		console.log(`Enrolled thread ${threadID}`);
		interaction.reply({
			content: `${interaction.channel.name} has been enrolled into heartbeat! This thread will be reopened if closed. To unenroll, use the same command.`
		});
	}
}

export { create, invoke };