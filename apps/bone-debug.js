({
  init() {
    console.log('🦴 VRM Bone Debug Tool - Press B to toggle bone visibility')
    console.log('🔍 Red=X axis, Green=Y axis, Blue=Z axis for each bone')
  },

  update(delta) {
    const control = app.control()
    if (!control) return

    // Toggle bone visibility with B key
    if (control.keyB) {
      // Get the local player entity
      const player = world.entities.get(app.playerId)
      if (!player || !player.vrm || !player.vrm.raw) {
        console.log('❌ No VRM found on player')
        return
      }

      const vrm = player.vrm

      // Toggle bone visibility (simple toggle, not held)
      if (!this.boneToggleState) {
        this.boneToggleState = true
        this.isVisible = !this.isVisible

        if (this.isVisible) {
          console.log('🦴 Showing bone helpers - Move around to see spring bone physics!')
          vrm.setBonesVisible(true)
        } else {
          console.log('🙈 Hiding bone helpers')
          vrm.setBonesVisible(false)
        }
      }
    } else {
      this.boneToggleState = false
    }

    // Show help info
    if (control.keyH && !this.helpShown) {
      this.helpShown = true
      console.log(`
🦴 VRM Bone Debug Controls:
B - Toggle bone visibility on/off
🔍 Look for:
  - Small axis helpers at each bone position
  - Spring bones will have more movement/wiggle
  - Non-spring bones will be rigid
  - Red=X, Green=Y, Blue=Z axes
      `)
    } else if (!control.keyH) {
      this.helpShown = false
    }
  },
})