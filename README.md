# Wally - Digital Wallet

A fintech digital wallet application built with React, Vite, TypeScript, and Tailwind CSS v4.

## Features

- **Authentication**: Login/Register with form validation (Zod + React Hook Form)
- **Dashboard**: Animated balance counter, quick actions, fund wallet modal
- **Send Money**: Transfer funds with recipient search, quick amounts, success animation with confetti
- **Transaction History**: Paginated list with search and filter, detailed transaction view
- **User Profile**: Edit handle, view account status
- **Admin Panel**: Stats overview, user management (block/unblock users)

## Tech Stack

- React 18 + TypeScript
- Vite 6
- Tailwind CSS v4
- React Router v7
- Zustand (State Management)
- React Hook Form + Zod (Form Validation)
- Axios (API Client)
- Radix UI + CVA (UI Components)
- Lucide React (Icons)
- Sonner (Toast Notifications)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file (optional):
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173)

## Demo Mode

The app works in demo mode without a backend API. All data is mocked locally, and actions like login, register, send money, etc. will work with mock responses.

To use admin features, login with an email containing "admin" (e.g., `admin@example.com`).

## Project Structure

```
src/
├── components/
│   └── ui/          # Reusable UI components
├── layouts/         # Auth and Protected layouts
├── lib/
│   ├── api.ts       # Axios API client
│   ├── store.ts     # Zustand auth store
│   ├── types.ts     # TypeScript types
│   └── utils.ts     # Utility functions
├── pages/           # Page components
├── App.tsx          # Routes configuration
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## API Integration

The app expects a REST API with the following endpoints:

- `POST /auth/login` - Login
- `POST /auth/register` - Register
- `GET /auth/me` - Get current user
- `GET /wallet` - Get wallet balance
- `POST /wallet/fund` - Add funds
- `POST /transactions/transfer` - Send money
- `GET /transactions` - Transaction history
- `GET /transactions/:id` - Transaction detail
- `PATCH /user/handle` - Update handle
- `GET /admin/stats` - Admin statistics
- `GET /admin/users` - List users
- `POST /admin/users/:id/block` - Block user
- `POST /admin/users/:id/unblock` - Unblock user

## License

MIT
