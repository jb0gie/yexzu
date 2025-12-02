export default function () {
  return ({ app, world }) => {
    let puzzleSolved = false
    let doorOpened = false

    app.on('init', () => {
      console.log('[Grabbable Demo] Initializing puzzle system')

      const table = app.create('prim', {
        type: 'box',
        size: [4, 0.1, 3],
        position: [0, 0.5, -3],
        color: '#8B4513',
      })

      const snapPoint1 = app.create('snap', {
        position: [-1, 1.1, -3],
      })

      const snapPoint2 = app.create('snap', {
        position: [0, 1.1, -3],
      })

      const snapPoint3 = app.create('snap', {
        position: [1, 1.1, -3],
      })

      const puzzlePiece1 = app.create('grabbable', {
        position: [-2, 1.5, -3],
        grabDistance: 10,
        snapDistance: 1.5,
        snapToPoints: true,
        returnOnRelease: false,
        snapSignal: 'puzzle:piece1-snapped',
        unsnapSignal: 'puzzle:piece1-unsnapped',
        rigidbodyTypeOnSnap: 'static',
        rigidbodyTypeOnRelease: 'dynamic',
        onGrab: (grabbable, player) => {
          console.log('[Puzzle Piece 1] Grabbed by player:', player.data.name)
          world.chat(`Puzzle piece 1 grabbed by ${player.data.name}`)
        },
        onSnap: (grabbable, snapPoint) => {
          console.log('[Puzzle Piece 1] Snapped to position!')
          world.chat('Puzzle piece 1 locked in place!')
          checkPuzzleComplete()
        },
        onUnsnap: grabbable => {
          console.log('[Puzzle Piece 1] Removed from snap point')
          world.chat('Puzzle piece 1 removed')
          puzzleSolved = false
        },
      })

      const piece1Mesh = app.create('prim', {
        parent: puzzlePiece1,
        type: 'box',
        size: [0.3, 0.3, 0.3],
        color: '#FF0000',
      })

      const piece1Body = app.create('rigidbody', {
        parent: puzzlePiece1,
        type: 'dynamic',
        mass: 0.5,
      })

      const puzzlePiece2 = app.create('grabbable', {
        position: [-2.5, 1.5, -3],
        grabDistance: 10,
        snapDistance: 1.5,
        snapToPoints: true,
        returnOnRelease: false,
        snapSignal: 'puzzle:piece2-snapped',
        unsnapSignal: 'puzzle:piece2-unsnapped',
        rigidbodyTypeOnSnap: 'static',
        rigidbodyTypeOnRelease: 'dynamic',
        onGrab: (grabbable, player) => {
          console.log('[Puzzle Piece 2] Grabbed by player:', player.data.name)
          world.chat(`Puzzle piece 2 grabbed by ${player.data.name}`)
        },
        onSnap: (grabbable, snapPoint) => {
          console.log('[Puzzle Piece 2] Snapped to position!')
          world.chat('Puzzle piece 2 locked in place!')
          checkPuzzleComplete()
        },
        onUnsnap: grabbable => {
          console.log('[Puzzle Piece 2] Removed from snap point')
          world.chat('Puzzle piece 2 removed')
          puzzleSolved = false
        },
      })

      const piece2Mesh = app.create('prim', {
        parent: puzzlePiece2,
        type: 'box',
        size: [0.3, 0.3, 0.3],
        color: '#00FF00',
      })

      const piece2Body = app.create('rigidbody', {
        parent: puzzlePiece2,
        type: 'dynamic',
        mass: 0.5,
      })

      const puzzlePiece3 = app.create('grabbable', {
        position: [-1.5, 1.5, -3],
        grabDistance: 10,
        snapDistance: 1.5,
        snapToPoints: true,
        returnOnRelease: false,
        snapSignal: 'puzzle:piece3-snapped',
        unsnapSignal: 'puzzle:piece3-unsnapped',
        rigidbodyTypeOnSnap: 'static',
        rigidbodyTypeOnRelease: 'dynamic',
        onGrab: (grabbable, player) => {
          console.log('[Puzzle Piece 3] Grabbed by player:', player.data.name)
          world.chat(`Puzzle piece 3 grabbed by ${player.data.name}`)
        },
        onSnap: (grabbable, snapPoint) => {
          console.log('[Puzzle Piece 3] Snapped to position!')
          world.chat('Puzzle piece 3 locked in place!')
          checkPuzzleComplete()
        },
        onUnsnap: grabbable => {
          console.log('[Puzzle Piece 3] Removed from snap point')
          world.chat('Puzzle piece 3 removed')
          puzzleSolved = false
        },
      })

      const piece3Mesh = app.create('prim', {
        parent: puzzlePiece3,
        type: 'box',
        size: [0.3, 0.3, 0.3],
        color: '#0000FF',
      })

      const piece3Body = app.create('rigidbody', {
        parent: puzzlePiece3,
        type: 'dynamic',
        mass: 0.5,
      })

      const door = app.create('prim', {
        type: 'box',
        size: [0.2, 3, 1.5],
        position: [5, 1.5, -3],
        color: '#654321',
      })

      const doorBody = app.create('rigidbody', {
        parent: door,
        type: 'static',
      })

      function checkPuzzleComplete() {
        const allSnapped = puzzlePiece1.isSnapped && puzzlePiece2.isSnapped && puzzlePiece3.isSnapped

        if (allSnapped && !puzzleSolved) {
          puzzleSolved = true
          console.log('[Puzzle] All pieces snapped! Puzzle solved!')
          world.chat('🎉 Puzzle solved! Door is unlocking...')

          setTimeout(() => {
            if (!doorOpened) {
              doorOpened = true
              door.position.x = 8
              world.chat('✅ Door opened! You can now proceed!')
              world.emit('puzzle:completed', { playerId: world.getPlayer()?.data?.id })
            }
          }, 1000)
        }
      }

      world.on('puzzle:piece1-snapped', data => {
        console.log('[World] Puzzle piece 1 snap signal received:', data)
      })

      world.on('puzzle:piece2-snapped', data => {
        console.log('[World] Puzzle piece 2 snap signal received:', data)
      })

      world.on('puzzle:piece3-snapped', data => {
        console.log('[World] Puzzle piece 3 snap signal received:', data)
      })

      world.on('puzzle:completed', data => {
        console.log('[World] Puzzle completed! Player:', data.playerId)
      })
    })

    app.on('destroy', () => {
      console.log('[Grabbable Demo] Cleaning up')
    })
  }
}
