import {} from 'dotenv/config';

const once = false;
const name = 'interactionCreate';

async function invoke(interaction) {
	const commandName = (process.env.dev === 'true')
		? interaction.commandName.replace(/^dev-/, '')
		: interaction.commandName;

	if (interaction.isChatInputCommand()) {
		const commandFile = await import(`#commands/${commandName}`);
		commandFile.invoke(interaction);
	}
}

export { once, name, invoke };
