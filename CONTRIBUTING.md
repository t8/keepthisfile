# Contributing to KeepThisFile

Thank you for your interest in contributing to KeepThisFile! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Submitting Code Changes](#submitting-code-changes)
- [Development Guidelines](#development-guidelines)
  - [Code Style](#code-style)
  - [Commit Messages](#commit-messages)
  - [Testing](#testing)
- [Project Structure](#project-structure)
- [License](#license)

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences
- Show empathy towards other community members

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/arweavevault.git
   cd arweavevault
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/arweavevault.git
   ```

## Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp env.example .env.local
   ```
   Then edit `.env.local` with your configuration. For local development, you may need:
   - MongoDB connection string (or use MongoDB Atlas)
   - JWT secret (generate with `openssl rand -base64 32`)
   - Stripe test keys
   - Arweave wallet JSON (stringified)
   - SMTP credentials for email

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **For Vercel serverless functions** (optional):
   ```bash
   npm run dev:vercel
   ```

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:

- **Clear title and description** of the bug
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Environment details** (OS, Node version, browser if applicable)
- **Screenshots or error messages** if relevant
- **Possible solution** (if you have one)

### Suggesting Features

We welcome feature suggestions! Please open an issue with:

- **Clear description** of the feature
- **Use case** - why would this feature be useful?
- **Possible implementation** approach (if you have ideas)
- **Alternatives considered** (if any)

### Submitting Code Changes

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following our [development guidelines](#development-guidelines)

3. **Test your changes**:
   - Ensure the code runs without errors
   - Test the functionality you've added/modified
   - Run linting: `npm run lint`

4. **Commit your changes** with clear commit messages (see [Commit Messages](#commit-messages))

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**:
   - Provide a clear title and description
   - Reference any related issues
   - Describe what changes you made and why
   - Include screenshots if UI changes are involved

7. **Keep your branch updated**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

## Development Guidelines

### Code Style

- **TypeScript**: We use TypeScript for type safety. Please add proper types to your code.
- **ESLint**: Follow the existing ESLint configuration. Run `npm run lint` before committing.
- **Formatting**: Use consistent formatting. Consider using Prettier if not already configured.
- **Naming**: Use descriptive names for variables, functions, and components.
  - Components: PascalCase (e.g., `FileCard.tsx`)
  - Functions/variables: camelCase (e.g., `uploadFile`)
  - Constants: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)

### File Organization

- **API Routes**: Place serverless functions in `api/` directory, organized by feature
- **Components**: Place React components in `src/components/`
- **Utilities**: Shared utilities go in `api/lib/` (backend) or `src/lib/` (frontend)
- **Types**: Define TypeScript types near where they're used, or in a shared types file

### Code Quality

- **Keep functions small and focused** - one responsibility per function
- **Add comments** for complex logic or non-obvious code
- **Handle errors** appropriately with try-catch blocks
- **Validate inputs** at API boundaries
- **Avoid hardcoding** - use environment variables or constants

### Commit Messages

We follow conventional commit message format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(upload): add support for batch file uploads

fix(auth): resolve magic link expiration issue

docs(readme): update installation instructions
```

### Testing

While we don't have a formal test suite yet, please:

- **Test manually** the functionality you've added or modified
- **Test edge cases** (empty inputs, large files, network errors, etc.)
- **Test error handling** (what happens when things go wrong?)
- **Consider adding tests** if you're adding significant new functionality

## Project Structure

```
arweavevault/
├── api/                    # Serverless API routes (Vercel)
│   ├── auth/              # Authentication endpoints
│   │   └── magic-link/    # Magic link auth
│   ├── upload/            # File upload endpoints
│   ├── payments/          # Stripe payment endpoints
│   ├── files/             # File management endpoints
│   ├── stripe/            # Stripe webhook handler
│   └── lib/               # Shared backend utilities
│       ├── arweave.ts     # Arweave integration
│       ├── auth.ts        # Authentication utilities
│       ├── db.ts          # Database connection
│       ├── email.ts       # Email sending
│       └── stripe.ts      # Stripe integration
├── src/                    # Frontend React application
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   └── lib/               # Frontend utilities
├── public/                 # Static assets
└── vercel.json            # Vercel configuration
```

### Key Areas for Contribution

- **Frontend Components**: UI/UX improvements, new features
- **API Endpoints**: New functionality, performance improvements
- **Arweave Integration**: Upload optimizations, error handling
- **Authentication**: Security improvements, new auth methods
- **Documentation**: Code comments, README updates, guides
- **Testing**: Adding test coverage
- **Performance**: Optimizations, caching strategies

## Pull Request Process

1. **Ensure your code follows** the development guidelines
2. **Update documentation** if you've changed functionality
3. **Ensure all checks pass** (linting, etc.)
4. **Request review** from maintainers
5. **Address feedback** promptly and professionally
6. **Squash commits** if requested (we may ask you to clean up commit history)

## Questions?

If you have questions about contributing:

- Open an issue with the `question` label
- Check existing issues and discussions
- Review the codebase to understand patterns

## License

By contributing to KeepThisFile, you agree that your contributions will be licensed under the same AGPL-3.0-only license that covers the project. See [LICENSE](LICENSE) for details.

Thank you for contributing to KeepThisFile! 🎉
