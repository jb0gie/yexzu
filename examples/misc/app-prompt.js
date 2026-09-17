// ponytail: server-only LLM roundtrip via existing ServerAI
if (world.isServer) {
  app.on('ask', async data => {
    const text = await app.prompt(data?.query || 'say hi in one sentence')
    app.send('answer', text)
  })
}

if (world.isClient) {
  const action = app.create('action', {
    label: 'Ask',
    position: [0, 1, 0],
    onTrigger: () => app.send('ask', { query: 'one sentence greeting' }),
  })
  app.add(action)
  app.on('answer', text => console.warn('[prompt]', text))
}
