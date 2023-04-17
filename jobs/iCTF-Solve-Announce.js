import cron from 'node-cron';
import fetch from 'node-fetch';
import Database from 'better-sqlite3';
import { MessageFlags } from 'discord.js';

const API_BASE_URL = 'https://imaginaryctf.org/api/solves/byuserid/';
const db = new Database('iCTF.db');
db.exec("CREATE TABLE IF NOT EXISTS solves_announced ('UserID' text, 'ChallengeID' text, PRIMARY KEY('UserID', 'ChallengeID'))");

const getChallengesSolved = async (id) => {
	try {
		const response = await fetch(`${API_BASE_URL}${id}`);
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

const announceChallengeSolved = async (client, user, challenge) => {
	const threadID = db.prepare('SELECT ThreadID FROM challenge_threads WHERE ChallengeID = ?').pluck().get(challenge.id);

	if (threadID) {
		const thread = await client.channels.fetch(threadID);
		if (thread) {
			await thread.send({ 
				content: `<@${user.discordUserID}> has solved this challenge! 🎉`, 
				flags: MessageFlags.SuppressNotifications 
			});
			db.prepare('INSERT INTO solves_announced (UserID, ChallengeID) VALUES (?, ?)').run(user.iCTFAccountID, challenge.id);

			console.log(`iCTF-Announce: Announced <@${user.discordUserID}> (${user.iCTFAccountID}) solved ${challenge.id} - "${challenge.title}" in <#${threadID}>`);
		} else {
			console.error(`Failed to get thread for ${challenge.title} - ${challenge.id}`);
		}
	}
}

const findNewSolvers = async (client) => {
	const users = db.prepare('SELECT * FROM linked_accounts').all();

	for (const user of users) {
		const solvedChallenges = await getChallengesSolved(user.iCTFAccountID);

		if (solvedChallenges) {
			for (const solvedChallenge of solvedChallenges) {
				const challengeID = solvedChallenge.challenge.id;
				const isAnnounced = db.prepare('SELECT 1 FROM solves_announced WHERE UserID = ? AND ChallengeID = ?').pluck().get(user.iCTFAccountID, challengeID);

				if (!isAnnounced) {
					const challenge = {
						id: challengeID,
						title: solvedChallenge.challenge.title
					};

					await announceChallengeSolved(client, user, challenge);
				}
			}
		}
	}
}

export default (client) => {
	// Run on startup
	console.log('iCTF-Announce: Checking for new solves...');
	findNewSolvers(client);
	// Run every minute
	cron.schedule('* * * * *', async () => {
		// no log due to frequency
		findNewSolvers(client);
	});
};