# Salty documentation

Welcome to the Salty documentation! Salty is a security-focused password utility that enables 
secure password derivation and sharing through client-side encryption.

## Documentation structure

This documentation follows the [Diátaxis framework](https://diataxis.fr/), organizing content 
into four distinct categories to serve different user needs:

### 🎓 [Tutorials](./tutorials/)

**Learning-oriented** - Start here if you're new to Salty.

- [Getting started with Salty](./tutorials/getting-started.md) - Your first steps with secure 
  password derivation
- [Deploying Salty](./tutorials/deploying-salty.md) - Deploy your own Salty instance

### 🔧 [How-to guides](./how-to/)

**Task-oriented** - Practical guides for specific tasks.

- [How to generate secure passwords](./how-to/generate-passwords.md)
- [How to share encrypted payloads](./how-to/share-payloads.md)
- [How to configure security settings](./how-to/configure-security.md)
- [How to set up API authentication](./how-to/setup-api-auth.md)
- [How to monitor with OpenTelemetry](./how-to/monitor-telemetry.md)

### 📖 [Reference](./reference/)

**Information-oriented** - Technical specifications and API documentation.

- [API reference](./reference/api.md) - REST API endpoints and parameters
- [Configuration reference](./reference/configuration.md) - Environment variables and settings
- [CLI reference](./reference/cli.md) - Command-line interface options
- [Security headers reference](./reference/security-headers.md) - HTTP security headers

### 💡 [Explanation](./explanation/)

**Understanding-oriented** - Conceptual guides and architectural discussions.

- [Security architecture](./explanation/security-architecture.md) - How Salty ensures 
  zero-knowledge security
- [Cryptographic design](./explanation/cryptographic-design.md) - Understanding the encryption 
  approach
- [Performance considerations](./explanation/performance.md) - Design decisions for scalability
- [Threat model](./explanation/threat-model.md) - Security assumptions and boundaries

## Quick links

- **Need to get started quickly?** → [Getting started tutorial](./tutorials/getting-started.md)
- **Looking for API documentation?** → [API reference](./reference/api.md)
- **Want to understand the security model?** → [Security architecture](./explanation/security-architecture.md)
- **Need help with deployment?** → [Deploying Salty](./tutorials/deploying-salty.md)

## Key features

- **Zero-knowledge architecture**: Server never sees plaintext passwords or keys.
- **Client-side encryption**: All cryptographic operations happen in the browser.
- **Strong cryptography**: AES-GCM-256 with PBKDF2-SHA512 (600,000 iterations).
- **Defense in depth**: Rate limiting, input validation, comprehensive security headers.
- **Multi-language support**: Available in English and Japanese.
- **Open source**: Transparent security implementation.

## Getting help

- **GitHub Issues**: [Report bugs or request features](https://github.com/esolia/salty.esolia.pro-dd/issues)
- **Security Issues**: See [SECURITY.md](../SECURITY.md) for reporting vulnerabilities
- **Community**: Join discussions in the repository

## Contributing

We welcome contributions! Please see our [Contributing Guide](../CONTRIBUTING.md) for details on:
- Code style and standards
- Security requirements
- Testing procedures
- Documentation guidelines

## License

Salty is open source software licensed under the [MIT License](../LICENSE).