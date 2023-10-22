import cron from 'node-cron';
import fetch from 'node-fetch';
import Database from 'better-sqlite3';
import { MessageFlags } from 'discord.js';

const API_BASE_URL = 'https://imaginaryctf.org/api/solves/byuserid/';
const API_CHALLENGES_URL = 'https://imaginaryctf.org/api/challenges/released';

const db = new Database('databases/iCTF.db');
db.exec(`
	CREATE TABLE IF NOT EXISTS solves_announced (
		'UserID' text, 
		'ChallengeID' text, 
		PRIMARY KEY('UserID', 'ChallengeID')
	)
`);

const getJsonFromUrl = async (url) => {
	try {
		const response = await fetch(url);
		const data = await response.json();

		if (response.status === 200)
			return data;
		else
			return null;
	} catch (error) {
		console.error(`Error fetching data from "${url}": ${error}`);
		return null;
	}
}

const getChallengesSolved = async (id) => {
	const url = `${API_BASE_URL}${id}`;
	return await getJsonFromUrl(url);
}

const getChallenges = async () => {
	return await getJsonFromUrl(API_CHALLENGES_URL);
}

const announceChallengeSolved = async (client, user, challenge) => {
	const threadID = db.prepare('SELECT ThreadID FROM challenge_threads WHERE ChallengeID = ?').pluck().get(challenge.id);

	if (!threadID) {
		console.error(`No thread for ""${challenge.title}"" - ${challenge.id}`);
		return;
	}

	const thread = await client.channels.fetch(threadID);

	if (!thread) {
		console.error(`Failed to get thread for "${challenge.title}" - ${challenge.id}`);
		return;
	}

	const releasedChallenges = await getChallenges();
	const releasedChall = releasedChallenges.find(chall => chall.id === challenge.id);
	const solvesCount = releasedChall ? releasedChall.solves_count : 'an unknown number of';

	const content = `<@${user.discordUserID}> has solved this challenge! There are now ${solvesCount} solvers. 🎉`;
	const msg = await thread.send({ content, flags: MessageFlags.SuppressNotifications });
	db.prepare('INSERT INTO solves_announced (UserID, ChallengeID) VALUES (?, ?)').run(user.iCTFAccountID, challenge.id);

	switch (solvesCount) {
		case 1:
			msg.react('🩸');
			break;
		case 2:
			msg.react('🥈');
			break;
		case 3:
			msg.react('🥉');
			break;
	}

	console.log(`iCTF-Announce: Announced <@${user.discordUserID}> (${user.iCTFAccountID}) solved ${challenge.id} - "${challenge.title}" (${solvesCount} solvers) in <#${threadID}>`);
}

const findNewSolvers = async (client) => {
	const users = db.prepare('SELECT * FROM linked_accounts').all();

	for (const user of users) {
		const solvedChallenges = await getChallengesSolved(user.iCTFAccountID);

		if (!solvedChallenges)
			continue;

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
