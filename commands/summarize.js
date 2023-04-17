import { SlashCommandBuilder, Collection  } from 'discord.js';
import { } from 'dotenv/config';
const PROMPT = 'Using bullet points, summarize in detail (do not directly mention the time) the following messages:';
const TOKEN_RATE = 0.002 / 1000; // $0.002 / 1K tokens

import { Configuration, OpenAIApi } from "openai";
const openai = new OpenAIApi(new Configuration({
	apiKey: process.env.openai_token,
}));

const cooldownCollection = new Collection();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

const create = () => {
	const command = new SlashCommandBuilder()
		.setName('summarize')
		.setDescription('Use ChatGPT to summarize recent messages via bullet points')
		.setDMPermission(false)
		.addIntegerOption(option =>
			option.setName('num_messages')
				.setDescription('How many messages to go back and summarize, between 5 and 100')
				.setRequired(true)
				.setMinValue(5)
				.setMaxValue(100)
		);

	return command.toJSON();
}

const invoke = async (interaction) => {
	let num_messages = interaction.options.getInteger('num_messages');

	if (!interaction.member.permissions.has('ADMINISTRATOR') && cooldownCollection.has(interaction.user.id)) {
		const timeLeft = (cooldownCollection.get(interaction.user.id) - Date.now());
		interaction.reply({
			content: `You are on cooldown! Try again in <t:${Math.round(Date.now() / 1000) + Math.round(timeLeft / 1000)}:R>`,
			ephemeral: true,
		});
		return;
	}
	cooldownCollection.set(interaction.user.id, Date.now() + COOLDOWN_MS);
	setTimeout(() => cooldownCollection.delete(interaction.user.id), COOLDOWN_MS);

	let messages_text = '';
	await interaction.channel.messages.fetch({ limit: num_messages }).then((messages) => {
		messages = messages.reverse();

		messages.forEach((message) => {
			var author = message.member ? message.member.displayName : message.author.username;
			var time = message.createdAt.toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour12: false, hour: '2-digit', minute: '2-digit' });
			var content = message.content + (message.attachments.size > 0 ? ` <attached a file \"${message.attachments.first().name}\">` : '');

			messages_text += `${author} at ${time}: ${content}\n`;
		});
	}).catch((error) => {
		console.log(error);
	});

	try {
		console.log(`Summarize: Summarizing ${num_messages} messages...`);
		await interaction.deferReply();

		if (messages_text.length < 50 || messages_text.length > 10000) {
			interaction.editReply(`Error! Something went wrong with fetching messages, length was ${messages_text.length}, expected between 50 and 10000.`);
			return;
		}

		const completion = await openai.createChatCompletion({
			model: "gpt-3.5-turbo",
			messages: [{ role: "user", content: `${PROMPT}\n${messages_text}` }],
		});

		const response = completion.data.choices[0].message.content;
		await interaction.editReply(response || 'No response from OpenAI! Try again later or less messages.');
		console.log(`Summarize: User ${interaction.member.displayName} summarized ${num_messages} messages (length of ${messages_text.length}), interaction costed ${completion.data.usage.total_tokens} tokens. Estimated cost: $${completion.data.usage.total_tokens * TOKEN_RATE}`);
	} catch (error) {
		console.log(error);
	}
}

export { create, invoke };