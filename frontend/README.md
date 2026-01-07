# Iubar Frontend

React TypeScript frontend for the Iubar AI-enhanced personal knowledge management system.

## Quick Start

### 1. Install Dependencies

```bash
# From the frontend directory
npm install
```

### 2. Environment Configuration (Optional)

```bash
# Copy environment template
cp .env.template .env.local

# Edit .env.local if needed
# VITE_API_BASE_URL=http://localhost:8000
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at http://localhost:5173

### 4. Build for Production

```bash
npm run build
```

Built files will be in the `dist/` directory.

## Development Notes

### Project Structure

```
frontend/
├── src/
│   ├── components/      # React components (placeholder)
│   ├── pages/           # Page-level components (placeholder)
│   ├── hooks/           # Custom React hooks (placeholder)
│   ├── services/        # API client functions
│   │   └── api.ts       # HTTP client for backend communication
│   ├── types/           # TypeScript type definitions (placeholder)
│   ├── utils/           # Frontend utilities (placeholder)
│   ├── App.tsx          # Main application component
│   └── main.tsx         # Application entry point
├── public/              # Static assets (placeholder)
├── tests/               # Test files
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite build configuration
└── vitest.config.ts     # Test configuration
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:e2e` - Run end-to-end tests with Playwright

### Technology Stack

- **React 18** - UI library with hooks and functional components
- **TypeScript** - Type-safe JavaScript with strict mode enabled
- **Vite** - Fast build tool and development server
- **Vitest** - Unit testing framework
- **Playwright** - End-to-end testing
- **fast-check** - Property-based testing library

### API Communication

The frontend communicates with the backend through the API client in `src/services/api.ts`:

```typescript
import { apiClient } from './services/api';

// GET request
const healthData = await apiClient.get('/health');

// POST request (extensible)
const result = await apiClient.post('/endpoint', { data: 'value' });
```

The API base URL is configurable via environment variables:
- `VITE_API_BASE_URL` - Backend API URL (default: http://localhost:8000)

### Development Features

- **Hot Reload** - Changes are reflected immediately during development
- **TypeScript Strict Mode** - Enhanced type safety and error detection
- **Path Aliases** - Use `@/` for clean imports from src directory
- **Environment Variables** - Vite environment variable support with `VITE_` prefix

### Testing

**Unit Tests** (Vitest + React Testing Library)
```bash
npm run test
```

**End-to-End Tests** (Playwright)
```bash
npm run test:e2e
```

**Property-Based Tests** (fast-check)
- Configuration validation tests in `tests/` directory
- Validates frontend-backend communication patterns

### Troubleshooting

**Development server won't start**
```bash
# Check Node.js version (requires 18+)
node --version

# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**TypeScript compilation errors**
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Verify all dependencies are installed
npm install
```

**Backend connection issues**
- Ensure backend is running on http://localhost:8000
- Check CORS configuration in backend
- Verify `VITE_API_BASE_URL` in `.env.local` if using custom backend URL

**Build fails**
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Reinstall dependencies
npm install

# Try building again
npm run build
```

### Adding New Features

This frontend is designed to be easily extensible:

1. **Components** - Add React components in `src/components/`
2. **Pages** - Add page-level components in `src/pages/`
3. **API Services** - Extend `src/services/api.ts` for new endpoints
4. **Types** - Add TypeScript types in `src/types/`
5. **Utilities** - Add helper functions in `src/utils/`

The structure follows standard React best practices and can accommodate any architectural patterns as the application grows.