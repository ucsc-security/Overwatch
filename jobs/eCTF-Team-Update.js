import { EmbedBuilder } from 'discord.js';
import cron from 'node-cron';
import fetch from 'node-fetch';
import cheerio from 'cheerio';
import Database from 'better-sqlite3';
import {} from 'dotenv/config';

const ECTF_CHANNELID = process.env.ECTF_CHANNELID;
const SUMMARY_URL = 'https://sb.ectf.mitre.org/game/summary';
const MIN_SCORE_DELTA = 20;

const db = new Database('databases/eCTF.db');
db.exec(`
	CREATE TABLE IF NOT EXISTS ectf_teams (
		'TeamID' text,
		'TeamName' text,
		'Score' integer,
		'Rank' integer,
		PRIMARY KEY('TeamID')
	)
`);
db.exec(`
	CREATE TABLE IF NOT EXISTS ectf_challenges (
		'TeamID' text,
		'ChallengeID' text,
		'ChallengeName' text,
		'Points' integer,
		PRIMARY KEY('TeamID', 'ChallengeID')
	)
`);

async function updateAndCheck(client) {
	const scores = await fetchScores();
	for (const teamId in scores) {
		const team = scores[teamId];
		const { oldScore, oldRank } = getOldScoreRank(teamId);
		updateScoreRank(teamId, team);

		if (scoreChanged(team.score, oldScore)) {
			await checkChallenges(client, teamId, team.name, team.rank, oldRank);
		}
	}
}

function getOldScoreRank(teamId) {
	const stmt = db.prepare('SELECT Score, Rank FROM ectf_teams WHERE TeamID = ?');
	const row = stmt.get(teamId);
	return { oldScore: row ? row.Score : 0, oldRank: row ? row.Rank : null };
}

function updateScoreRank(teamId, team) {
	const updateStmt = db.prepare('REPLACE INTO ectf_teams (TeamID, TeamName, Score, Rank) VALUES (?, ?, ?, ?)');
	updateStmt.run(teamId, team.name, team.score, team.rank);
}

function challengeExists(teamId, challengeId) {
	const checkStmt = db.prepare('SELECT 1 FROM ectf_challenges WHERE TeamID = ? AND ChallengeID = ?');
	return checkStmt.get(teamId, challengeId) != null;
}

function insertChallenge(teamId, challenge) {
	const insertStmt = db.prepare('INSERT INTO ectf_challenges (TeamID, ChallengeID, ChallengeName, Points) VALUES (?, ?, ?, ?)');
	insertStmt.run(teamId, challenge.challengeId, challenge.challengeName, challenge.points);
}

function scoreChanged(newScore, oldScore) {
	return Math.abs(newScore - oldScore) >= MIN_SCORE_DELTA;
}

async function checkChallenges(client, teamId, teamName, newRank, oldRank) {
	const challenges = await fetchChallenges(teamId);
	challenges.forEach(challenge => {
		if (!challengeExists(teamId, challenge.challengeId)) {
			insertChallenge(teamId, challenge);
			announce(client, teamId, teamName, challenge, newRank, oldRank);
		}
	});
}

async function fetchScores() {
	try {
		const response = await fetch(SUMMARY_URL);
		const htmlString = await response.text();
		const $ = cheerio.load(htmlString);
		const data = {};

		$('table tr').each((index, element) => {
			if (index === 0) return;
			const rank = parseInt($(element).find('td').first().text().trim(), 10);
			const teamLink = $(element).find('td:nth-child(2) a');
			const teamName = teamLink.text().trim();
			const teamIdMatch = /\/teams\/(\d+)\/summary/.exec(teamLink.attr('href'));
			const teamId = teamIdMatch ? teamIdMatch[1] : null;
			const points = parseInt($(element).find('td:nth-child(4)').text().trim(), 10);

			if (teamId) {
				data[teamId] = { name: teamName, score: points, rank: rank };
			}
		});

		return data;
	} catch (error) {
		console.error('Error fetching eCTF summary:', error);
		return {};
	}
}

async function fetchChallenges(teamID) {
	const url = `https://sb.ectf.mitre.org/teams/${teamID}/summary`;
	try {
		const response = await fetch(url);
		const htmlString = await response.text();
		const $ = cheerio.load(htmlString);
		const challenges = [];

		$('table tr').each((index, element) => {
			if (index === 0) return;
			const challengeLink = $(element).find('td a').attr('href');
			const challengeIdMatch = /\/game\/challenges\/(\d+)/.exec(challengeLink);
			const challengeId = challengeIdMatch ? challengeIdMatch[1] : null;
			const challengeName = $(element).find('td').first().text().trim();
			const points = parseInt($(element).find('td:nth-child(2)').text().trim(), 10);

			if (challengeId) {
				challenges.push({ challengeId, challengeName, points });
			}
		});

		return challenges;
	} catch (error) {
		console.error(`Error fetching challenges for team ${teamID}:`, error);
		return [];
	}
}

async function announce(client, teamId, teamName, challenge, newRank, oldRank) {
	let rankChangeMsg = `${newRank}`;
	if (oldRank !== null) {
		const rankChange = oldRank - newRank;
		const rankChangeSymbol = rankChange > 0 ? '+' : '-';
		rankChangeMsg += ` (${rankChangeSymbol}${Math.abs(rankChange)})`;
	}

	const teamSummaryUrl = `https://sb.ectf.mitre.org/teams/${teamId}/summary`;
	const challengeUrl = `https://sb.ectf.mitre.org/game/challenges/${challenge.challengeId}`;

	const embedColor = '#00ff00';
	const embed = new EmbedBuilder()
		.setTitle(`Challenge Solved by ${teamName}`)
		.setDescription(`**[${teamName}](<${teamSummaryUrl}>)** has solved "**[${challenge.challengeName}](<${challengeUrl}>)**"`)
		.addFields(
			{ name: "Points", value: String(challenge.points), inline: true },
			{ name: "Team Rank", value: rankChangeMsg, inline: true }
		)
		.setColor(embedColor)
		.setFooter({ text: `Team ID: ${teamId}` })
		.setTimestamp();

	await client.channels.fetch(ECTF_CHANNELID).then(channel => {
		channel.send({ embeds: [embed] }).then(() => {
			console.log(`Announcement made for team ${teamName} <${teamId}> for solving challenge "${challenge.challengeName}" <${challenge.challengeId}>`);
		}).catch(err => console.error(err));
	}).catch(err => console.error(err));
}

export default (client) => {
	// Run the job immediately on startup
	console.log('eCTF-Teams-Update: Checking for new scores...');
	updateAndCheck(client);
	// Schedule the job to run once every minute
	cron.schedule('0 0 * * * *', () => {
		console.log('eCTF-Teams-Update: Checking for new scores...');
		updateAndCheck(client);
	});
};
