// #region config
app.configure([
	{
		type: 'file',
		kind: 'audio',
		key: 'song0',
		label: 'a song',
		hint: 'add some music'
	},
	{
		type: 'section',
		key: 'signalsSection',
		label: 'Song info'
	},
	{
		key: 'songName',
		type: 'text',
		label: 'Song Name',
		initial: '',
		hint: 'what\'s the song name?'
	},
	{
		key: 'songArtist',
		type: 'text',
		label: 'Artist Name',
		initial: '',
		hint: 'who is the artist?'
	},
	{
		key: 'songAlbum',
		type: 'text',
		label: 'Album Name',
		initial: '',
		hint: 'what\'s the album called?'
	},
	{
		key: 'songGenre',
		type: 'text',
		label: 'Song Genre',
		initial: '',
		hint: 'what\'s type of genre?'
	},

])
// #endregion

const viynl = app.get('NoobVinyl')

// Log the asset URL so you can copy it to other apps
if (props.song0?.url) {
  console.log('[BoltVinyl] Song asset URL:', props.song0.url)
}

const ui = app.create('ui', {
	width: 60,
	height: 70,
	position: [0.01, 0.9, 0.15],
	// backgroundColor: 'red',
	alignItems: 'center',
	justifyContent: 'center'
})
const text = app.create('uitext', {
	value: props.songName,
	textAlign: 'center',
	fontSize: 11,
	color: 'white'
})
ui.add(text)
//TODO: add more ui for other song info

app.add(ui)