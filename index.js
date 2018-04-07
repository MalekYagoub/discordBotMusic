const Discord = require('discord.js')
const fs = require('fs')
// const client = new Discord.Client()
const ytdl = require('ytdl-core')

class Bot {
	constructor () {
		this.client  = new Discord.Client()
		this.dispatcher = null
		this.ytMusics = []
		this.ytUrls = []

		this.client.login('MzEyOTkzMTg3ODk3ODAyNzUy.C_jJLA.xXScjoKYGcwU0OYV4vhPndjpDIo')

		this.client.on('ready', () => {
			console.log('Connecté en tant que :' + this.client.user.tag)
		})

		this.client.on('message', message => {
			// Voice only works in guilds, if the message does not come from a guild,
			// we ignore it
			if (!message.guild) return

			// commande pour lancer la playlist
			if (message.content === '/play') {
				if (this.ytMusics.length > 0) {
					// Only try to join the sender's voice channel if they are in one themselves
					if (message.member.voiceChannel) {
						message.member.voiceChannel.join()
						.then(connection => { // Connection is an instance of VoiceConnection
							// On lance la première musique
							this.playMusic(connection, message)

							// on catch toutes les erreurs
							this.dispatcher.on('error', e => {
								console.log(e);
							});
						})
						.catch((error) =>  {
							console.log(error)
						})
					} else {
						message.reply('Rejoignez d\'abord un channel vocal')
					}
				} else {
					message.reply('Aucune musique dans la playlist')
				}
			}

			if (message.content === '/skip' && this.ytMusics.length > 0) {
				// Si il ya déjà un flux audio existant sinon on delete direct la musique
				console.log('on a tappé skip')
				if (this.dispatcher) {
					this.dispatcher.end()
				} else {
					message.channel.send(this.ytUrls[0] + " a bien été skippé")
					this.deleteCurrentMusic(message)
				}
			}

			if (message.content === '/leave' && message.member.voiceChannel && this.dispatcher) {
				this.dispatcher.pause()
				this.dispatcher = null
				message.member.voiceChannel.leave()
				message.reply('Bye')
			}

			if (/\/add .+/.test(message.content)) {
				// On récupère l'url de la vidéo
				const ytVideoString = message.content.split(" ")[1]
				try {
					// On transforme la vidéo en readable Stream
					const ytVideoStream = ytdl(message.content.split(" ")[1], {filter : 'audioonly'})
					// On l'ajoute à la playlist
					this.ytUrls.push(ytVideoString)
					this.ytMusics.push(ytVideoStream)
					message.reply('La musique a bien été rajouté a la playlist **(position: ' + this.ytMusics.length + ')**')
				}
				catch (error) {
					// L'url est mauvaise et ytdl n'a pas pu convertir la vidéo en readable stream
					console.log(error)
					message.reply('Une erreur est survenue, ptet une mauvaise URL ou un espace en trop')
				}
			}

			if (message.content === '/playlist') {
				if (this.ytMusics.length === 0) {
					message.reply('Aucune musique dans la playlist')
				} else {
					let i = 0
					let messageResponse = ""
					for (i; i < this.ytUrls.length; i++) {
						messageResponse += ":headphones: " + "**" + (i + 1) + "**" + "  :  " + this.ytUrls[i] + "\n"
					}
					message.reply("Playlist des musiques\n\n" + messageResponse)
				}
			}

			if (message.content === '/pause' && this.dispatcher) {
				// message.channel.send("Musique en pause")
				this.dispatcher.pause()
			}
			if (message.content === '/continue' && this.dispatcher) {
				// message.channel.send("Musique reprise")
				this.dispatcher.resume()
			}
		})
	}

	// Joue la premiere musique de l'array (se lance a chaque fois qu'une musique se termine est est supprimé de l'array)
	playMusic (connection, message) {
		this.dispatcher = connection.playStream(this.ytMusics[0])
		this.dispatcher.on('end', () => {
			// Quand une musique se termine, on la supprime de l'array et lance playMusic pour lancer la suivante
			this.deleteCurrentMusic(message)
			if (this.ytMusics.length > 0 && this.ytUrls.length > 0) this.playMusic(connection, message)
		})
		message.channel.send(':musical_keyboard: :musical_note: :musical_score:  En train de jouer ' + this.ytUrls[0] + " :musical_score: :musical_note: :musical_keyboard:")
	}

	deleteCurrentMusic (message) {
		this.ytMusics.splice(0, 1)
		this.ytUrls.splice(0, 1)
		if (this.ytMusics.length === 0 && this.dispatcher) {
			message.channel.send(":drum: **Playlist terminé** :drum: ")
			message.member.voiceChannel.leave()
			this.dispatcher = null
		}
		console.log('musique fini')
		console.log(this.ytUrls)
	}
}

var bot = new Bot()