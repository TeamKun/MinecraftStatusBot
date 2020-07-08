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
      if (guild === null)
        throw new Error('サーバーIDが不正です');
      const channel = guild.channels.resolve(channelData.channel);
      if (channel === null)
        throw new Error('チャンネルIDが不正です');

      const results = await Promise.all(channelData.servers.map(serverData => {
        return (async () => {
          let [ip, port] = serverData.ip.split(':');
          if (port === undefined)
            port = '25565';
          const result = await pinger(ip, Number(port))
            .then(data => true)
            .catch(err => false);
          return {
            ...serverData,
            online: result,
          };
        })();
      }));

      const embed = {
        title: 'サーバー状態',
        color: 0x536C33,
        timestamp: new Date(),
        fields: results.map(server => {
          return {
            name: server.name,
            value: server.online ? '✅' : '❌',
            inline: true,
          };
        })
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

client.login(config.token);