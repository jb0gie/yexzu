app.configure([
  {
    key: 'audioFile',
    type: 'file',
    kind: 'audio',
    label: 'Audio File',
  },
  {
    key: 'showUrl',
    type: 'toggle',
    label: 'Show Asset URL',
    trueLabel: 'Show',
    falseLabel: 'Hide',
    initial: false,
  },
  {
    key: 'autoPlay',
    type: 'toggle',
    label: 'Auto Play',
    initial: false,
  },
])

if (!world.isClient) return

const audio = app.create('audio', {
  src: props.audioFile?.url || null,
  loop: true,
})

app.add(audio)

let statusUI = null
let urlUI = null

function updateUI() {
  if (statusUI) {
    app.remove(statusUI)
    statusUI = null
  }
  if (urlUI) {
    app.remove(urlUI)
    urlUI = null
  }

  statusUI = app.create('ui', {
    space: 'screen',
    position: [0.5, 0.05, 0],
    width: 0.4,
    height: 0.08,
    backgroundColor: 'rgba(0,0,0,0.7)',
  })

  const statusText = app.create('uitext', {
    value: props.audioFile?.url
      ? audio.isPlaying
        ? 'Playing'
        : 'Ready'
      : 'No audio file',
    fontSize: 16,
    color: audio.isPlaying ? '#10b981' : '#cccccc',
  })

  statusUI.add(statusText)
  app.add(statusUI)

  if (props.showUrl && props.audioFile?.url) {
    urlUI = app.create('ui', {
      space: 'screen',
      position: [0.5, 0.15, 0],
      width: 0.9,
      height: 0.12,
      backgroundColor: 'rgba(0,0,0,0.8)',
    })

    const urlText = app.create('uitext', {
      value: props.audioFile.url,
      fontSize: 12,
      color: '#fbbf24',
    })

    urlUI.add(urlText)
    app.add(urlUI)
  }
}

const playAction = app.create('action', {
  label: 'Play/Pause Audio',
  distance: 5,
  duration: 0.2,
  onTrigger: () => {
    if (!props.audioFile?.url) return
    if (audio.isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    updateUI()
  },
})

app.add(playAction)

app.on('props', () => {
  if (props.audioFile?.url) {
    audio.src = props.audioFile.url
    if (props.autoPlay && !audio.isPlaying) {
      audio.play()
    }
  }
  updateUI()
})

if (props.audioFile?.url && props.autoPlay) {
  audio.play()
}

updateUI()

app.on('destroy', () => {
  audio.stop()
})
