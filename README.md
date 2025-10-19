# TrafficViz - AI-Powered Traffic Management System

A real-time traffic simulation and visualization system with AI-powered decision making for traffic light optimization.

## Features

- 🚦 **Real-time Traffic Simulation**: Live traffic flow simulation with dynamic vehicle movement
- 🤖 **AI-Powered Decisions**: Machine learning algorithms for optimal traffic light timing
- 📊 **Performance Analytics**: Comprehensive metrics and performance charts
- 🎯 **3D Visualization**: Interactive 3D traffic intersection visualization using THREE.js
- 📱 **Responsive Design**: Modern, mobile-friendly interface
- ⚡ **WebSocket Integration**: Real-time data streaming and updates

## Tech Stack

- **Frontend**: React, TypeScript, THREE.js, Tailwind CSS
- **Backend**: Node.js, Express, WebSocket
- **AI Engine**: Custom Q-learning algorithm for traffic optimization
- **Visualization**: THREE.js for 3D graphics, Chart.js for analytics

## Local Development

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Start Development Server**

   ```bash
   npm run dev
   ```

3. **Access Application**
   - Open http://localhost:3000 in your browser
   - The application will automatically connect to the WebSocket server

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**

   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**

   ```bash
   vercel
   ```

3. **Follow the prompts** to connect your GitHub repository

### Option 2: Netlify

1. **Build the project**

   ```bash
   npm run build
   ```

2. **Deploy to Netlify**
   - Connect your GitHub repository to Netlify
   - Set build command: `npm run vercel-build`
   - Set publish directory: `dist/public`

### Option 3: Railway

1. **Install Railway CLI**

   ```bash
   npm install -g @railway/cli
   ```

2. **Deploy to Railway**
   ```bash
   railway login
   railway init
   railway up
   ```

## Environment Variables

For production deployment, you may need to set:

- `NODE_ENV=production`
- `PORT=3000` (or your preferred port)

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   └── lib/           # Utilities
├── server/                # Express backend
│   ├── services/          # Business logic
│   ├── routes.ts          # API routes
│   └── index.ts           # Server entry point
├── shared/                # Shared types and schemas
└── dist/                  # Build output
```

## API Endpoints

- `GET /api/traffic/state` - Get current traffic state
- `POST /api/traffic/start` - Start simulation
- `POST /api/traffic/stop` - Stop simulation
- `POST /api/traffic/speed` - Update simulation speed
- `WebSocket /ws` - Real-time traffic updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
