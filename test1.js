/* Bot Discord Sporz
	Auteur : Jacques Bailhache (jacques.bailhache@gmail.com) 2020

A faire :
 - tests
 - votes
 - désignation du nouveau capitaine
 - fin de partie
 - tts
 - token dans un autre fichier
 - commande !stop pour demander la fin de partie
 - paramétrage : délais, rôles mutants, accord ...
 - supprimer/ajouter traces
 - commande !genomerole role genome ...
 - revoir distribution génômes
 - accord des mutants et des médecins ?
 - factorisation
 - autres rôles : espion, hacker ...
 - commentaires
 - aide
*/

const Discord = require('discord.js');
var bot = new Discord.Client();

// Variables pour le jeu

var channel = null;

var phase = "INI";

var players = [];

var rolesDispo = [
		{ "code":"MUT", "nom":"mutant", "genome":["H"] },
        { "code":"MED", "nom":"médecin", "genome":["N"] },
        { "code":"MED", "nom":"médecin", "genome":["N"] },
        { "code":"PSY", "nom":"psychologue", "genome":["N","H","R"] },
        { "code":"GEN", "nom":"généticien", "genome":["N","H","R"] },
		{ "code":"REC", "nom":"recruteur", "genome":["N","H","R"] },
        { "code":"INF", "nom":"informaticien", "genome":["N","H","R"] },
        { "code":"FAN", "nom":"fanatique", "genome":["N","H","R"] },
	];
	
var roles = rolesDispo;

var astronaute = { "code" : "AST", "nom" : "astronaute", "genome":["N","H","R"] };

var genomesDispo = [
	{ "code":"H", "nom":"hôte" },
	{ "code":"H", "nom":"hôte" },
	{ "code":"R", "nom":"résistant"},
];

var normal = { "code":"N", "nom":"normal" };

var genomes = genomesDispo;

var sain = { "code":"S", "nom":"sain" };
var mutant = { "code":"M", "nom":"muté" };

var capitaine; // l'indice du capitaine dans le tableau players

var tues = []; // Les victimes de la nuit

var mute = null; // le joueur muté
var kill = null; // le joueur tué
var para = null; // le joueur paralysé

var med = [];

var maxvotes = 0;		// nombre de votes maximum pour un joueur
var nvotesblancs = 0;	// nombre de votes blancs
var accuses = [];		// les joueurs qui ont le plus de votes
var exaequo = false;

var param = {
	TMUT : 60,
	TMED : 60,
	TENQ : 60,
	TJOUR : 180,
	TSOIR : 60,
    RJOUR : 30,
	MUTROLE : 1,
};

var resume = "RESUME DE LA PARTIE\n"; 

var jour = 0;

var aide_init = "\
INITIALISATION DE LA PARTIE\n\
\n\
 !init : initialiser la partie\n\
\n\
 !roles r1 r2 ... rn : sélectionner les rôles, avec r1, r2, ... rn parmi :\n\
   MUT : mutant\n\
   MED : médecin\n\
   PSY : psychologue\n\
   GEN : généticien\n\
   REC : recruteur\n\
   INF : informaticien\n\
   FAN : fanatique\n\
  Les astronautes ne sont pas indiqués, ils sont ajoutés automatiquement en fonction du nombre de joueurs.\n\
  Exemple : !roles MUT MED MED PSY GEN INF\n\
\n\
 !genomes g1 g2 ... gn : sélectionner les génômes, avec g1, g2, ... gn parmi :\n\
   H : hôte\n\
   R : résistant\n\
  Les normaux ne sont pas indiqués, ils sont ajoutés automatiquement en fonction du nombre de joueurs.\n\
  Exemple : !genomes H H R\n\
\n\
 !genomerole r g1 g2 ... gn : indiquer les génômes possibles pour le rôle r\n\
\n\
 !param : afficher les valeurs des paramètres\n\
 !param X Y : modifier le paramètre X en lui donnant la valeur Y\n\
 Paramètres : \n\
  MUTROLE : 0 : les mutés ne jouent plus leur rôle, 1 : les mutés (sauf les médecins) continuent à jouer leur rôle\n\
  TMUT : durée maximale (secondes) de la phase des mutants\n\
  TMED : durée maximale de la phase des médecins\n\
  TENQ : durée maximale de la phase de l'informaticien, du psychologue, du généticien et du recruteur\n\
  TJOUR : durée maximale de la phase de jour\n\
  TSOIR : durée maximale pour le choix du capitaine en cas d'ex-aequo\n\
  RJOUR : nombre de secondes avant la fin du jour pour le rappel\n\
\n\
 !play : demander à jouer dans la prochaine partie\n\
\n\
 !start : démarrer la partie\n\
\n\
"

