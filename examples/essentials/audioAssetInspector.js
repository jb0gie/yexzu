app.configure([
  {
    key: 'audioFile',
    type: 'file',
    kind: 'audio',
    label: 'Audio File',
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
  console.log('[AudioAssetInspector] Asset URL:', props.audioFile.url)
  console.log('[AudioAssetInspector] Filename:', props.audioFile.name)
}

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
    console.log('[AudioAssetInspector] Asset URL:', props.audioFile.url)
    console.log('[AudioAssetInspector] Filename:', props.audioFile.name)
  }
})

app.on('destroy', () => {
  audio.stop()
})
