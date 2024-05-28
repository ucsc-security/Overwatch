import { Events, Collection } from 'discord.js';
import OpenAI from 'openai';
import {} from 'dotenv/config';

const once = false;
const name = Events.MessageCreate;

const openai = new OpenAI({
	apiKey: process.env.OPENAI_TOKEN,
});

const PRE_PROMPT = 'You are a discord bot named Overwatch pretending to be a human in the Slug Security sever, a UCSC cybersecurity club. Do not mention you are a bot. Reply in their tone and style, for example, if they are using all lowercase, you should too, same with punctuation in general. Do not be overly formal, randomly make typos. If its a simple greeting, do not say feel free or ask if theres anything else you can do.';

const CHANNEL_CHANCES = JSON.parse(process.env.CHANNEL_CHANCES);

const userCooldowns = new Collection();

async function invoke(client, message) {
	if (message.author.bot) return;

	const userId = message.author.id;
	if (userCooldowns.has(userId)) {
		const expirationTime = userCooldowns.get(userId) + 15_000;

		if (Date.now() < expirationTime) return;
	}
	userCooldowns.set(userId, Date.now());

	const botMentioned = message.mentions.has(client.user);
	const channelChance = CHANNEL_CHANCES[message.channel.id] || 300;
	const randomChance = Math.floor(Math.random() * channelChance) === 0;

	if (botMentioned || randomChance) {
		try {
			let messages = [
				{ role: "system", content: PRE_PROMPT },
				{ role: "user", content: message.content }
			];

			if (message.reference) {
				const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
				if (repliedMessage) messages.splice(1, 0, { role: "user", content: `Replying to: ${repliedMessage.content}` });
			}

			const response = await openai.chat.completions.create({
				model: "gpt-3.5-turbo-0125",
				messages: messages,
				max_tokens: botMentioned ? 500 : 150,
			});

			const reply = response.choices[0].message.content;
			if (!reply.includes("@")) await message.channel.send(reply);
		} catch (error) {
			console.error('Error interacting with OpenAI API:', error);
		}
	}
}

export { once, name, invoke };
