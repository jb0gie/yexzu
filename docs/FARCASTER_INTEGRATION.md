# Farcaster Integration in Hyperfy

Your Hyperfy world now has **full Farcaster Mini App integration**, allowing users to build apps that deeply integrate with the Farcaster ecosystem!

## 🚀 What's Available

### Authentication & Identity
- **Automatic Farcaster login** - Users authenticate with their Farcaster accounts
- **Profile integration** - Access user's FID, username, display name, PFP, followers, etc.
- **Avatar generation** - Automatically create avatars based on Farcaster profiles

### Social Features
- **Share to Farcaster** - Post messages, images, and achievements
- **Screenshot sharing** - Capture and share 3D world moments
- **Group sessions** - Create collaborative sessions with invite links
- **Channel posting** - Share to specific Farcaster channels

### Achievement System
- **Milestone sharing** - Automatically share achievements to Farcaster
- **Custom achievements** - Create your own achievement types
- **Social stats** - Track sharing history and social interactions

## 📖 API Reference

All Farcaster features are available through the `farcaster` object in your app scripts:

### Authentication
```javascript
// Check if user is authenticated
if (farcaster.isAuthenticated()) {
  // Get current user
  const user = farcaster.getUser()
  console.log(`Hello ${user.displayName}!`)
}
```

### User Data Structure
```javascript
const user = farcaster.getUser()
// Returns:
{
  fid: 12345,
  username: "alice",
  displayName: "Alice Smith",
  bio: "Building cool stuff",
  pfpUrl: "https://...",
  followerCount: 1500,
  followingCount: 300,
  verifications: ["0x..."],
  avatar: {
    pfpUrl: "https://...",
    primaryColor: "#8A63D2",
    secondaryColor: "#6644FF"
  }
}
```

### Sharing Functions
```javascript
// Share a custom message
await farcaster.shareToFarcaster("Hello from Hyperfy! 🚀")

// Share with image
await farcaster.shareToFarcaster("Check this out!", "https://image-url.jpg")

// Take and share screenshot
await farcaster.shareScreenshot("Amazing view from my world!")

// Share to specific channel
await farcaster.shareToChannel("hyperfy", "Building something cool!")

// Share achievements
await farcaster.shareAchievement({
  type: 'first_build',
  name: 'First Creation',
  description: 'Created your first object!'
})
```

### Group Sessions
```javascript
// Create a group session
const session = await farcaster.createGroupSession({
  name: "Epic Building Session",
  description: "Let's build something amazing together!",
  maxParticipants: 10,
  isPublic: true
})

// Join existing session
await farcaster.joinGroupSession(sessionId)
```

### Social Stats
```javascript
// Get sharing statistics
const stats = farcaster.getSocialStats()
console.log(`Shared ${stats.totalShares} times`)
```

## 🎨 Example Apps

### 1. NFT Gallery App
**Location**: `examples/farcaster-gallery-app.js`

Features:
- 🖼️ Display NFTs in 3D space
- 👤 Show Farcaster profile info
- 📤 Share artwork to Farcaster
- 🎪 Create group exhibitions
- 🏆 Achievement system for gallery milestones

**Key Use Cases:**
- Art galleries
- NFT showcases
- Virtual museums
- Creator portfolios

### 2. Social Gaming App
**Location**: `examples/farcaster-leaderboard-app.js`

Features:
- 🏆 Real-time leaderboards
- 🎯 Challenge system with rewards
- 📈 Progress sharing to Farcaster
- 👥 Group challenges
- 🎖️ Achievement milestones

**Key Use Cases:**
- Competitive games
- Social challenges
- Community events
- Skill competitions

## 🛠️ Building Your Own App

### Basic App Structure
```javascript
// Listen for Farcaster authentication
world.on('auth:success', ({ user, provider }) => {
  if (provider === 'farcaster') {
    initializeApp(user)
  }
})

async function initializeApp(user) {
  // Your app initialization here
  console.log(`Welcome ${user.displayName}!`)
  
  // Create UI, set up features, etc.
  createMainUI(user)
}

// Auto-initialize if already authenticated
if (farcaster.isAuthenticated()) {
  initializeApp(farcaster.getUser())
}
```

### Common Patterns

#### 1. Profile Display
```javascript
function showUserProfile(user) {
  const profileUI = app.create('UI', {
    type: 'view',
    width: 300,
    height: 100
  })
  
  // Avatar
  profileUI.create('UIImage', {
    src: user.pfpUrl,
    width: 60,
    height: 60,
    borderRadius: 30
  })
  
  // Name and stats
  profileUI.create('UIText', {
    text: user.displayName,
    fontSize: 18,
    fontWeight: 'bold'
  })
  
  profileUI.create('UIText', {
    text: `${user.followerCount} followers`,
    fontSize: 14,
    color: '#666'
  })
}
```