var aide_jeu = "\
COMMANDES POUR LES MUTANTS :\n\
 !mute X : muter X\n\
 !tuer X : tuer X\n\
 !para X : paralyser X\n\
\n\
COMMANDES POUR LES MEDECINS :\n\
 !soin X : soigner X\n\
 !tuer X : tuer X\n\
\n\
COMMANDES POUR LE PSYCHOLOGUE, LE GENETICIEN ET LE RECRUTEUR :\n\
 Indiquer simplement le nom de la personne à examiner.\n\
\n\
COMMANDES POUR LE VOTE :\n\
 !vote X : voter contre X\n\
 !vote blanc : vote blanc\n\
 !vote abstention : abstention\n\
\n\
COMMANDES POUR LE CAPITAINE :\n\
 !elim X : le capitaine choisit d'éliminer X en cas d'ex-aequo\n\
 !cap X : le capitaine désigne X comme nouveau capitaine\n\
";

bot.on("ready", function () {
  console.log("Je suis connecté !")
  //console.log(bot.channels);
  channel = bot.channels.cache.find(channel => channel.name == "Test");
  if (channel) {
	  //console.log(channel);
	  /*channel.join().then(function(connection) {
		  console.log("Dans le salon");
	  }).catch(function(e) {
		  console.log(e);
	  });*/
	  //channel.send("Bonjour !");
  }
});

bot.on("error", console.error); // Afficher les erreurs

/*
Phases :
	INI	: initialisation de la partie
	MUT : mutants
	MED : médecins
	ENQ : informaticien, psychologue, généticien
	JOUR : discussion et vote
	SOIR : résultat du vote
*/
	
bot.on("message", function (message) {
	if (message.author.bot) return; // Ne pas traiter les messages de bots
	console.log("Commande reçue de "+message.author.username+" : "+message.content);
// Tests
	if (message.content == "!ping") {
		message.reply("pong");
	} 
	messagePARTIE(message);
	if (phase == "INI") {
		messageINI(message);
	} else if (phase == "MUT") {
		messageMUT(message);
	} else if (phase == "MED") {
		messageMED(message);
	} else if (phase == "ENQ") {
		messageENQ(message);
	} else if (phase == "JOUR") {
		messageJOUR(message);
	} else if (phase == "SOIR") {
		messageSOIR(message);
	}
});

//const config = require("./config.json");
//bot.login(config.TOKEN);
bot.login(process.env.TOKEN);

// Ecrire à tout le meonde
function writeall(texte) {
	console.log("writeall: "+texte);
	try {
		channel.send(texte);
	} catch (e) { }
	for (player of players) {
		if (player.vivant) {
			//console.log("envoi à "+player.username);
			player.send(texte);
		}
	}				
}

// Dire (et écrire) à tout le monde
function sayall(texte) {
	console.log("sayall: "+texte);
	try {
		channel.send(texte, { tts : true } );
	} catch (e) { }
	for (player of players) {
		if (player.vivant) {
			//console.log("envoi à "+player.username);
			player.send(texte);
		}
	}				
}

function phaseINI(message) {
	console.log("phase INI");
	init();
}

