# Passport NestJS Example with Session Management

This NestJS application demonstrates integration of Passport.js with session management.

## Features

- Authorization via GlobalArt
- Storing user data in the session
- Protected routes with session validation
- Session management (creation, validation, deletion)

## API Endpoints

- `GET /login` - Start the authorization process
- `GET /callback` - Callback after authorization
- `GET /profile` - Get user data (requires authorization)
- `POST /logout` - Log out (requires authorization)
- `GET /status` - Check authentication status

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run start:dev
```

3. Open your browser and go to `http://localhost:4500`

## Usage

1. Go to `/login` to start the authorization process
2. After successful authorization, user data will be saved in the session
3. Use `/profile` to retrieve user data
4. Use `/logout` to log out