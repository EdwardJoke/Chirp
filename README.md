# Chirp - Voice Calling App

A simple one-on-one voice calling application with meeting ID and password authentication.

## Features

- **Voice Calls** - Peer-to-peer audio using WebRTC
- **Meeting Security** - Password-protected meetings
- **Cross-Platform** - Desktop app (macOS) and web app
- **Simple UI** - Clean interface with microphone controls

## Installation

### Option 1: Download Desktop App (macOS)

1. Go to [Releases](https://github.com/EdwardJoke/Chirp/releases)
2. Download `Chirp_x.y.z_x64.dmg`
3. Open the DMG file
4. Drag Chirp to Applications
5. Launch Chirp from Applications

**Note:** On first launch, macOS may show a security warning. Go to System Settings > Privacy & Security and click "Open Anyway".

### Option 2: Build from Source

#### Prerequisites

- Node.js 18+
- pnpm
- Rust (for Tauri desktop build)

#### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/EdwardJoke/Chirp.git
cd Chirp

# Install dependencies
pnpm install
```

#### Run Web App

```bash
# Start the web app (requires separate signaling server)
pnpm run dev
```

Open http://localhost:3000

#### Build Desktop App

```bash
# Build Tauri desktop app
pnpm run tauri:build
```

The built app will be at:
- `src-tauri/target/release/bundle/macos/Chirp.app`
- `src-tauri/target/release/bundle/dmg/Chirp_1.0.0_x64.dmg`

## Deployment

### Deploy Signaling Server

The app requires a signaling server to manage WebRTC connections.

#### Using Railway (Recommended)

1. Create a new Railway project
2. Connect your GitHub repository
3. Set the root directory to `server`
4. Add environment variable: `PORT=3001`
5. Deploy

#### Using Render

1. Create a new Web Service
2. Connect your GitHub repository
3. Set root directory to `server`
4. Build command: `pnpm install && pnpm run build`
5. Start command: `pnpm run start`
6. Add environment variable: `PORT=3001`

#### Using Docker

```bash
cd server
docker build -t chirp-server .
docker run -p 3001:3001 chirp-server
```

### Build Desktop App with Production Server

After deploying your signaling server, update the production URL:

```bash
# Replace with your actual server URL
export NEXT_PUBLIC_SIGNALING_SERVER_URL=https://your-server.railway.app

# Build the app
pnpm run tauri:build
```

## How to Use

### Creating a Meeting

1. Launch the app
2. Enter a **Meeting ID** (e.g., "meeting123")
3. Enter a **Password**
4. Click **Join Call**
5. Share the Meeting ID and password with someone

### Joining a Meeting

1. Launch the app
2. Enter the **Meeting ID** and **Password** from the host
3. Click **Join Call**

### During a Call

| Action | How |
|--------|-----|
| Mute/Unmute | Click the microphone button |
| End Call | Click the red phone button |

## Architecture

```
┌─────────────────────────────────────────┐
│  Chirp Desktop/Web App                   │
│  - Connects to signaling server         │
│  - Uses WebRTC for voice               │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Signaling Server (your deployment)    │
│  - Manages meeting rooms               │
│  - Routes WebRTC signaling             │
└─────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop | Tauri 2.x |
| Frontend | Next.js 16, shadcn/ui |
| Voice | WebRTC |
| Signaling | Socket.io, Express |
| Language | TypeScript |

## Troubleshooting

### "Cannot connect to server"
- Make sure the signaling server is running
- Check the server URL in the app settings

### "Microphone not working"
- Grant microphone permission in System Settings
- Check that no other app is using the microphone

### "Call dropped"
- Check internet connection
- Try reconnecting to the meeting

## Development

```bash
# Start frontend dev server
pnpm run dev

# Start signaling server (separate terminal)
cd server && pnpm run dev

# Run linter
pnpm run lint

# Run typecheck
pnpm run typecheck
```

## License

MIT