function messageINI(message) { 
	if (message.content == "!init") {
		init();
		message.channel.send("Partie initialisée");
		channel = message.channel;
	} else if (message.content == "!channel") {
		channel = message.channel;
	} else if (message.content.indexOf("!roles ") == 0) {
		sel = message.content.substr(7).split(" ");
		message.reply("Sélection des rôles distribués : "+sel);
		roles = [];
		for (item of sel) {
			role = rolesDispo.find(role1 => role1.code == item);
			if (role) {
				roles.push(role);
				message.reply("Rôle ajouté : "+role.nom);
			} else {
				message.reply("Rôle inexistant : "+item);
			}
		}
		console.log(roles);
	} else if (message.content.indexOf("!genomes ") == 0) {
		sel = message.content.substr(9).split(" ");
		message.reply("Sélection des génômes distribués : "+sel);
		genomes = [];
		for (item of sel) {
			genome = genomesDispo.find(genome1 => genome1.code == item);
			if (genome) {
				genomes.push(genome);
				message.reply("Génôme ajouté : "+genome.nom);
			} else {
				message.reply("Génôme inexistant : "+item);
			}
		}
	} else if (message.content.indexOf("!genomerole ") == 0) {
		a = message.content.split(" ");
		codeRole = a[1];
		role = rolesDispo.find(role => role.code == codeRole);
		if (role) {
		role.genome = [];
			for (i=0; i<a.length-2; i++) {
				role.genome.push(a[2+i]);
			}
		}
		console.log(rolesDispo);
	} else if (message.content == "!param") {
		phrase1 = "";
		for (var p in param) {
			phrase1 += p+" = "+param[p] + "\n";
		}
		message.reply(phrase1);
	} else if (message.content.indexOf("!param ") == 0) {
		a = message.content.split(" ");
		if (isNaN(a[2])) {
			param[a[1]] = a[2];
		} else {
			param[a[1]] = parseInt(a[2]);
		}
	} else if (message.content == "!play") {
		if (players.find(player => player.username == message.author.username)) {
			message.reply("Tu es déjà inscrit.");
		} else {
			players.push(message.author);
			message.reply("Tu vas jouer dans la prochaine partie.");
		}
	} else if (message.content == '!start') {
		console.log("Il y a "+players.length+" joueurs.");
		if (players.length < roles.length) {
			message.reply("Il n'y a pas assez de joueurs, il y a "+players.length+" joueurs pour "+roles.length+" rôles.");
		} else {
			message.channel.send("La partie commence avec "+players.length+" joueurs.", { tts: true });
			status = distrib();
			if (!status) {
				message.reply("Impossible de distribuer les génomes.");
				init();
				return;
			}
			//message.channel.send("Le capitaine est "+players[capitaine].username+".");
			writeall("Le capitaine est "+players[capitaine].username+".");
			resume += "Le capitaine est "+players[capitaine].username+".\n";
			for (player of players) {
				//console.log(player);
				player.send("La partie commence, "+player.username+" ! Tu es "+player.role.nom+".");
				resume += player.username + " est " + player.role.nom + " " + player.genome.nom + " " + player.etat.nom + ".\n";
				if (player.role.code == "MED") {
					for (autre of players) {
						if (autre.role.code == "MED" && autre.username != player.username) {
							player.send(autre.username+" est aussi "+autre.role.nom+".");
						}
					}
				}
			}
			phase = "SOIR";
			phaseMUT(message);
		}
	} 
}

function init() {
	phase = "INI";
	players = [];
	roles = rolesDispo;
	genomes = genomesDispo;
	param = {
		TMUT : 60,
		TMED : 60,
		TENQ : 60,
		TJOUR : 60,
		TSOIR : 60,
        RJOUR : 30,
		MUTROLE : 1,
	};
	resume = "RESUME DE LA PARTIE\n";
	jour = 0;
}

// Distribution des rôles et des génômes
function distrib () {
	console.log("distrib");
	for (player of players) {
		player.vivant = true;
		player.para = false;
	}
	for (let i=0; i<players.length-roles.length; i++) {
		roles.push(astronaute);
	}
	console.log(roles);
	for (player of players) {
		//console.log(player);
		r = Math.floor(Math.random() * roles.length);
		player.role = roles.splice(r,1)[0];
		if (player.role.code == "MUT") {
			player.etat = mutant;
		} else {
			player.etat = sain;
		}
		//console.log(player);
	}
	/*console.log(players);
	for (player of players) {
		console.log(player);
	}*/
	console.log("genomes 1");
	for (let i=0; i<players.length-genomes.length; i++) {
		genomes.push(normal);
	}
	//console.log(players);
	console.log("genomes 2");
	for (player of players) {
		player.genome = null;
	}
	//console.log(players);
	//for (player of players) { console.log(player); }
	console.log("genomes 3");
	console.log(genomes);
	for (player of players) {
		if (player.role.genome.length == 1) {
			//console.log(player);
			let i = genomes.findIndex(genome => genome.code == player.role.genome[0]);
			//console.log("i = "+i);
			if (i != -1) {
				player.genome = genomes.splice(i,1)[0];
			}
		}
	}
	//console.log(players);
	console.log("genomes 4");
	for (player of players) {
		if (player.genome == null) {
			//console.log(player);
			found = false;
			for (let i=0; i<30000; i++) {
				r = Math.floor(Math.random() * genomes.length);
				if (player.role.genome.find(code => code == genomes[r].code)) {
					player.genome = genomes.splice(r,1)[0];
					found = true;
					break;
				}
			}
			if (!found) {
				return false;
			}
		}
	}
	console.log("capitaine");
	capitaine = Math.floor(Math.random() * players.length);
	for (player of players) {
		player.capitaine = false;
	}
	players[capitaine].capitaine = true;
	return true;
}

