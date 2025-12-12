# Fireball Elemental Item Test Guide

## How It Works
The fireball now follows this clean pattern:
1. Remove Block (if it exists)
2. Create visual fireball orb with particles
3. Add pickup action
4. Wrap with elemental inventory system

## Testing Steps

### Test 1: Visual Appearance
1. Drop `elemental-item-fireball.js` in your world
2. Expected: Red flaming orb appears immediately (no Block cube)

### Test 2: Non-Admin Pickup
1. As non-admin, walk close to orb
2. Expected: "Pick Up Fireball" prompt appears
3. Press **E**
4. Expected: Orb disappears, added to inventory

### Test 3: Admin Give
1. Select fireball in editor
2. Click "Give to Local Player"
3. Expected: Fireball appears in inventory immediately

### Test 4: Shooting
1. Open inventory (**B** key)
2. Drag fireball to hotbar
3. Press hotbar key to equip
4. Left-click to shoot
5. Expected: Projectile fires with trail, explosion on impact

## Troubleshooting

**If Block still visible:**
- Check console for "[fireball] Removed Block"
- Try refreshing the page

**If no pickup action:**
- Check console for errors
- Verify you're not in admin mode (god mode)

**If can't shoot:**
- Ensure fireball is equipped (not just in inventory)
- Check you have pointer lock (click in game)
- Verify shoot animation is configured (optional)
