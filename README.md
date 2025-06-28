# NestJS Toolkit

Monorepo with tools for NestJS

## Packages

- [`@globalart/nestjs-swagger`](./packages/nestjs-swagger) - Simple documentation builder for NestJS Swagger Module
- [`@globalart/nestjs-typeorm-pagination`](./packages/nestjs-typeorm-pagination) - Pagination and filtering for TypeORM repositories

## Examples

- [`swagger-example`](./examples/swagger-example) - Example application demonstrating @globalart/nestjs-swagger usage

## Requirements

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## Installation

```bash
pnpm install
```

## Commands

### Development

```bash
# Install dependencies
pnpm bootstrap

# Build all packages
pnpm build

# Build in watch mode
pnpm build:watch

# Run tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Linting
pnpm lint

# Code formatting
pnpm format
```

### Examples

```bash
# Run swagger example
pnpm --filter swagger-example start:dev
```
