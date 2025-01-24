export class Entity {
  constructor(world, data, local) {
    this.world = world
    this.data = data

    // if spawned locally we need to broadcast to server/clients
    if (local) {
      this.world.network.send('entityAdded', data)
    }
  }

  modify(data) {
    // called when remote receives entity changes
    // or applying local changes
  }

  onEvent(name, data, clientId) {
    // ...
  }

  serialize() {
    return this.data
  }

  destroy(local) {
    // ...
  }
}