function faire(message,username,action) {
	player = players.find(player => player.username == username && player.vivant);
	if (player) {
		action(player);
	} else {
		message.author.send(username + " ne fait pas partie de l'équipage.");
	}
}
			
function tuer(player,message) {
	player.vivant = false;
	player.send("Tu as été tué.");
	if (player.capitaine && !gameOver(message)) {
		phrase1 = "Tu dois désigner le nouveau capitaine parmi :";
		for (player1 of players) {
			if (player1.vivant) {
				phrase1 += " " + player1.username;
			}
		}
		phrase1 += "\nTape la commande \"!cap X\" pour désigner X comme nouveau capitaine.";
		player.send(phrase1);
	}
}

function gameOver(message) {
	if (phase == "INI") {
		return true;
	}
	if (!players.find(player => player.vivant)) {
		sayall("La partie est terminée, il ne reste plus personne.");
		resume += "La partie est terminée, il ne reste plus personne.\n ";
		writeall(resume);
		phaseINI(message);
		return true;
	}
	if (!players.find(player => player.vivant && player.etat.code == "M")) {
		sayall("La partie est terminée, les sains ont gagné.");
		resume += "La partie est terminée, les sains ont gagné.\n";
		writeall(resume);
		phaseINI(message);
		return true;
	}
	if (!players.find(player => player.vivant && player.etat.code == "S")) {
		sayall("La partie est terminée, les mutants ont gagné.");
		resume += "La partie est terminée, les mutants ont gagné.\n";
		writeall(resume);
		phaseINI(message);
		return true;
	}
	return false;
}

// Messages traités dans toutes les phases
function messagePARTIE(message) {
    if (message.content == "!aide") {
        message.reply(aide_init);
		message.reply(aide_jeu);
    } else if (phase != "INI" && message.author.capitaine && !message.author.vivant && message.content.indexOf("!cap ") == 0) {
		username = message.content.substr(5);
		console.log("Le capitaine désigne "+username);
		//console.log(players);
		player = players.find(player => player.vivant && player.username == username);
		if (player) {
			message.author.capitaine = false;
			player.capitaine = true;
			for (let i=0; i<players.length; i++) {
				if (players[i].capitaine) {
					capitaine = i;
				}
			}
			writeall("Le nouveau capitaine est "+player.username+".");
			resume += "Le nouveau capitaine est "+player.username+".\n";
		} else {
			message.reply(username + " ne fait pas partie de l'équipage.");
		}
	}
}

function phaseMUT(message) {
	if (gameOver(message)) {
		return;
	}
	if (phase != "SOIR") {
		return;
	}
	phase = "MUT";
	jour++;
	resume += "\nNUIT " + jour + " :\nLes mutants se réveillent :";
	tues = [];
	mute = null;
	kill = null;
	para = null;
	for (player of players) {
		player.para = false;
	}	
	// message.channel.send("C'est la nuit, je vous dirai en message privé si vous avez quelque chose à faire ou s'il vous arrive quelque chose.", { tts : true });
	sayall("C'est la nuit.");
	writeall("Je vous dirai en message privé si vous avez quelque chose à faire ou s'il vous arrive quelque chose.");
	texte1 = "C'est à vous les mutants :";
	texte2 = "Les membre d'équipage encore sains sont : ";
	for (player of players) {
		if (player.vivant) {
			if (player.etat.code == "M") {
				texte1 = texte1 + " " + player.username;
			} else {
				texte2 = texte2 + " " + player.username;
			}
		}
	}
	for (player of players) {
		if (player.etat.code == "M" && player.vivant) {
			resume += " " + player.username;
			player.send(texte1);
			player.send(texte2);
			player.send("Vous pouvez d'une part muter X avec la commande \"!mute X\" ou tuer Y avec la commande \"!tuer Y\", et d'autre part paralyser Z avec la commande \"!para Z\"."); 
			player.send("Vous pouvez aussi discuter entre vous, je transmettrai ce que vous me direz aux autres mutants.");
			//player.send("Vous avez une minute.");
			player.send("Vous avez "+param.TMUT+" secondes.");
		}
	}
	resume += ".\n";
	setTimeout(function(jour1){ if (jour == jour1) phaseMED(message); },param.TMUT*1000,jour);
}

