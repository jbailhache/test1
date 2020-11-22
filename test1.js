const Discord = require('discord.js');
var bot = new Discord.Client();
bot.on('message', function (message) {
  if (message.content == '!tutoriel') {
    message.reply("Vive les tutos");
  }
});
bot.login(process.env.TOKEN);

