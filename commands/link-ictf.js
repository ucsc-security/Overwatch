import { SlashCommandBuilder } from 'discord.js';
import Database from 'better-sqlite3';
import fetch from 'node-fetch';

const db = new Database('iCTF.db');
db.exec(`
	CREATE TABLE IF NOT EXISTS linked_accounts (
		'discordUserID' text,
		'iCTFAccountID' integer,
		PRIMARY KEY('discordUserID')
	)
`);

const API_BASE_URL = 'https://imaginaryctf.org/api/solves/byuserid/';

const MESSAGES = {
	FIND_ACCOUNT_ID: 'To find your account ID:\n1. Go to <https://imaginaryctf.org/Account>\n2. Click to view your public profile page\n3. Your account id should be at the end of the URL.\n\nFor example, if your profile page is `https://imaginaryctf.org/Account/User/123456`, your account ID is `123456`.',
	LINK_SUCCESS: (websiteUser) => `Success! Your Imaginary CTF account has been linked to ${websiteUser}.`,
	UPDATE_SUCCESS: (websiteUser) => `Success! Your Imaginary CTF account link has been updated to ${websiteUser}.`,
	UNLINK_SUCCESS: 'You have successfully unlinked your iCTF account!',
};

const PREPARED_STATEMENTS = {
	INSERT_LINKED_ACCOUNT: db.prepare('INSERT INTO linked_accounts (discordUserID, iCTFAccountID) VALUES (?, ?)'),
	UPDATE_LINKED_ACCOUNT: db.prepare('UPDATE linked_accounts SET iCTFAccountID = ? WHERE discordUserID = ?'),
	DELETE_LINKED_ACCOUNT: db.prepare('DELETE FROM linked_accounts WHERE discordUserID = ?'),
	SELECT_LINKED_ACCOUNT: db.prepare('SELECT * FROM linked_accounts WHERE discordUserID = ?'),
};

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
		.setName('link-ictf')
		.setDescription('Link your Imaginary CTF account to announce when you capture a flag. To unlink, rerun this command.')
		.addIntegerOption((option) => option
			.setName('ictf-account-id')
			.setDescription('Your Imaginary CTF account ID. Run the command see how to find it.')
		)
		.setDMPermission(false);

	return command.toJSON();
};

const invoke = async (interaction) => {
	const ictfAccountID = interaction.options.getInteger('ictf-account-id');
	const linked = PREPARED_STATEMENTS.SELECT_LINKED_ACCOUNT.get(interaction.user.id);

	if (ictfAccountID !== null) {
		const userData = await getUserData(ictfAccountID);
		if (userData && userData.length > 0) {
			const websiteUser = userData[0]?.user?.websiteUser?.userName || 'unknown';

			// If the user provided an account ID to link or update
			if (linked) {
				// If the user is already linked, update their account ID
				PREPARED_STATEMENTS.UPDATE_LINKED_ACCOUNT.run(ictfAccountID, interaction.user.id);
				interaction.reply({
					content: MESSAGES.UPDATE_SUCCESS(websiteUser),
					ephemeral: true,
				});
				console.log(`link-iCTF: Updated linked account for ${interaction.user.username}#${interaction.user.discriminator} (${interaction.user.id}) to ${websiteUser} (${ictfAccountID})`);
				return;
			}
			// If the user is not linked, link them
			PREPARED_STATEMENTS.INSERT_LINKED_ACCOUNT.run(interaction.user.id, ictfAccountID);
			interaction.reply({
				content: MESSAGES.LINK_SUCCESS(websiteUser),
				ephemeral: true,
			});
			console.log(`link-iCTF: Linked account for ${interaction.user.username}#${interaction.user.discriminator} (${interaction.user.id}) to ${websiteUser} (${ictfAccountID})`);
			return;
		} else {
			// If the account ID resulted in an error/no data
			interaction.reply({
				content: `We ran into an issue using that account ID. Please try again. \n${MESSAGES.FIND_ACCOUNT_ID}`,
				ephemeral: true,
			});
			return;
		}
	} else {
		// If the user did not provide an account ID, they probably want to unlink
		if (linked) {
			// If the user is linked, unlink them
			PREPARED_STATEMENTS.DELETE_LINKED_ACCOUNT.run(interaction.user.id);
			interaction.reply({
				content: MESSAGES.UNLINK_SUCCESS,
				ephemeral: true,
			});
			console.log(`link-iCTF: Unlinked account for ${interaction.user.username}#${interaction.user.discriminator} (${interaction.user.id})`);
			return;
		}

		// If the user didn't have an account linked before and did not provide an account ID
		interaction.reply({
			content: `You did not provide an account ID to link to! \n${MESSAGES.FIND_ACCOUNT_ID}`,
			ephemeral: true,
		});
		console.log(`link-iCTF: No account ID provided for ${interaction.user.username}#${interaction.user.discriminator} (${interaction.user.id})`);
	}
};

export { create, invoke };
