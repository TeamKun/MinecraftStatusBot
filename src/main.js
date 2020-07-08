const Discord = require('discord.js');
const config = require('config');
const pinger = require("minecraft-server-util");
const cron = require("node-cron");
const parser = require("discord-command-parser");

const prefix = "/status ";
const client = new Discord.Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

cron.schedule(config.event, async () => {
  await Promise.all(config.channels.map(channelData => {
    return (async () => {
      const guild = client.guilds.resolve(channelData.guild);
      const channel = guild.channels.resolve(channelData.channel);

      const results = await Promise.all(channelData.servers.map(serverData => {
        return (async () => {
          let [ip, port] = serverData.ip.split(":");
          if (port === undefined)
            port = '25565';
          const result = pinger(ip, Number(port))
            .then(data => true)
            .catch(err => false);
          return {
            ...serverData,
            online: result,
          };
        })();
      }));

      const embed = {
        title: "タイトル",
        timestamp: new Date(),
        fields: [
          {
            name: "field :one:",
            value: "*ここはfield 1の内容だよ*"
          }
        ]
      };

      const messages = await channel.messages.fetch({ limit: 1 });
      const lastMessage = messages.first();
      if (lastMessage !== undefined && lastMessage.editable)
        await lastMessage.edit({ embed: embed });
      else
        await channel.send({ embed: embed });
    })();
  }));
});

client.on("message", (message) => {
  const parsed = parser.parse(message, prefix);
  if (!parsed.success) return;

  if (parsed.command === "add") {
    return message.reply("Add " + parsed.getString() + " => " + parsed.reader.getRemaining());
  }

  if (parsed.command === "remove") {
    return message.reply("Remove " + parsed.getString());
  }
});

client.login(config.token);