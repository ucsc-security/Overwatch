import { SlashCommandBuilder, Collection } from 'discord.js';
import OpenAI from 'openai';
import {} from 'dotenv/config';

const PROMPT = 'Using bullet points, summarize in detail (do not directly mention the time) the following messages:';
const TOKEN_RATE = 0.002 / 1000; // $0.002 / 1K tokens
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

const openai = new OpenAI({
	apiKey: process.env.OPENAI_TOKEN,
});

const cooldowns = new Collection();

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

const fetchMessages = async (channel, num_messages) => {
	try {
		const messages = await channel.messages.fetch({ limit: num_messages });
		return messages.reverse(); // reverse so oldest messages are first
	} catch (error) {
		console.log(error);
	}
};

const formatMessages = (messages) => {
	return messages.map((message) => {
		const author = message.member ? message.member.displayName : message.author.username;
		const time = message.createdAt.toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour12: false, hour: '2-digit', minute: '2-digit' });
		const content = message.content + (message.attachments.size > 0 ? ` <attached a file "${message.attachments.first().name}">` : '');

		return `${author} at ${time}: ${content}\n`;
	}).join('');
};

const generateGPTSummary = async (messages_text) => {
	try {
		const completion = await openai.createChatCompletion({
			model: "gpt-3.5-turbo",
			messages: [{ role: "user", content: `${PROMPT}\n${messages_text}` }],
		});

		return completion;
	} catch (error) {
		console.log(error);
	}
};

const invoke = async (interaction) => {
	const num_messages = interaction.options.getInteger('num_messages');

	if (!interaction.member.permissions.has('ADMINISTRATOR') && cooldowns.has(interaction.user.id)) {
		const timeLeft = (cooldowns.get(interaction.user.id) - Date.now());
		interaction.reply({
			content: `You are on cooldown! Try again in <t:${Math.round(Date.now() / 1000) + Math.round(timeLeft / 1000)}:R>`,
			ephemeral: true,
		});
		return;
	}
	cooldowns.set(interaction.user.id, Date.now() + COOLDOWN_MS);
	setTimeout(() => cooldowns.delete(interaction.user.id), COOLDOWN_MS);

	const messages = await fetchMessages(interaction.channel, num_messages);
	const messages_text = formatMessages(messages);

	console.log(`Summarize: User ${interaction.member.displayName} is summarizing ${num_messages} messages (${messages_text.length} characters)...`);
	await interaction.deferReply();

	if (messages_text.length < 50 || messages_text.length > 10000) {
		interaction.editReply(`Error! Something went wrong with fetching messages, length was ${messages_text.length}, expected between 50 and 10000.`);
		return;
	}

	const completion = await generateGPTSummary(messages_text);
	const response = completion.data.choices[0].message.content;
	await interaction.editReply(response || 'No response from OpenAI! Try again later or with fewer messages.');

	console.log(`Summarize: User ${interaction.member.displayName} summarized ${num_messages} messages (${messages_text.length} characters), interaction costed ${completion.data.usage.total_tokens} tokens. Estimated cost: $${completion.data.usage.total_tokens * TOKEN_RATE}`);
};

export { create, invoke };