function messageMUT(message) {
	if (message.author.etat.code == "M" && message.author.vivant) {
		for (player of players) {
			if (player.etat.code == "M" && player.username != message.author.username && player.vivant) {
				player.send(message.author.username+" dit : "+message.content);
			}
		}
		if (message.content.indexOf("!mute ") == 0) {
			username = message.content.substr(6);
			console.log("mute "+username);
			faire(message,username,function(player) {
				for (player1 of players) {
					if (player1.etat.code == "M" && player1.vivant) {
						player1.send(message.author.username+" a décidé de muter "+username+".");
					}					
				}
				mute = player;
				kill = null;
				if (para) {
					phaseMED(message);
				}
			});
		} else if (message.content.indexOf("!tuer ") == 0) {
			username = message.content.substr(6);
			console.log("tuer "+username);
			faire(message,username,function(player) {
				for (player1 of players) {
					if (player1.etat.code == "M" && player1.vivant) {
						player1.send(message.author.username+" a décidé de tuer "+username+".");
					}					
				}
				kill = player;
				mute = null;
				if (para) {
					phaseMED(message);
				}
			});
		} else if (message.content.indexOf("!para ") == 0) {
			username = message.content.substr(6);
			console.log("para "+username);
			faire(message,username,function(player) {
				for (player1 of players) {
					if (player1.etat.code == "M" && player1.vivant) {
						player1.send(message.author.username+" a décidé de paralyser "+username+".");
					}					
				}
				para = player;
				if (mute || kill) {
					phaseMED(message);
				}
			});
		}
	}
}

function phaseMED(message) {
	if (gameOver(message)) {
		return;
	}
	if (phase != "MUT") {
		return;
	}
	console.log("Phase MED");
	/*
	console.log("mute");
	console.log(mute);
	console.log("kill");
	console.log(kill);
	console.log("para");
	console.log(para);
	*/
	for (player of players) {
		if (player.etat.code == "M" && player.vivant) {
			if (mute) {
				player.send("Les mutants ont décidé de muter "+mute.username+".");
			}
			if (kill) {
				player.send("Les mutants ont décidé de tuer "+kill.username+".");
			}
			if (para) {
				player.send("Les mutants ont décidé de paralyser "+para.username+".");
			}
			player.send("Rendormez-vous les mutants.");
		}
	}
	if (mute) {
		if (mute.genome.code == "R") {
			mute.send("Les mutants n'ont pas réussi à te muter car tu es "+mute.genome.nom+".");
			resume += "Les mutants n'ont pas réussi à muter " + mute.username + " car il est " + mute.genome.nom + ".\n";
		} else {
			mute.etat = mutant;
			mute.send("Tu as été muté.");
			resume += "Les mutants ont muté " + mute.username + ".\n";
		}
	}
	if (kill) {
		//kill.vivant = false;
		tuer(kill,message);
		tues.push(kill);
		kill.send("Tu as été tué.");
		resume += "Les mutants ont tué " + kill.username + ".\n";
	}
	if (para) {
		para.para = true;
		para.send("Tu as été paralysé.");
		resume += "Les mutants ont paralysé " + para.username + ".\n";
	}
	phase = "MED";
	kill = null;
	for (player of players) {
		player.soin = false;
		player.patient = null;
	}
	phrase1 = "C'est à vous, les médecins réveillés sont :";
	phrase2 = "Les autres membres d'équipage sont :";
	for (player of players) {
		if (player.vivant) {
			if (player.role.code == "MED") {
				phrase1 = phrase1 + " " + player.username;
			} else {
				phrase2 = phrase2 + " " + player.username;
			}
		}
	}
	med = [];
	resume += "Les médecins se réveillent :";
	for (player of players) {
		if (player.role.code == "MED" && player.vivant && !player.para && player.etat.code == "S") {
			resume += " " + player.username;
			med.push(player);
			player.send(phrase1);
			player.send(phrase2);
			player.send("Chaque médecin éveillé peut soigner X avec la commande \"!soin X\", ou tous les médecins peuvent tuer le joueur Y avec la commande \"!tuer Y\".");
			player.send("Vous pouvez aussi discuter entre vous, je transmettrai ce que vous me direz à l'autre médecin éveillé.");
			//player.send("Vous avez une minute.");
			player.send("Vous avez "+param.TMED+" secondes.");
		}
	}
	resume += ".\n";
	if (med.length == 0) {
		phaseENQ(message);
	} else {
		setTimeout(function(jour1){ if (jour == jour1) phaseENQ(message); },param.TMED*1000,jour);			
	}
}

