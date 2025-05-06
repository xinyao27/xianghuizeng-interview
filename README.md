# Simple Chat Component

## Preview

[https://chat-demo-gray-eight.vercel.app/](https://chat-demo-gray-eight.vercel.app/)

## Technical Stack
- [Hono](https://hono.dev/) - Lightweight web framework
- [DrizzleORM](https://orm.drizzle.team/) - TypeScript ORM
- [Neon](https://neon.tech/) - Serverless Postgres Database
- [Vercel AI SDK](https://sdk.vercel.ai/docs) - AI model integration
- [Qwen Model](https://qianwen.aliyun.com/) - Using qwen-vl-max for chat capabilities

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) installed on your system.

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
   - Rename `.env.example` to `.env`
   - Update the values in `.env` with your credentials

### Database Setup

1. Generate migration files:
```bash
pnpm db:generate
```

2. Apply migrations to create database structure:
```bash
pnpm migrate
```

## Development

Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features
- Real-time chat interface
- Integration with Qwen VL Max model
- Persistent conversation storage using Neon database
- Modern UI components



