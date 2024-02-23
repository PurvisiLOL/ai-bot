const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { Configuration, OpenAIApi } = require ('openai');
const mongoose = require ('mongoose'); // You must have a connection system otherwise the code won't work.

// Define your Mongoose schema and model for storing user messages and ChatGPT responses
const userConversationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    messages: [{ type: String }],
    response: { type: String }
});

const UserConversation = mongoose.model('UserConversation', userConversationSchema);

module.exports = { 
    data: new SlashCommandBuilder()
        .setName('chatgpt')
        .setDescription('Ask a question to ChatGPT')
        .addStringOption(option => option.setName('prompt').setDescription('The prompt for ChatGPT').setRequired(true)),
    async execute(interaction) {
        const configuration = new Configuration({
            apiKey: process.env.chatgtp
        });
        const openai = new OpenAIApi(configuration);

        const generating = new EmbedBuilder()
        generating.setDescription(`<a:4704loadingicon:1209377718278422548> | Currently generating your response, this might take a while`);
        generating.setColor('Random')

        await interaction.reply({ embeds: [generating], ephemeral: true });

        const { options } = interaction;
        const userId = interaction.user.id;
        const prompt = options.getString('prompt');

        try {
            // Fetch user conversation from MongoDB
            let userConversation = await UserConversation.findOne({ userId }).exec();

            // If user conversation not found, create a new one
            if (!userConversation) {
                userConversation = new UserConversation({ userId, messages: [] });
            }

            userConversation.messages.push(prompt);

            // Generate response from ChatGPT
            const result = await openai.createChatCompletion({
                model: 'gpt-3.5-turbo-16k-0613', // Adjust the model name if necessary
                messages: userConversation.messages.map(msg => ({ role: 'user', content: msg }))
            });

            // Save response to user conversation
            userConversation.response = result.data.choices[0].message.content;
            await userConversation.save();

            const response = new EmbedBuilder()
            response.setTitle(`${options.getString('prompt')}`)
            response.setAuthor({ name: `ChatGTP's Response` })
            response.setDescription(`\`\`\`${userConversation.response}\`\`\``);

            await interaction.followUp({ embeds: [response] });
        } catch (error) {
            console.error('Error generating response from ChatGPT:', error);
            const embed = new EmbedBuilder()
            embed.setDescription(`<:8916crossmark:1200361991798263858> | A error has occured while generating your response, please try again later.`);
            embed.setColor('Random')
            embed.setTimestamp();
            await interaction.followUp({ embeds: [embed], ephemeral: true});
        }
    }
};
