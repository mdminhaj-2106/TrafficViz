# Overview

This is a traffic management system called the "Predictive Guardian Traffic System" - an AI-based solution designed to optimize urban traffic flow through intelligent signal timing. The system combines real-time traffic data processing with machine learning to predict optimal traffic signal patterns and reduce congestion. It features a React-based dashboard for traffic authorities and real-time simulation capabilities with WebSocket communication.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built with React and TypeScript, utilizing a modern component-based architecture with:
- **UI Framework**: Shadcn/ui components with Radix UI primitives for consistent design
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query for server state and React hooks for local state
- **Real-time Communication**: WebSocket integration for live traffic updates
- **Routing**: Wouter for lightweight client-side routing
- **Visualization**: Three.js for 3D traffic intersection visualization and Chart.js for performance charts

## Backend Architecture
The backend follows a Node.js/Express architecture with:
- **Server Framework**: Express.js with TypeScript for type safety
- **Real-time Communication**: WebSocket server for broadcasting traffic updates
- **AI Engine**: Custom Deep Q-Network (DQN) implementation for traffic optimization
- **Traffic Simulation**: Event-driven simulation system with configurable speed controls
- **Data Layer**: In-memory storage with interfaces designed for easy database integration

## AI Decision Engine
The core intelligence uses a hybrid approach:
- **Predictor (DQN)**: Reinforcement learning model that analyzes traffic patterns and predicts optimal signal timing
- **Guardian**: Safety validation layer that ensures decisions meet safety constraints
- **State Representation**: Multi-dimensional input including phase vectors, occupancy data, wait times, and ETA predictions
- **Action Space**: Discrete actions for signal phase management (Keep Phase, Switch Phase)

## Data Storage Design
Currently implements in-memory storage with well-defined interfaces for:
- **Traffic State Management**: Real-time metrics, signal states, and incoming platoon data
- **Historical Data**: Traffic performance metrics over time
- **System Events**: Audit trail of AI decisions and system changes
- **User Management**: Basic user authentication structure (prepared for future expansion)

## Development Architecture
- **Build System**: Vite for fast development and optimized production builds
- **Database Schema**: Drizzle ORM with PostgreSQL schema definitions (ready for database integration)
- **Type Safety**: Shared TypeScript schemas between frontend and backend
- **Development Tools**: ESBuild for server bundling, hot module replacement for rapid development

The system is architected for scalability with clear separation of concerns between data collection, AI processing, and presentation layers, making it suitable for deployment in real traffic management scenarios.

# External Dependencies

## Database and ORM
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL dialect
- **@neondatabase/serverless**: Serverless PostgreSQL database connection (configured but not yet implemented)
- **connect-pg-simple**: PostgreSQL session store for Express sessions

## AI and Data Processing
- **Three.js**: 3D graphics library for traffic intersection visualization
- **Chart.js**: Data visualization library for performance metrics and charts
- **date-fns**: Date utility library for time-based calculations

## Frontend UI and Interactions
- **Radix UI**: Complete set of unstyled, accessible UI primitives (@radix-ui/react-*)
- **TanStack React Query**: Server state management and data fetching
- **React Hook Form**: Form state management with validation
- **Tailwind CSS**: Utility-first CSS framework
- **Wouter**: Lightweight routing library
- **class-variance-authority**: Utility for managing CSS class variants
- **cmdk**: Command palette component

## Real-time Communication
- **WebSocket (ws)**: Native WebSocket implementation for real-time data streaming
- **Server-Sent Events**: Prepared infrastructure for additional real-time communication patterns

## Development and Build Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind integration

## Replit-Specific Integration
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **@replit/vite-plugin-cartographer**: Development mapping tools
- **@replit/vite-plugin-dev-banner**: Development environment indicators

The application is designed to work with Neon Database (serverless PostgreSQL) but currently operates with in-memory storage, allowing for easy migration to a persistent database when needed.