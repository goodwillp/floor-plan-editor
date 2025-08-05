# Floor Plan Editor

A web-based CAD application for creating architectural floor plans built with React, TypeScript, ShadCN UI, PixiJS, and Docker.

## Features

- **Modern Tech Stack**: React 19, TypeScript, Vite, ShadCN UI, PixiJS
- **Wall Types**: Layout (350mm), Zone (250mm), Area (150mm) walls
- **Intelligent Geometry**: Automatic intersection detection and node management
- **Docker Support**: Containerized for consistent deployment
- **Testing**: Vitest with React Testing Library
- **Development Tools**: ESLint, Prettier, TypeScript

## Development Setup

### Prerequisites

- Node.js 22.12.0 or higher
- npm 11.5.0 or higher
- Docker (optional, for containerized development)

### Installation

1. Clone the repository and navigate to the project directory
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI

### Docker Development

1. Build and run with Docker Compose:
   ```bash
   docker-compose up floor-plan-editor-dev
   ```

2. Access the application at [http://localhost:5173](http://localhost:5173)

### Production Docker Build

1. Build the production image:
   ```bash
   docker build -t floor-plan-editor .
   ```

2. Run the production container:
   ```bash
   docker run -p 3000:3000 floor-plan-editor
   ```

3. Access the application at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
floor-plan-editor/
├── src/
│   ├── components/ui/     # ShadCN UI components
│   ├── lib/              # Utility functions
│   ├── test/             # Test setup
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # Application entry point
│   └── index.css         # Global styles with Tailwind
├── public/               # Static assets
├── Dockerfile            # Production Docker configuration
├── Dockerfile.dev        # Development Docker configuration
├── docker-compose.yml    # Docker Compose configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── vite.config.ts        # Vite configuration
├── vitest.config.ts      # Vitest configuration
└── tsconfig.*.json       # TypeScript configurations
```

## Technology Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite
- **UI Components**: ShadCN UI (Radix UI + Tailwind CSS)
- **Icons**: Lucide React
- **Canvas Graphics**: PixiJS
- **Testing**: Vitest, React Testing Library
- **Linting**: ESLint, Prettier
- **Containerization**: Docker

## Next Steps

This setup provides the foundation for the Floor Plan Editor. The next tasks will implement:

1. Core data structures and interfaces
2. React application layout
3. Icon-based UI components with tooltips
4. PixiJS canvas integration
5. Wall type system and thickness management

See the implementation plan in `.kiro/specs/floor-plan-editor/tasks.md` for detailed next steps.