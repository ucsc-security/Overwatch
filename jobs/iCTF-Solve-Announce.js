import cron from 'node-cron';
import fetch from 'node-fetch';
import Database from 'better-sqlite3';

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
			const msg = await thread.send(`<@${user.discordUserID}> has solved the challenge "${challenge.title}"!`);
			await msg.react('🎉');
			db.prepare('INSERT INTO solves_announced (UserID, ChallengeID) VALUES (?, ?)').run(user.iCTFAccountID, challenge.id);
		} else {
			console.error(`Thread not found for challenge ${challenge.title} - ${challenge.id}`);
		}
	} else {
		console.error(`Thread ID not found for challenge ${challenge.title} - ${challenge.id}`);
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
	findNewSolvers(client);
	// Run every minute
	cron.schedule('* * * * *', () => {
		findNewSolvers(client);
	});
};