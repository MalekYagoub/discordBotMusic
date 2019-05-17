const Discord = require('discord.js')
const ytdl = require('ytdl-core')
const configToken = require('./configToken')
const ytbSearch = require('youtube-search')
const urlRegex = require('url-regex');

const ytSearchOpts = {
	maxResults: 1,
	key: configToken.youtubeApiKey
}

class Bot {
	constructor () {
		this.client  = new Discord.Client()
		this.dispatcher = null
		this.ytMusics = []
		this.ytUrls = []

		this.client.login(configToken.token)

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
				console.log('------ Song skipped ------')
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
				// On récupère l'url de la vidéo ou la recherche de vidéo
				let ytVideoString = message.content.split(" ").slice(1).join(" ")

				// Si c'est direct une url youtube, on ajoute la musique
				if (urlRegex({exact: true}).test(ytVideoString)) {
					this.addMusicFromUrl(ytVideoString, message)
				} else {
					// Sinon, on cherche une vidéo qui correspond à la recherche et envoit l'url correspondant à la fonction d'ajout de musique
					ytbSearch(ytVideoString, ytSearchOpts, (error, result) => {
						if (error) {
							// ytb search a pas réussi a trouver de vidéos donc erreur
							console.log(error)
							message.reply(':warning: Une erreur est survenue, ptet une mauvaise recherche :warning:')
						}

						if (result.length > 0) {
							this.addMusicFromUrl(result[0].link, message, true)
							console.log(result)
						} else {
							message.reply(':warning: Aucun résultat pour cette recherche :warning:')
						}
					});
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

			if (/\/volume .+/.test(message.content) && this.dispatcher) {
				const volumeNumber = message.content.split(" ")[1]
				this.dispatcher.setVolume(volumeNumber)
			}

		})
	}

	addMusicFromUrl (url, message, showUrl) {
		try {
			// On transforme la vidéo en readable Stream
			const ytVideoStream = ytdl(url, {filter : 'audioonly'})
			let urlToShow = ''

			// On l'ajoute à la playlist
			this.ytUrls.push(url)
			this.ytMusics.push(ytVideoStream)

			// Afficher ou pas l'url dans le message, on l'affiche que lorsque le user a pas mit un lien youtube car discord affiche la thumbnail dans ce cas là et ça ferait un doublon
			if (showUrl) {
				urlToShow = url
			}

			message.reply('La musique a bien été rajouté a la playlist **(position: ' + this.ytMusics.length + ')** ' + urlToShow)
		}
		catch (error) {
			// L'url est mauvaise et ytdl n'a pas pu convertir la vidéo en readable stream
			console.log(error)
			message.reply(':warning: Une erreur est survenue, ptet une mauvaise URL ou un espace en trop :warning:')
		}
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
	}
}

let bot = new Bot()