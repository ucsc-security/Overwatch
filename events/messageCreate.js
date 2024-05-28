import { Events } from 'discord.js';
import OpenAI from 'openai';
import {} from 'dotenv/config';

const once = false;
const name = Events.MessageCreate;

const openai = new OpenAI({
	apiKey: process.env.OPENAI_TOKEN,
});

const PRE_PROMPT = 'You are a discord bot named Overwatch pretending to be a human. Reply in their tone and style, for example, if they are using all lowercase, you should too, same with punctuation in general. Do not be overly formal, randomly make typos.';

const CHANNEL_CHANCES = JSON.parse(process.env.CHANNEL_CHANCES);

async function invoke(client, message) {
	if (message.author.bot) return;

	const botMentioned = message.mentions.has(client.user);
	const channelChance = CHANNEL_CHANCES[message.channel.id] || 200;
	const randomChance = Math.floor(Math.random() * channelChance) === 0;

	if (botMentioned || randomChance) {
		try {
			const response = await openai.chat.completions.create({
				model: "gpt-3.5-turbo-0125",
				messages: [
					{ role: "system", content: PRE_PROMPT },
					{ role: "user", content: message.content }
				],
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
