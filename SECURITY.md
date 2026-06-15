# Security Policy

## Supported Versions
| Version | Supported |
|---------|-----------|
| 2.1.0   | ✅ Yes   |
| < 2.0   | ❌ No    |

## Reporting a Vulnerability
Contact: security@ecotrack.app
Response time: 48 hours

## Security Features Implemented
- Zero external npm dependencies
- SRI hashes on all CDN resources
- Strict Content Security Policy (CSP)
- Token bucket rate limiting (3 req/sec)
- Zero-persistence API key handling
- Prototype pollution prevention
- XSS prevention via escapeHtml()
- CSRF protection via same-origin policy
- Secure HTTP headers via Firebase hosting
- Cryptographic session ID generation
