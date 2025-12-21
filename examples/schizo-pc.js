const screen = app.get('PCScreen')

app.configure([
  {
    key: 'url',
    type: 'text',
    label: 'URL',
    initial: '',
    placeholder: 'https://example.com',
    description: 'The URL to open when clicked (opens in new tab)',
  },
])

if (world.isClient) {
  const action = app.create('action', {
    distance: 1,
    onTrigger: () => {
      if (props.url) {
        world.open(props.url, true) //Open in new tab
      }
    },
  })
  screen.add(action)
}

app.on('update', dt => {
  screen.textureX += dt * 0.1
})
