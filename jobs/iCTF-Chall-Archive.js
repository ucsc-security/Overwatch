import { EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import Database from 'better-sqlite3';
import cron from 'node-cron';

const db = new Database('iCTF.db');
const API_ARCHIVED_CHALLENGES_URL = 'https://imaginaryctf.org/api/challenges/archived';

const getArchivedChallenges = async () => {
	try {
		const response = await fetch(API_ARCHIVED_CHALLENGES_URL);
		const data = await response.json();

		if (response.status === 200)
			return data;
		else
			return null;
	} catch (error) {
		console.error(`Error fetching archived challenge data: ${error}`);
		return null;
	}
}

const postWriteup = async (client, challenge) => {
	const threadID = db.prepare('SELECT ThreadID FROM challenge_threads WHERE ChallengeID = ?').get(challenge.id).ThreadID;

	await client.channels.fetch(threadID).then(async thread => {
		const codeBlockRegex = /(```[\s\S]*?```)/g;
		const spoilerWriteup = challenge.writeup.split(codeBlockRegex).map((section, index) => {
			// Check if the section is not a code block (odd index) and apply spoilers
			if (index % 2 === 0)
				return section.replace(/```/g, '```||');

			// If the section is a code block, return it as is
			return section;
		}).join('');

		const embed = new EmbedBuilder()
			.setTitle(`Challenge Author's Writeup`)
			.setDescription(`||${spoilerWriteup}||`)
			.addFields(
				{ name: "Flag", value: `||${challenge.flag}||` },
			)
			.setColor('#9b59b6') // Purple
			.setFooter({ text: `#${challenge.id}` })
			.setTimestamp(new Date(challenge.release_date));

		thread.send({ embeds: [embed] });
		db.prepare('UPDATE challenge_threads SET WriteupPosted = 1 WHERE ChallengeID = ?').run(challenge.id);
		console.log(`iCTF-Archive: Writeup posted for challenge ${challenge.id}`);
	});
}

const checkForArchivedChallenges = async (client) => {
	const challenges = await getArchivedChallenges();
	if (challenges && challenges.length > 0) {
		for (const challenge of challenges) {
			const existingChallenge = db.prepare('SELECT * FROM challenge_threads WHERE ChallengeID = ? AND WriteupPosted = 0').get(challenge.id);

			if (existingChallenge) {
				console.log(`iCTF-Archive: Writeup available for challenge ${challenge.id}`);
				postWriteup(client, challenge);
			}
		}
	}
}

export default (client) => {
	// Run the job immediately on startup
	console.log('iCTF-Archive: Checking for archived challenges...');
	checkForArchivedChallenges(client);
	// Schedule the job to run once every day
	cron.schedule('0 0 * * *', async () => {
		console.log('iCTF-Archive: Daily check for archived challenges...');
		checkForArchivedChallenges(client);
	});
};
