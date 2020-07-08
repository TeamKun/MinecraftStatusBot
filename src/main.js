const Discord = require('discord.js');
const config = require('config');
const pinger = require("minecraft-server-util");
const cron = require("node-cron");
const i18n = require("i18n");

const prefix = "/status ";
const client = new Discord.Client();

i18n.configure({
  locales: ['en', 'ja'],
  defaultLocale: config.locale,
  directory: __dirname + '/../locales',
});

client.on('ready', () => {
  console.log(i18n.__('log.login', { user: client.user.tag }));
});

cron.schedule(config.event, async () => {
  await Promise.all(config.channels.map(channelData => {
    return (async () => {
      const guild = client.guilds.resolve(channelData.guild);
      if (guild === null)
        throw new Error(i18n.__('error.guild_id'));
      const channel = guild.channels.resolve(channelData.channel);
      if (channel === null)
        throw new Error(i18n.__('error.channel_id'));

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
        title: i18n.__('embed.title'),
        color: 0x536C33,
        timestamp: new Date(),
        fields: results.map(server => {
          return {
            name: server.name,
            value: server.online
                ? i18n.__('embed.status.online')
                : i18n.__('embed.status.offline'),
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