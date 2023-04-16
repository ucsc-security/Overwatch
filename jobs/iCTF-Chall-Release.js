import { EmbedBuilder } from 'discord.js';
import cron from 'node-cron';
import fetch from 'node-fetch';
import Database from 'better-sqlite3';
import { } from 'dotenv/config';

const ICTF_FORUM_CHANNEL_ID = process.env.iCTF_forum_channelID;

const db = new Database('iCTF.db');
db.exec("CREATE TABLE IF NOT EXISTS challenge_threads ('ChallengeID' text, 'ThreadID' text, PRIMARY KEY('ChallengeID'))");

const API_BASE_URL = 'https://imaginaryctf.org/api/challenges/released';

function mapCategoryToTag(category, channel) {
	const normalizedCategory = category.toLowerCase();
	const matchingTags = channel.availableTags.filter(tag => normalizedCategory.includes(tag.name));

	if (matchingTags.length > 0)
		return matchingTags.map(tag => tag.id);

	return [channel.availableTags.find(tag => tag.name.toLowerCase() === 'misc').id];
}

const getChallenges = async () => {
	try {
		const response = await fetch(API_BASE_URL);
		const data = await response.json();

		if (response.status === 200)
			return data;
		else
			return null;
	} catch (error) {
		console.error(`Error fetching challenge data: ${error}`);
		return null;
	}
}

const announceChallengeRelease = async (client, challenge) => {
	const embed = new EmbedBuilder()
		.setTitle(challenge.title)
		.setDescription(challenge.description)
		.addFields(
			{ name: "Attachments", 	value: challenge.attachments.toString() 			 },
			{ name: "Author", 		value: challenge.author.toString(), 	inline: true },
			{ name: "Category", 	value: challenge.category.toString(), 	inline: true },
			{ name: "Points", 		value: challenge.points.toString(), 	inline: true },
		)
		.setFooter({ text: `#${challenge.id}` })
		.setTimestamp(new Date(challenge.release_date));
		
		const embedColor = 	challenge.points < 45 ? '#00ff00' : // green
							challenge.points < 75 ? '#ffff00' : // yellow
							challenge.points < 150 ? '#ff9900' : // orange
							challenge.points < 165 ? '#ff0000' : // red
							'#000000'; // black
		embed.setColor(embedColor);


	await client.channels.fetch(ICTF_FORUM_CHANNEL_ID).then(channel => {
		channel.threads.create({
			name: `${challenge.id} - ${challenge.title}`,
			message: {
				content: '',
				embeds: [embed],
			},
			reason : 'New challenge released!',
			appliedTags: mapCategoryToTag(challenge.category, channel),
		}).then(async thread => {
			console.log(`Created thread ${thread.id} for challenge ${challenge.id}`);
			db.prepare('INSERT INTO challenge_threads (ChallengeID, ThreadID) VALUES (?, ?)').run(challenge.id, thread.id);
		});
	});
}

const checkForNewChallenges = async (client) => {
	const challenges = await getChallenges();
	if (challenges && challenges.length > 0) {
		for (const challenge of challenges) {
			const challengeID = challenge.id;
			const existingChallenge = db.prepare('SELECT * FROM challenge_threads WHERE ChallengeID = ?').get(challengeID);
			
			if (!existingChallenge) {
				console.log(`New challenge released! ${challenge.title} - ${challenge.id}`);
				announceChallengeRelease(client, challenge);
			}
		}
	}
}

export default (client) => {
	// Run the job immediately on startup
	checkForNewChallenges(client);
	// Schedule the job to run once every hour
	cron.schedule('0 * * * *', async () => {
		checkForNewChallenges(client);
	});
};