function messageMED(message) {
	//console.log(message.author);
	if (message.author.vivant && message.author.role.code == "MED" && !message.author.para && message.author.etat.code == "S") {
		for (player of players) {
			if (player.vivant && player.role.code == "MED" && !player.para && player.etat.code == "S" && player.username != message.author.username) {
				player.send(message.author.username+" dit : "+message.content);
			}
		}
		if (message.content.indexOf("!soin ") == 0) {
			username = message.content.substr(6);
			console.log("soin "+username);
			faire(message,username,function(player) {
				for (player1 of players) {
					if (player1.vivant && player1.role.code == "MED" && !player1.para && player1.etat.code == "S") {
						player1.send(message.author.username+" a décidé de soigner "+username+".");
					}					
				}
				message.author.patient = player;
				if (!med.find(player => player.patient == null)) {
					phaseENQ(message);
				}
			});
		} else if (message.content.indexOf("!tuer ") == 0) {
			username = message.content.substr(6);
			console.log("tuer "+username);
			faire(message,username,function(player) {
				for (player1 of players) {
					if (player1.vivant && player1.role.code == "MED" && !player1.para && player1.etat.code == "S") {
						player1.send(message.author.username+" a décidé de tuer "+username+".");
					}					
				}
				kill = player;
				phaseENQ(message);
			});
		} 
	}
}

function phaseENQ(message) {
	if (gameOver(message)) {
		return;
	}
	if (phase != "MED") {
		return;
	}
	console.log("Phase ENQ");
	for (player of players) {
		if (player.vivant && player.role.code == "MED" && !player.para && player.etat.code == "S") {
			if (kill) {
				player.send("Les médecins ont décidé de tuer "+kill.username+".");
			}
			for (m in med) {
				if (m.patient) {
					player.send(m.username+" a décidé de soigner "+m.patient.username+".");
				}
			}	
			player.send("Rendormez-vous les médecins.");
		}
	}
	if (kill) {
		//kill.vivant = false;
		tuer(kill,message);
		tues.push(kill);
		kill.send("Tu as été tué.");
		resume += "Les médecins ont tué " + kill.username + ".\n";
	}
	for (m of med) {
		if (m.patient) {
			if (m.patient.genome.code == "H") {
				m.patient.send("Les médecins n'ont pas réussi à te soigner car tu es "+m.patient.genome.nom+".");
				resume += "Les médecins n'ont pas réussi à soigner " + m.patient.username + " car il est " + m.patient.genome.nom + ".\n";
			} else {
				m.patient.send("Tu as été soigné.");
				resume += "Les médecins ont soigné " + m.patient.username + ".\n";
			}
		}
	}
	phase = "ENQ";
	
	// Informaticien
	nombre = 0;
	for (player of players) {
		if (player.vivant && player.etat.code == "M") {
			nombre++;
		}
	}
	for (player of players) {
		if (player.vivant && !player.para && player.role.code == "INF") {
				player.send("Il y a "+nombre+" mutant"+(nombre>1?"s":"")+".");
				resume += "L'informaticien apprend qu'il y a " + nombre + (nombre>1?"s":"")+".\n";
		}
	}
	
	phrase1 = "Les membres de l'équipage sont :";
	for (player of players) {
		if (player.vivant) {
			phrase1 = phrase1 + " " + player.username;
		}
	}
	enq = [];
	for (player of players) {
		if (player.vivant && !player.para && (param.MUTROLE || player.etat.code != "M") && ["PSY","GEN","REC"].includes(player.role.code)) {
			enq.push(player);
			player.cible = null;
			//player.send("C'est à toi, tu as une minute.");
			player.send("C'est à toi, tu as "+param.TENQ+" secondes.");
			player.send(phrase1);
			player.send("Qui veux-tu examiner ?");			
		}
	}
	if (enq.length > 0) {
		setTimeout(function(jour1){ if (jour == jour1) phaseJOUR(message); },param.TENQ*1000,jour);
	} else {
		phaseJOUR(message);
	}
}

