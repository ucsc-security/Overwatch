import { SlashCommandBuilder } from 'discord.js';
import Database from 'better-sqlite3';
import fetch from 'node-fetch';

const db = new Database('iCTF.db');
const API_BASE_URL = 'https://imaginaryctf.org/api/solves/byuserid/';

const getUserData = async (userID) => {
	try {
		const response = await fetch(`${API_BASE_URL}${userID}`);
		const data = await response.json();

		if (response.status === 200)
			return data;
		else
			return null;
	} catch (error) {
		console.error(`Error fetching user data: ${error}`);
		return null;
	}
};

const create = () => {
	const command = new SlashCommandBuilder()
		.setName('dev-link-ictf')
		.setDescription('Link your Imaginary CTF account to announce when you capture a flag. To unlink, rerun this command.')
		.addIntegerOption((option) => option
			.setName('ictf-account-id')
			.setDescription('Your Imaginary CTF account ID. Run the command see how to find it.')
		)
		.setDMPermission(false);

	db.exec("CREATE TABLE IF NOT EXISTS linked_accounts ('discordUserID' text, 'iCTFAccountID' integer, PRIMARY KEY('discordUserID'))");
	return command.toJSON();
};

const invoke = async (interaction) => {
	const ictfAccountID = interaction.options.getInteger('ictf-account-id');
	const linked = db.prepare('SELECT * FROM linked_accounts WHERE discordUserID = ?').get(interaction.user.id);

	if (ictfAccountID !== null) {
		const userData = await getUserData(ictfAccountID);
		if (userData && userData.length > 0) {
			const websiteUser = userData[0]?.user?.websiteUser?.userName || 'unknown';

			// If the user provided an account ID to link or update
			if (linked) {
				// If the user is already linked, update their account ID
				db.prepare('UPDATE linked_accounts SET iCTFAccountID = ? WHERE discordUserID = ?').run(ictfAccountID, interaction.user.id);
				interaction.reply({
					content: `Success! Your Imaginary CTF account link has been updated to ${websiteUser}.`,
					ephemeral: true,
				});
				return;
			}
			// If the user is not linked, link them
			db.prepare('INSERT INTO linked_accounts (discordUserID, iCTFAccountID) VALUES (?, ?)').run(interaction.user.id, ictfAccountID);
			interaction.reply({
				content: `Success! Your Imaginary CTF account has been linked to ${websiteUser}.`,
				ephemeral: true,
			});
			return;
		} else {
			// If the account ID resulted in an error/no data
			interaction.reply({
				content: 'We ran into an issue using that account ID. Please try again. \nTo find your account ID:\n' + 
						'1. Go to <https://imaginaryctf.org/Account>\n' +
						'2. Click to view your public profile page\n' +
						'3. Your account id should be at the end of the URL.\n\n' +
						'For example, if your profile page is `https://imaginaryctf.org/Account/User/123456`, your account ID is `123456`.',
				ephemeral: true,
			});
			return;
		}
	} else {
		// If the user did not provide an account ID, they probably want to unlink
		if (linked) {
			// If the user is linked, unlink them
			db.prepare('DELETE FROM linked_accounts WHERE discordUserID = ?').run(interaction.user.id);
			interaction.reply({
				content: 'You have successfully unlinked your iCTF account!',
				ephemeral: true,
			});
			return;
		}

		// If the user didn't have an account linked before and did not provide an account ID
		interaction.reply({
			content: 'You did not provide an account ID to link to! To find your account ID:\n' + 
					'1. Go to <https://imaginaryctf.org/Account>\n' +
					'2. Click to view your public profile page\n' +
					'3. Your account id should be at the end of the URL.\n\n' +
					'For example, if your profile page is `https://imaginaryctf.org/Account/User/123456`, your account ID is `123456`.',
			ephemeral: true,
		});
	}
};

export { create, invoke };
