# Contributing to Quantum Quest

Thank you for your interest in contributing to Quantum Quest! This document explains how to get started and what types of contributions are welcome.

## How to contribute

1. Fork the repository.
2. Create a new branch for your feature or fix: `git checkout -b feature/your-feature`
3. Make your changes and test them locally.
4. Open a pull request with a clear description of your changes.

## What is welcome

- Bug fixes for backend routes and optimization logic
- Improvements to documentation and examples
- Frontend usability and visualization enhancements
- Additional test coverage for key modules

## Coding style

- Keep the code modular and readable
- Use descriptive variable and function names
- Document non-trivial algorithms with comments
- Prefer small, focused pull requests

## Testing

Run local validation before opening a PR:

```powershell
python -m py_compile backend/*.py main.py
```

If tests are added later, include commands here.
