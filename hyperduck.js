const SEND_RATE = 1 / 8
const MOVEMENT_SPEED = 1

if (world.isClient) {
    const initialPosition = {x: app.position.x, y: app.position.y, z: app.position.z}
    
    // UI Setup
    const ui = app.create('ui')
    ui.width = 200
    ui.height = 50
    ui.backgroundColor = 'rgba(0, 0, 0, 0.7)'
    ui.position.set(0, 2, 0)
    ui.billboard = 'full'
    ui.justifyContent = 'center'
    ui.alignItems = 'center'

    const label = app.create('uitext')
    label.value = 'I am hyperduck\n⚡🦆'
    label.color = '#ffffff'
    label.fontSize = 24
    label.textAlign = 'center'
    ui.add(label)

    // Action button
    const action = app.create('action')
    action.label = 'Interact'
    action.position.set(0, 1, 0)

    // Create position interpolator
    const newPosition = new LerpVector3(app.position, SEND_RATE)

    action.onTrigger = () => {
        app.send('cube:move')
    }

    // Listen for UI updates
    app.on('uitext:update', (text) => {
        label.value = text
    })

    app.on('action:update', (text) => {
        action.label = text
    })

    // Listen for position updates
    app.on('cube:position', (data) => {
        newPosition.pushArray(data)
    })

    // Smooth position updates
    app.on('update', (delta) => {
        newPosition.update(delta)
    })

    app.add(action)
    app.add(ui)
}

if (world.isServer) {
    const MAX_Y = app.position.y + 1
    const MIN_Y = app.position.y
    let movingUp = true
    let isMoving = false
    let lastUpdate = 0
    let targetPosition = MIN_Y
    let isMoved = false

    app.on('cube:move', () => {
        if (!isMoving) {
            isMoving = true
            movingUp = app.position.y <= MIN_Y
            targetPosition = movingUp ? MAX_Y : MIN_Y
            
            // Send updates to all clients
            app.send('uitext:update', isMoved ? 'hyper⚡' : 'duck🦆')
            app.send('action:update', isMoved ? 'hyperduck fly' : 'hyperduck chill')
        }
    })

    app.on('update', delta => {
        if (!isMoving) return

        lastUpdate += delta
        
        // Calculate movement
        const movement = MOVEMENT_SPEED * delta * (movingUp ? 1 : -1)
        app.position.y = Math.max(MIN_Y, Math.min(MAX_Y, app.position.y + movement))

        // Check if movement is complete
        if ((movingUp && app.position.y >= targetPosition) || (!movingUp && app.position.y <= targetPosition)) {
            app.position.y = targetPosition
            isMoving = false
            isMoved = movingUp
            
            // Update UI text for all clients
            app.send('uitext:update', movingUp ? '⚡🦆' : 'I am hyperduck\n⚡🦆')
            app.send('action:update', movingUp ? 'hyperduck chill' : 'hyperduck fly')
        }

        // Send position updates at fixed rate
        if (lastUpdate >= SEND_RATE) {
            app.send('cube:position', app.position.toArray())
            lastUpdate = 0
        }
    })
}