function messageENQ(message) {
	console.log("messageENQ");
	//console.log(players);
	if (message.author.vivant && !message.author.para && (param.MUTROLE || message.author.etat.code != M) && message.author.cible == null) {
		username = message.content;
		if (message.author.role.code == "PSY") {
			faire(message,username,function(player) {
				message.author.cible = player;
				message.author.send(username + " est " + player.etat.nom + ".");
				resume += "Le " + message.author.role.nom + " " + message.author.username + " apprend que " + player.username + " est " + player.etat.nom + ".\n";
			});
		} else if (message.author.role.code == "GEN") {
			faire(message,username,function(player) {
				message.author.cible = player
				message.author.send(username + " est " + player.genome.nom + ".");
				resume += "Le " + message.author.role.nom + " " + message.author.username + " apprend que " + player.username + " est " + player.genome.nom + ".\n";
			});
		} else if (message.author.role.code == "REC") {
			faire(message,username,function(player) {
				message.author.cible = player;
				message.author.send(username + " est " + player.role.nom + ".");
				resume += "Le " + message.author.role.nom + " " + message.author.username + " apprend que " + player.username + " est " + player.role.nom + ".\n";
			});
		}
		if(!enq.find(player => player.cible == null)) {
			phaseJOUR(message);
		}
	}
}

function phaseJOUR(message) {
	if (gameOver(message)) {
		return;
	}
	if (phase != "ENQ") {
		return;
	}
	console.log("Phase JOUR");
	for (player of players) {
		if (player.vivant && !player.para && (param.MUTROLE || player.etat.code != "M") && ["PSY","GEN","REC"].includes(player.role.code)) {
			player.send("Rendors-toi.");
		}
	}
	
	phase = "JOUR";

	nvotesblancs = 0;
	for (player of players) {
		player.vote = null;
		player.nvotes = 0;
	}

	// phrase1 = "C'est le jour.\n";
	phrase1 = "";
	for (player of tues) {
		phrase1 += player.username + " a été tué, il était " + player.role.nom + " " + player.genome.nom + " " + player.etat.nom + ".\n";
	}
	phrase1 += "Vous pouvez voter contre X en tapant la commande \"!vote X\", \"!vote blanc\" si vous ne voulez tuer personne, ou \"!vote abstention\" si vous vous abstenez.\n";
	phrase1 += "Les membres d'équipage encore en vie sont :";
	for (player of players) {
		if (player.vivant) {
			phrase1 += " " + player.username;
		}
	}
	//phrase1 += "\nVous avez une minute.";
	phrase1 += "\nVous avez "+param.TJOUR+" secondes.";
	// setTimeout(function() { channel.send(phrase1, { tts : true }); }, 1000);
	// setTimeout(function() { sayall("C'est le jour."); writeall(phrase1); }, 1000);
	sayall("C'est le jour.");
	//writeall("AVANT");
	writeall(phrase1);
	//writeall("APRES");
	for (player of players) {
		if (player.vivant) {
			//player.send(phrase1);
			player.send("Je te rappelle que tu es actuellement "+player.etat.nom+".");
		}
	}

	resume += "\nJOUR " + jour + ":\n";
	for (player of players) {
		resume += player.username + " est " + player.role.nom + " " + player.genome.nom + " " + player.etat.nom + ".\n";
	}

	setTimeout(function(jour1) { 
        if (jour1 == jour) {
            writeall("Il ne reste plus que "+param.RJOUR+" secondes.");
        }
    }, (param.TJOUR-param.RJOUR)*1000, jour);

	setTimeout(function(jour1) { if (jour1 == jour) phaseSOIR(message); },param.TJOUR*1000,jour);
	
}

