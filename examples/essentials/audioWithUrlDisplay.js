app.configure([
  {
    key: 'audioFile',
    type: 'file',
    kind: 'audio',
    label: 'Audio File',
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

// Log the asset URL so you can copy it to other apps
if (props.audioFile?.url) {
  console.log('[AudioWithUrlDisplay] Asset URL:', props.audioFile.url)
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
  },
})

app.add(playAction)

app.on('props', () => {
  if (props.audioFile?.url) {
    audio.src = props.audioFile.url
    console.log('[AudioWithUrlDisplay] Asset URL:', props.audioFile.url)
    if (props.autoPlay && !audio.isPlaying) {
      audio.play()
    }
  }
})

if (props.audioFile?.url && props.autoPlay) {
  audio.play()
}

app.on('destroy', () => {
  audio.stop()
})
