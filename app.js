const Discord = require('discord.js');
const dotenv = require('dotenv');
const mysql = require('mysql2');

dotenv.config();

const connection = mysql.createConnection({
    host: process.env.MYSQL_HOSTNAME,
    user: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
});

const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES] });

client.once('ready', () => {
    console.log('Ready!');
});

client.on('guildCreate', (guild) => {
   connection.query(`INSERT INTO servers (sId, channel, time) VALUES ("${guild.id}", "", 18)`);

   const embed = new Discord.MessageEmbed()
       .setTitle('Would You Rather Bot')
       .setDescription('Please set the channel to post the question in using `.wyr set` in the channel.');

   guild.systemChannel.send({ embeds: [embed] });
});

client.on('messageCreate', (message) => {
    if(!message.content.startsWith('.wyr')) return;

    if(message.content === '.wyr set') {
        connection.query(`UPDATE servers SET channel = "${message.channelId}" WHERE sID = "${message.guildId}"`);

        const embed = new Discord.MessageEmbed()
            .setTitle('Would You Rather Bot')
            .setDescription('The question will be sent in this channel.');

        message.channel.send({ embeds: [embed] });
    }
});

setInterval(() => {
    connection.query(`SELECT * FROM servers`, (error, results) => {
        if (error) console.error(error);
        console.log(results)

        results.forEach((row) => {
            const date = new Date();
            const currentTime = date.getHours() + ':' + date.getMinutes();
            const setTime = row.time + ':0';

            if(currentTime === setTime) {
                getQuestion(row.sId, (question) => {
                    if(row.webhook == "1") {
                        console.log('webhook')
                        const webhookClient = new Discord.WebhookClient({ url: 'https://discordapp.com/api/webhooks/962404276402008094/kiMAx6B9k3BKNsJ-z1aaK-xN6d_6uy9otx_rfdKqEaQm4TXZVbjJRMhR6fb0mHYPKHBd' });

                        const embed = new Discord.MessageEmbed()
                            .setTitle('Would You Rather')
                            .setDescription(question.question);

                        webhookClient.send({
                            username: 'Would You Rather',
                            embeds: [embed],
                        });
                    } else {
                        console.log('not webhook')
                        let channel = client.channels.cache.get(row.channel);

                        const embed = new Discord.MessageEmbed()
                            .setTitle('Would You Rather')
                            .setDescription(question.question);

                        channel.send({embeds: [embed]});
                    }
                });
            }
        });
    });
}, 60000);

client.login(process.env.TOKEN);

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

function getQuestion(sId, callback) {
    // Get a random question.
    connection.query(`SELECT * FROM questions ORDER BY RAND() LIMIT 1`, (qError, qResults) => {
        if(qError) throw qError;

        // Check if question has been asked before.
        connection.query(`SELECT * FROM answered WHERE qId = ${qResults[0].qId} AND sId = "${sId}"`, (ansError, ansResults) => {
            if(ansError) throw ansError;

            if(ansResults.length === 0) {
                connection.query(`INSERT INTO answered (aId, qId, sId) VALUES (${getRandomArbitrary(0,9999)}, "${qResults[0].qId}", ${sId})`);

                return callback(qResults[0]);
            } else {
                getQuestion(sId);
            }
        });
    });
}