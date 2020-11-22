const Discord = require('discord.js');
var bot = new Discord.Client();

var count = 0;
var players = [];

var cards;
var total;

function initGame () {
    cards = [0, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    total = [0, 0];
    turn = -1;
}

function gameTurn() {
    turn++;
    if (turn == players.length) turn = 0;
    players[turn].send('It is your turn !');
}

function play(turn,coup) {
    if (cards[coup] > 0) {
        cards[coup]--;
        total[turn] += parseInt(coup);
        return true;
    }
    return false;
}

function playerWins(turn) {
    return total[turn] == 15;
}

bot.on('ready', function () {
  console.log("Je suis connecté !")
});

bot.on('error', console.error); // Afficher les erreurs

bot.on('guildMemberAdd', member => {
  member.createDM().then(channel => {
    return channel.send('Bienvenue sur mon serveur ' + member.displayName)
  }).catch(console.error)
  // On pourrait catch l'erreur autrement ici (l'utilisateur a peut-être désactivé les MP)
});

bot.on('message', function (message) {
  if (message.author.bot) return; // Ne pas traiter les messages de bots
  console.log("Commande reçue:"+message.content);
// Tests
  if (message.content == '!tutoriel') {
    message.channel.send("@everyone Hello!");
    message.channel.send("Hello everyone!");
    message.channel.send("@toto Hello toto!");
    message.reply("Vive les tutos !");
  } else if (message.content == '!ping') {
    message.reply("pong");
  } else if (message.content == '!hello') {
    message.author.send("Hello "+message.author.username+" !");
  } else if (message.content.indexOf('!member')===0) {
    // nom = message.mentions.members.first().user.tag;
    nom = message.author.username;
    message.reply(nom);
    console.log(message);
  } else if (message.content == '!count') {
    count++;
    message.reply(count);
  } else if (message.content == '!message') {
    console.log(message);
  } else if (message.content == '!id') {
	message.reply(message.author.id);
  } else if (message.content == '!users') {
    console.log(bot.users);
  } else if (message.content == '!author') {
    console.log(message.author);
  } else if (message.content == '!guildmembers') {
    guild = message.guild;
	members = guild.members;
	//console.log(members);
	members.cache.forEach(function(member) {
      console.log(member.user);
	});
  } else if (message.content == '!broadcast') {
    members = message.guild.members.cache;
	members.forEach(function(member) {
	  user = member.user;
      console.log(user.username);
      if (!user.bot) {
        console.log('not a bot');
        user.send('Hello everyone !');
      }
    });
// The game    
  } else if (message.content == '!play') {
    players.push(message.author);
	message.reply('You will play the next game.');
  } else if (message.content == '!start') {
    console.log('There are '+players.length+' players');
    players.forEach(function(player) { 
      console.log(player);
	  player.send('The game is starting, '+player.username+' !');
	});
    initGame();
    gameTurn();    
  } else if (message.author.id == players[turn].id) {
      console.log('player '+message.author.username+' plays '+message.content);
      if (play(turn,message.content)) {
        message.reply('OK');
        players.forEach(function(player) {
            player.send('player '+message.author.username+' plays '+message.content);
        });
        console.log(total);
        if (playerWins(turn)) {
            players.forEach(function(player) {
                player.send('player '+message.author.username+' wins !');
            });
        } else {
            gameTurn();
        }
      } else {
        message.reply('You cannot do that.');
      }
      
  }
});

bot.login(process.env.TOKEN);