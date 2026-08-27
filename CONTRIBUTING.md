# Contributing to VLC - Visura

Thank you for considering contributing to Visura! This guide will help you get started.

## Code of Conduct

Be respectful and inclusive. Harassment, discrimination, and offensive behavior of any kind will not be tolerated.

## How to Contribute

### Reporting Bugs

Before submitting a bug report, please:

1. Search existing issues to avoid duplicates.
2. Include a clear title and description.
3. Provide steps to reproduce, expected vs. actual behavior.
4. Include environment details (OS, device, app version, screenshots if possible).

### Suggesting Features

1. Search existing issues for similar requests.
2. Open a new issue with the "feature request" label.
3. Explain the problem you are solving and a proposed approach.

### Workflow

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-feature` (or `fix/my-fix`).
3. Make focused, well-named commits. Commit messages should be imperative and descriptive (e.g., `Add artwork caching`, `Fix video scanner crash`).
4. Keep changes scoped to the issue. Avoid unrelated edits.
5. Test your changes before submitting.
6. Push the branch and open a pull request against `main`.
7. Reference the related issue in the PR description.

## Development Setup

### Prerequisites

- **Backend:** Java 21, Maven 3.9+
- **Frontend:** Node.js 18+, Expo CLI, Android SDK (for builds)

### Backend

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npx expo start
```

Scan the QR code with Expo Go, or press `a` for Android / `i` for iOS.

### Environment Variables

Copy `example.env` files to `.env` in each directory and fill in real values. Never commit `.env` files or real secrets.

## Code Standards

- **Frontend:** JavaScript (React Native / Expo). Follow existing component and hook conventions. Use the repository and SQLite layers for media queries; do not re-introduce duplicate media arrays in Zustand stores.
- **Backend:** Java 21, Spring Boot. Follow existing package structure (`config`, `controller`, `dto`, `model`, `repo`, `service`, `util`).
- Do not commit secrets, credentials, or generated build artifacts.
- Run `npx expo-doctor` in `frontend/` to verify dependency compatibility before submitting.
- Run lint/format checks if available before pushing.

## Pull Request Checklist

- [ ] Branch is up to date with `main`
- [ ] Changes are focused on a single concern
- [ ] No secrets or environment files are included
- [ ] Frontend changes pass `npx expo-doctor`
- [ ] New backend endpoints are reflected in the README API table
- [ ] Changelog updated under "[Unreleased]" when behavior changes

## Getting Help

Open an issue or start a discussion on the repository for questions.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).