#### 2. Achievement System
```javascript
const achievements = new Set()

function checkAchievement(type, data) {
  const key = `${user.fid}_${type}`
  
  if (!achievements.has(key)) {
    achievements.add(key)
    
    farcaster.shareAchievement({
      type: type,
      name: data.name,
      description: data.description
    })
    
    showNotification(`🏆 Achievement: ${data.name}`)
  }
}
```

#### 3. Interactive Sharing
```javascript
function createShareButton(content) {
  const shareBtn = app.create('UI', {
    type: 'view',
    width: 100,
    height: 40,
    backgroundColor: '#8A63D2'
  })
  
  shareBtn.create('UIText', {
    text: 'Share',
    color: '#ffffff',
    textAlign: 'center'
  })
  
  shareBtn.on('click', async () => {
    await farcaster.shareToFarcaster(content)
    showNotification('✅ Shared to Farcaster!')
  })
  
  return shareBtn
}
```

## 🎯 App Ideas to Build

### Creative Apps
- **3D Art Studio** - Create and share 3D art with Farcaster community
- **Music Venue** - Host virtual concerts with social sharing
- **Fashion Show** - Showcase avatar outfits and styles
- **Architecture Studio** - Design buildings and share blueprints

### Social Apps
- **Meeting Spaces** - Professional networking in 3D
- **Book Club** - Discuss books in themed environments  
- **Fitness Classes** - Group workout sessions with progress sharing
- **Language Exchange** - Practice languages in immersive settings

### Gaming Apps
- **Puzzle Challenges** - Collaborative puzzle solving
- **Racing Games** - Compete and share lap times
- **Treasure Hunts** - Community-driven exploration games
- **Building Competitions** - Timed building challenges

### Educational Apps
- **Virtual Classrooms** - Interactive learning experiences
- **Historical Tours** - Explore recreated historical locations
- **Science Labs** - Conduct virtual experiments
- **Coding Bootcamps** - Learn programming in 3D environments

## 🔧 Technical Tips

### Event Handling
```javascript
// Listen for world events
world.on('entity:created', (entity) => {
  // User created something, maybe award points?
})

world.on('player:joined', ({ player }) => {
  // Someone joined, welcome them!
})
```

### Persistent Data
```javascript
// Use local storage for user preferences
const userPrefs = {
  shareAchievements: true,
  autoShareBuilds: false
}

localStorage.setItem(`farcaster_${user.fid}_prefs`, JSON.stringify(userPrefs))
```

### Performance
- **Batch operations** - Don't spam Farcaster API calls
- **Cache user data** - Store profile info locally
- **Optimize UI** - Destroy unused UI elements
- **Rate limiting** - Respect API limits for sharing

## 🚀 Advanced Features

### Custom Achievement Types
Define your own achievement categories:

```javascript
const customAchievements = {
  'speed_builder': {
    name: 'Speed Builder',
    description: 'Built 10 objects in under 5 minutes',
    icon: '⚡'
  },
  'social_butterfly': {
    name: 'Social Butterfly', 
    description: 'Invited 5 friends to your world',
    icon: '🦋'
  }
}
```

### Multi-Channel Sharing
Target specific communities:

```javascript
const channels = {
  art: 'art-showcase',
  gaming: 'hyperfy-games', 
  building: 'world-builders'
}

await farcaster.shareToChannel(channels.art, artworkMessage)
```

### Integration with External APIs
Combine with other services:

```javascript
// Fetch user's NFTs
async function loadUserNFTs(user) {
  const nfts = await fetch(`/api/nfts/${user.verifications[0]}`)
  return await nfts.json()
}
```

## 📈 Analytics & Insights

Track engagement with your apps:

```javascript
function trackEvent(eventType, data) {
  console.log(`Event: ${eventType}`, data)
  
  // Send to analytics service
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({
      user: farcaster.getUser().fid,
      event: eventType,
      data: data,
      timestamp: Date.now()
    })
  })
}
```

## 🎉 Get Started

1. **Copy an example** - Start with one of the example apps
2. **Modify for your use case** - Adapt the features you need
3. **Add your creativity** - Build something unique!
4. **Share with community** - Post your creation to Farcaster
5. **Iterate and improve** - Get feedback and enhance

## 🤝 Community

- Share your apps in the `/hyperfy` channel on Farcaster
- Use hashtag `#hyperfybuilds` for discoverability
- Collaborate with other builders
- Give feedback on others' creations

---

**Happy Building!** 🚀 Your Hyperfy world is now a full Farcaster-native platform where users can build incredible social experiences! 