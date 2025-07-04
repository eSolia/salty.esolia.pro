# Programming Paradigm Analysis: Salty

## Overview

Salty employs a **hybrid programming paradigm** combining object-oriented and functional programming principles. This approach leverages TypeScript's multi-paradigm nature to create secure, maintainable, and performant code.

## Object-Oriented Characteristics

### 1. Class-Based Utilities

The codebase uses classes for stateful components and complex operations:

- `SecurityUtils` - Static utility class for security operations
- `RateLimiter` - Static methods for rate limiting logic
- `ApiError` - Custom error class with HTTP status codes
- `Logger` - Instance-based logging system with state management
- `SaltyTracer` - Singleton pattern for telemetry operations
- `VersionUtils` - Static utility class for version operations

### 2. Encapsulation

Classes properly encapsulate their state and implementation details:

```typescript
class Logger {
  private config: LoggerConfig;
  private requestCounter = 0;
  private recentLogs: LogEntry[] = [];
  private metrics: PerformanceMetrics;
  // Public methods provide controlled access
}
```

### 3. Singleton Pattern

The tracer implements a classic singleton for global state management:

```typescript
class SaltyTracer {
  private static instance: SaltyTracer;
  private constructor() {}
  static getInstance(): SaltyTracer {/* ... */}
}
```

## Functional Programming Elements

### 1. Pure Functions

Core cryptographic operations are implemented as pure functions:

- `hexToUint8Array()` - Deterministic hex to byte conversion
- `base91_encode()` - Stateless encoding
- `base91_decode()` - Stateless decoding
- `salty_key()` - Predictable key derivation
- `salty_encrypt()` - Encryption without side effects
- `salty_decrypt()` - Decryption without side effects

### 2. Higher-Order Functions

Telemetry uses functional composition patterns:

```typescript
TracingHelpers.traceCrypto = <T>(
  operation: string,
  fn: () => Promise<T> | T,
  attributes: SpanAttributes = {},
) => tracer.trace(); /* ... */
```

### 3. Immutability

- Configuration objects use `as const` assertions
- No mutation of input parameters
- New objects created rather than modifying existing ones
- Extensive use of `readonly` modifiers

## TypeScript-Specific Patterns

### 1. Strong Typing

Comprehensive use of TypeScript's type system:

```typescript
interface EncryptRequest {
  payload: string;
  key: string;
}

enum SecurityEvent {
  API_KEY_MISSING = "API_KEY_MISSING",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
}
```

### 2. Generic Programming

Type-safe generic functions for flexibility:

```typescript
trace<T>(
  spanName: string,
  operation: () => Promise<T> | T,
  attributes: SpanAttributes = {}
): Promise<T>
```

### 3. Type Guards

Extensive runtime type checking:

```typescript
if (error instanceof ApiError) {
  // Handle API-specific error
}
```

## Architectural Patterns

### 1. Middleware Pattern

Request processing follows a middleware chain:

- Security validation → Rate limiting → API handling → Response creation

### 2. Strategy Pattern

Different handlers for encrypt/decrypt operations:

```typescript
if (operation === "encrypt") {
  result = await salty_encrypt(payload, cryptoKey);
} else {
  result = await salty_decrypt(payload, cryptoKey);
}
```

### 3. Factory Pattern

Security header creation abstracts complex header generation:

```typescript
static createSecurityHeaders(): Headers
static createCorsHeaders(request?: Request): Headers
```

## Why This Hybrid Approach?

### 1. Security Requirements

- **Pure functions** for cryptographic operations ensure predictability
- **Encapsulation** protects sensitive state (rate limits, logs)
- **Immutability** prevents accidental security violations

### 2. Performance Considerations

- **Static methods** avoid unnecessary instantiation overhead
- **Singleton pattern** prevents duplicate tracer instances
- **Functional composition** enables efficient request processing

### 3. Maintainability

- **Clear separation** between stateful (Logger) and stateless (crypto) components
- **Type safety** catches errors at compile time
- **Modular design** enables easy testing and updates

## Module Organization

Each module has a specific responsibility:

- `server.ts` - HTTP request handling and routing
- `salty.ts` - Pure cryptographic functions
- `logger.ts` - Stateful logging and metrics
- `telemetry.ts` - Performance tracing
- `version.ts` - Build metadata (generated)

## Conclusion

Salty's programming paradigm represents **pragmatic hybrid development**:

- **Object-oriented design** for state management and organization
- **Functional programming** for security-critical operations
- **Type-driven development** for compile-time safety
- **Module pattern** for clear boundaries

This combination provides:

- **Security**: Pure functions for crypto, encapsulation for sensitive data
- **Performance**: Efficient static methods, singleton patterns where appropriate
- **Maintainability**: Clear separation of concerns, strong typing
- **Testability**: Pure functions are easily tested, classes enable mocking

The result is a secure, performant encryption service that leverages the best aspects of multiple programming paradigms while maintaining code clarity and safety.
