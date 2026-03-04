app.configure([
  {
    key: 'audioFile',
    type: 'file',
    kind: 'audio',
    label: 'Audio File',
  },
  {
    key: 'showAssetUrl',
    type: 'toggle',
    label: 'Show Asset URL (for copying)',
    trueLabel: 'Show',
    falseLabel: 'Hide',
    initial: true,
  },
])

if (!world.isClient) return

const audio = app.create('audio', {
  src: props.audioFile?.url || null,
  loop: true,
})

app.add(audio)

const container = app.create('ui', {
  space: 'screen',
  position: [0.5, 0.1, 0],
  width: 0.95,
  height: 0.25,
  backgroundColor: 'rgba(0,0,0,0.85)',
  padding: 10,
})

const title = app.create('uitext', {
  value: 'Audio Asset Inspector',
  fontSize: 18,
  color: '#ffffff',
  bold: true,
})

const filenameLabel = app.create('uitext', {
  value: 'Filename: (none)',
  fontSize: 14,
  color: '#aaaaaa',
  position: [0, 0.06, 0],
})

const urlLabel = app.create('uitext', {
  value: 'Asset URL: (none)',
  fontSize: 12,
  color: '#fbbf24',
  position: [0, 0.12, 0],
})

const hint = app.create('uitext', {
  value: 'Copy the Asset URL above to use in other apps',
  fontSize: 12,
  color: '#10b981',
  position: [0, 0.18, 0],
})

container.add(title)
container.add(filenameLabel)
container.add(urlLabel)
container.add(hint)

function updateDisplay() {
  if (!props.audioFile) {
    filenameLabel.value = 'Filename: (none)'
    urlLabel.value = 'Asset URL: (none)'
    container.active = false
    return
  }

  container.active = true
  filenameLabel.value = `Filename: ${props.audioFile.name}`

  if (props.showAssetUrl) {
    urlLabel.value = `Asset URL: ${props.audioFile.url}`
    urlLabel.active = true
    hint.active = true
  } else {
    urlLabel.active = false
    hint.active = false
  }
}

app.add(container)

const playAction = app.create('action', {
  label: 'Play/Pause',
  distance: 5,
  duration: 0.2,
  onTrigger: () => {
    if (!props.audioFile?.url) return
    if (audio.isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
  },
})

app.add(playAction)

app.on('props', () => {
  if (props.audioFile?.url) {
    audio.src = props.audioFile.url
  }
  updateDisplay()
})

updateDisplay()

app.on('destroy', () => {
  audio.stop()
})