function messageJOUR(message) {
	if (message.author.vivant) {
		console.log("message:"+message.content+".");
		if (message.content == "!vote blanc") {
			message.author.vote = "blanc";
			message.reply("Tu as voté blanc.");
			console.log("C'est un vote blanc.");
        } else if (message.content == "!vote abstention") {
            message.author.vote = "abstention";
            message.reply("Tu t'abstiens.");
            console.log("C'est une abstention.");
		} else if (message.content.indexOf("!vote ") == 0) {
			console.log("Ce n'est pas un vote blanc.");
			username = message.content.substr(6);
			console.log("vote "+username);
			faire(message,username,function(player) {
				message.reply("Tu as voté contre "+player.username+".");
				message.author.vote = player;
			});
		} 
		if (!players.find(player => player.vote == null)) {
			phaseSOIR(message);
		}
	}
}

function phaseSOIR(message) {
	if (gameOver(message)) {
		return;
	}
	if (phase != "JOUR") {
		return;
	}
	console.log("Phase SOIR");
	
	phase = "SOIR";

	for (player of players) {
		if (player.vote == 'blanc') {
			nvotesblancs++;
		} else if (player.vote && player.vote != 'abstention') {
			player.vote.nvotes++;
		}
	}

	phrase1 = "Résultat des votes :\n";
	phrase1 += " " + nvotesblancs + " vote" + (nvotesblancs>1?"s":"") + " blancs\n";
	for (player of players) {
		if (player.vivant) {
			phrase1 += " " + player.nvotes + " vote" + (player.nvotes>1?"s":"") + " contre " + player.username + "\n";
		}
	}
	writeall(phrase1);
	resume += phrase1;

	maxvotes = nvotesblancs;
	for (player of players) {
		if (player.nvotes > maxvotes) {
			maxvotes = player.nvotes;
		}
	}

	accuses = [];
	for (player of players) {
		if (player.nvotes >= maxvotes) {
			accuses.push(player);
		}
	}

	exaequo = false;
	if (accuses.length == 0) {
		writeall("Les votes blancs sont majoritaires, personne n'est tué.");
		resume += "Les votes blancs sont majoritaires, personne n'est tué.\n";
	} else if (accuses.length == 1 && nvotesblancs < maxvotes) {
		//accuses[0].vivant = false;
		tuer(accuses[0],message);
		writeall("Il y a une majorité de votes contre " + accuses[0].username + ", il est tué.");
		resume += "Il y a une majorité de votes contre " + accuses[0].username + ", il est tué.\n"
	} else {
		exaequo = true;
		phrase1 = "Le capitaine " + players[capitaine].username + " doit choisir entre :";
		if (nvotesblancs == maxvotes) {
			phrase1 += " blanc";
		}
		for (player of accuses) {
			phrase1 += " " + player.username;
		}
		//phrase1 += "\nIl a une minute pour éliminer X en tapant la commande \"!elim X\".";
		phrase1 += "\nIl a "+param.TSOIR+" secondes pour éliminer X en tapant la commande \"!elim X\".";
		writeall(phrase1);
		setTimeout(function(jour1) { if (jour == jour1) phaseMUT(message); }, param.TSOIR*1000,jour);
		return;
	}
	
	phaseMUT(message);

}

function messageSOIR(message) {
	if (exaequo && message.author.vivant && message.author.capitaine) {
		if (message.content.indexOf("!elim ") == 0) {
			username = message.content.substr(6);
			console.log("elim "+username);
			if (nvotesblancs == maxvotes && username == "blanc") {
				writeall("Le capitaine a décidé de ne tuer personne.");
				resume += "Le capitaine a décidé de ne tuer personne.\n";
				phaseMUT(message);
			} else {
				player = accuses.find(player => player.username == username && player.vivant);
				//console.log(player);
				if (player) {
					//player.vivant = false;
					tuer(player,message);
					writeall("Le capitaine a décidé d'éliminer "+player.username+".");
					resume += "Le capitaine a décidé d'éliminer "+player.username+".\n";
					phaseMUT(message);
				} else {
					message.reply(username + " ne fait pas partie des accusés.");
				}
			}
		}
	}
}
