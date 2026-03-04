app.configure([
  {
    key: 'audioFile',
    type: 'file',
    kind: 'audio',
    label: 'Audio File',
    description: 'Upload an audio file to play',
  },
  {
    key: 'autoPlay',
    type: 'switch',
    label: 'Auto Play on Load',
    options: [
      { label: 'Yes', value: 'enabled' },
      { label: 'No', value: 'disabled' },
    ],
    initial: 'disabled',
  },
  {
    key: 'audioVolume',
    type: 'range',
    label: 'Audio Volume',
    initial: 1,
    min: 0,
    max: 2,
    step: 0.1,
  },
  {
    key: 'loop',
    type: 'toggle',
    label: 'Loop Audio',
    initial: true,
  },
])

if (!world.isClient) return

const audio = app.create('audio', {
  src: props.audioFile?.url || null,
  loop: props.loop !== false,
  volume: props.audioVolume ?? 1,
})

app.add(audio)

// Log the asset URL so you can copy it to other apps
if (props.audioFile?.url) {
  console.log('[BoltViynl] Audio asset URL:', props.audioFile.url)
}

function startAudio() {
  if (!props.audioFile?.url) {
    console.log('[BoltViynl] No audio file configured')
    return
  }
  audio.play()
  if (playAction) {
    playAction.label = 'Stop Audio'
  }
}

function stopAudio() {
  audio.stop()
  if (playAction) {
    playAction.label = 'Start Audio'
  }
}

const playAction = app.create('action', {
  label: 'Start Audio',
  distance: 5,
  duration: 0.5,
  onTrigger: () => {
    if (audio.isPlaying) {
      stopAudio()
    } else {
      startAudio()
    }
  },
})

app.add(playAction)

app.on('props', () => {
  if (props.audioFile?.url) {
    audio.src = props.audioFile.url
    console.log('[BoltViynl] Audio asset URL:', props.audioFile.url)
    if (props.autoPlay === 'enabled' && !audio.isPlaying) {
      audio.play()
    }
  }
})

if (props.audioFile?.url && props.autoPlay === 'enabled') {
  startAudio()
}

app.on('destroy', () => {
  stopAudio()
})
