# Security Policy

## Supported Versions & Environments

The following versions of this project and browser environments are currently supported with security updates:

| Project Version | Supported | Supported Browser Environments |
| :--- | :--- | :--- |
| **1.2.x** | **Yes** | Mozilla Firefox Desktop $\ge 139.0$, Firefox ESR $\ge 140$ |
| < 1.2 | No | Unsupported |

---

## Reporting a Vulnerability

We take the security of this software seriously. If you discover a security vulnerability, please follow these guidelines:

1. **Do NOT report security vulnerabilities via public GitHub issues.**
2. Open a confidential advisory or contact the maintainers via security channels.
3. Provide:
   - A clear description of the vulnerability.
   - Exact steps to reproduce or a minimal proof of concept (PoC).
   - Potential impact and affected Firefox versions.
4. You will receive an initial response acknowledging your report within 48 hours.
5. We will coordinate a remediation timeline and request coordinated disclosure after a patch has been published.

---

## Security Best Practices for Total Tab Exporter

- **No Remote Code & Strict CSP**: Zero external script loading, zero `eval`, zero inline script handlers.
- **Input Sanitization**: Block all `javascript:` and `data:` URI executions when parsing tab URLs.
- **Offline-First Invariant**: All processing happens strictly client-side. Zero telemetry or unconsented external network communication.

