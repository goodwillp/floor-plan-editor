# Security Configuration Guide

## Overview

This guide provides comprehensive security configuration for the BIM Wall System, covering authentication, authorization, data encryption, network security, and security monitoring.

## Database Security

### PostgreSQL Security Configuration

```sql
-- Create dedicated BIM user with minimal privileges
CREATE USER bim_user WITH PASSWORD 'secure_random_password';

-- Grant only necessary privileges
GRANT CONNECT ON DATABASE bim_walls TO bim_user;
GRANT USAGE ON SCHEMA public TO bim_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bim_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO bim_user;

-- Revoke unnecessary privileges
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE bim_walls FROM PUBLIC;

-- Enable row-level security for sensitive tables
ALTER TABLE walls ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_metrics ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY wall_access_policy ON walls
    FOR ALL TO bim_user
    USING (user_id = current_setting('app.current_user_id')::uuid);
```

### SSL/TLS Configuration

```typescript
// PostgreSQL SSL configuration
const sslConfig = {
  ssl: {
    require: true,
    rejectUnauthorized: true,
    ca: fs.readFileSync('/etc/ssl/certs/ca-certificate.crt').toString(),
    key: fs.readFileSync('/etc/ssl/private/client-key.key').toString(),
    cert: fs.readFileSync('/etc/ssl/certs/client-cert.crt').toString()
  }
};

// Database connection with SSL
const databaseConfig = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ...sslConfig
};
```

### SQLite Security

```typescript
// SQLite encryption configuration (using SQLCipher)
const sqliteSecureConfig = {
  type: 'sqlite',
  database: './data/bim-walls.db',
  password: process.env.SQLITE_PASSWORD, // Enables SQLCipher encryption
  synchronize: false,
  logging: false
};

// File system permissions for SQLite
const fs = require('fs');
const path = require('path');

// Set restrictive permissions on database file
const dbPath = './data/bim-walls.db';
if (fs.existsSync(dbPath)) {
  fs.chmodSync(dbPath, 0o600); // Read/write for owner only
}
```

## Application Security

### Environment Variable Security

```bash
# .env.production (secure configuration)
NODE_ENV=production

# Database credentials (use secrets management)
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_USERNAME=${DB_USERNAME}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}

# Encryption keys (rotate regularly)
ENCRYPTION_KEY=${ENCRYPTION_KEY}
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}

# API security
API_RATE_LIMIT=100
API_TIMEOUT=30000
CORS_ORIGIN=${CORS_ORIGIN}

# Security headers
SECURITY_HEADERS_ENABLED=true
HSTS_MAX_AGE=31536000
CSP_ENABLED=true
```

### Security Headers Configuration

```typescript
// Express security middleware
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

export function configureSecurityMiddleware(app: Express): void {
  // Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use('/api/', limiter);

  // CORS configuration
  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
}
```

### Input Validation and Sanitization

```typescript
// Input validation for BIM operations
import Joi from 'joi';
import DOMPurify from 'isomorphic-dompurify';

export class BIMInputValidator {
  private static wallSchema = Joi.object({
    id: Joi.string().uuid().required(),
    type: Joi.string().valid('Layout', 'Zone', 'Area').required(),
    thickness: Joi.number().min(0.01).max(10).required(),
    baseline: Joi.object({
      points: Joi.array().items(
        Joi.object({
          x: Joi.number().finite().required(),
          y: Joi.number().finite().required()
        })
      ).min(2).required()
    }).required()
  });

  static validateWallData(data: any): ValidationResult {
    const { error, value } = this.wallSchema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message),
        sanitizedData: null
      };
    }

    return {
      isValid: true,
      errors: [],
      sanitizedData: value
    };
  }

  static sanitizeStringInput(input: string): string {
    // Remove HTML tags and dangerous characters
    return DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  }

  static validateGeometricInput(points: Point[]): boolean {
    return points.every(point => 
      Number.isFinite(point.x) && 
      Number.isFinite(point.y) &&
      Math.abs(point.x) < 1e6 && 
      Math.abs(point.y) < 1e6
    );
  }
}
```

## Authentication and Authorization

### JWT Token Security

```typescript
// JWT configuration with security best practices
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class BIMAuthenticationManager {
  private readonly jwtSecret: string;
  private readonly refreshSecret: string;
  private readonly tokenExpiry: string = '15m';
  private readonly refreshExpiry: string = '7d';

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || this.generateSecureSecret();
    this.refreshSecret = process.env.REFRESH_SECRET || this.generateSecureSecret();
  }

  generateAccessToken(userId: string, permissions: string[]): string {
    return jwt.sign(
      { 
        userId, 
        permissions,
        type: 'access',
        iat: Math.floor(Date.now() / 1000)
      },
      this.jwtSecret,
      { 
        expiresIn: this.tokenExpiry,
        issuer: 'bim-wall-system',
        audience: 'bim-users'
      }
    );
  }

  generateRefreshToken(userId: string): string {
    return jwt.sign(
      { 
        userId,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000)
      },
      this.refreshSecret,
      { 
        expiresIn: this.refreshExpiry,
        issuer: 'bim-wall-system',
        audience: 'bim-users'
      }
    );
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const payload = jwt.verify(token, this.jwtSecret, {
        issuer: 'bim-wall-system',
        audience: 'bim-users'
      }) as TokenPayload;
      
      return payload.type === 'access' ? payload : null;
    } catch (error) {
      return null;
    }
  }

  private generateSecureSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }
}
```

### Role-Based Access Control

```typescript
// RBAC implementation for BIM operations
export enum BIMPermission {
  READ_WALLS = 'read:walls',
  WRITE_WALLS = 'write:walls',
  DELETE_WALLS = 'delete:walls',
  ADMIN_SYSTEM = 'admin:system',
  VIEW_METRICS = 'view:metrics',
  EXPORT_DATA = 'export:data'
}

export enum BIMRole {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  ADMIN = 'admin'
}

export class BIMAuthorizationManager {
  private rolePermissions: Map<BIMRole, BIMPermission[]> = new Map([
    [BIMRole.VIEWER, [
      BIMPermission.READ_WALLS,
      BIMPermission.VIEW_METRICS
    ]],
    [BIMRole.EDITOR, [
      BIMPermission.READ_WALLS,
      BIMPermission.WRITE_WALLS,
      BIMPermission.VIEW_METRICS,
      BIMPermission.EXPORT_DATA
    ]],
    [BIMRole.ADMIN, [
      BIMPermission.READ_WALLS,
      BIMPermission.WRITE_WALLS,
      BIMPermission.DELETE_WALLS,
      BIMPermission.ADMIN_SYSTEM,
      BIMPermission.VIEW_METRICS,
      BIMPermission.EXPORT_DATA
    ]]
  ]);

  hasPermission(userRole: BIMRole, requiredPermission: BIMPermission): boolean {
    const permissions = this.rolePermissions.get(userRole);
    return permissions ? permissions.includes(requiredPermission) : false;
  }

  checkPermission(userRole: BIMRole, requiredPermission: BIMPermission): void {
    if (!this.hasPermission(userRole, requiredPermission)) {
      throw new Error(`Insufficient permissions: ${requiredPermission} required`);
    }
  }
}
```

## Data Encryption

### At-Rest Encryption

```typescript
// Data encryption for sensitive BIM data
import crypto from 'crypto';

export class BIMDataEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;

  constructor(private encryptionKey: Buffer) {
    if (encryptionKey.length !== this.keyLength) {
      throw new Error('Encryption key must be 32 bytes');
    }
  }

  encryptSensitiveData(data: string): EncryptedData {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
    cipher.setAAD(Buffer.from('bim-wall-system'));

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  decryptSensitiveData(encryptedData: EncryptedData): string {
    const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
    decipher.setAAD(Buffer.from('bim-wall-system'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  static generateEncryptionKey(): Buffer {
    return crypto.randomBytes(32);
  }
}

interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}
```

### In-Transit Encryption

```typescript
// HTTPS configuration for production
import https from 'https';
import fs from 'fs';

export function createSecureServer(app: Express): https.Server {
  const options = {
    key: fs.readFileSync('/etc/ssl/private/server-key.pem'),
    cert: fs.readFileSync('/etc/ssl/certs/server-cert.pem'),
    ca: fs.readFileSync('/etc/ssl/certs/ca-cert.pem'),
    
    // Security options
    secureProtocol: 'TLSv1_2_method',
    ciphers: [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384'
    ].join(':'),
    honorCipherOrder: true
  };

  return https.createServer(options, app);
}
```

## Network Security

### Firewall Configuration

```bash
#!/bin/bash
# UFW firewall configuration for BIM Wall System

# Reset firewall rules
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# SSH access (restrict to specific IPs in production)
ufw allow from 192.168.1.0/24 to any port 22

# HTTP/HTTPS access
ufw allow 80/tcp
ufw allow 443/tcp

# Database access (only from application servers)
ufw allow from 10.0.1.0/24 to any port 5432

# Application port (internal only)
ufw allow from 10.0.1.0/24 to any port 3000

# Enable firewall
ufw --force enable

# Show status
ufw status verbose
```

### Network Segmentation

```yaml
# Docker Compose with network segmentation
version: '3.8'

networks:
  frontend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.1.0/24
  backend:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.20.2.0/24
  database:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.20.3.0/24

services:
  nginx:
    image: nginx:alpine
    networks:
      - frontend
    ports:
      - "80:80"
      - "443:443"

  bim-app:
    build: .
    networks:
      - frontend
      - backend
    depends_on:
      - postgres

  postgres:
    image: postgis/postgis:14-3.2
    networks:
      - database
    environment:
      POSTGRES_DB: bim_walls
      POSTGRES_USER: bim_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
```

## Security Monitoring

### Security Event Logging

```typescript
// Security event logging system
export class BIMSecurityLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ 
          filename: '/var/log/bim/security.log',
          maxsize: 10485760, // 10MB
          maxFiles: 10
        }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  logAuthenticationAttempt(userId: string, success: boolean, ip: string): void {
    this.logger.info('Authentication attempt', {
      event: 'auth_attempt',
      userId,
      success,
      ip,
      timestamp: new Date().toISOString()
    });
  }

  logUnauthorizedAccess(userId: string, resource: string, ip: string): void {
    this.logger.warn('Unauthorized access attempt', {
      event: 'unauthorized_access',
      userId,
      resource,
      ip,
      timestamp: new Date().toISOString()
    });
  }

  logSuspiciousActivity(activity: string, details: any): void {
    this.logger.error('Suspicious activity detected', {
      event: 'suspicious_activity',
      activity,
      details,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Intrusion Detection

```typescript
// Basic intrusion detection system
export class BIMIntrusionDetection {
  private failedAttempts: Map<string, number> = new Map();
  private blockedIPs: Set<string> = new Set();
  private securityLogger: BIMSecurityLogger;

  constructor() {
    this.securityLogger = new BIMSecurityLogger();
    this.startCleanupTimer();
  }

  checkFailedAttempts(ip: string): boolean {
    const attempts = this.failedAttempts.get(ip) || 0;
    
    if (attempts >= 5) {
      this.blockedIPs.add(ip);
      this.securityLogger.logSuspiciousActivity('IP blocked for excessive failed attempts', { ip, attempts });
      return false;
    }
    
    return true;
  }

  recordFailedAttempt(ip: string): void {
    const attempts = this.failedAttempts.get(ip) || 0;
    this.failedAttempts.set(ip, attempts + 1);
  }

  isBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  private startCleanupTimer(): void {
    // Clean up failed attempts every hour
    setInterval(() => {
      this.failedAttempts.clear();
      this.blockedIPs.clear();
    }, 3600000);
  }
}
```

## Security Auditing

### Audit Trail Implementation

```typescript
// Comprehensive audit trail for BIM operations
export class BIMAuditTrail {
  private auditLogger: winston.Logger;

  constructor() {
    this.auditLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ 
          filename: '/var/log/bim/audit.log',
          maxsize: 50485760, // 50MB
          maxFiles: 20
        })
      ]
    });
  }

  logWallOperation(operation: string, wallId: string, userId: string, changes?: any): void {
    this.auditLogger.info('Wall operation', {
      event: 'wall_operation',
      operation,
      wallId,
      userId,
      changes,
      timestamp: new Date().toISOString()
    });
  }

  logDataAccess(resource: string, userId: string, action: string): void {
    this.auditLogger.info('Data access', {
      event: 'data_access',
      resource,
      userId,
      action,
      timestamp: new Date().toISOString()
    });
  }

  logConfigurationChange(setting: string, oldValue: any, newValue: any, userId: string): void {
    this.auditLogger.warn('Configuration change', {
      event: 'config_change',
      setting,
      oldValue,
      newValue,
      userId,
      timestamp: new Date().toISOString()
    });
  }
}
```

## Security Checklist

### Pre-Deployment Security Checklist

- [ ] Database credentials are stored securely (not in code)
- [ ] SSL/TLS is enabled for all connections
- [ ] Input validation is implemented for all user inputs
- [ ] Rate limiting is configured for API endpoints
- [ ] Security headers are properly configured
- [ ] File permissions are set correctly
- [ ] Firewall rules are configured
- [ ] Audit logging is enabled
- [ ] Backup encryption is configured
- [ ] Default passwords are changed
- [ ] Unnecessary services are disabled
- [ ] Security monitoring is active

### Regular Security Maintenance

```bash
#!/bin/bash
# Weekly security maintenance script

# Update system packages
apt update && apt upgrade -y

# Check for security updates
unattended-upgrades --dry-run

# Rotate logs
logrotate -f /etc/logrotate.d/bim-security

# Check file permissions
find /app -type f -perm /o+w -exec ls -la {} \;

# Check for suspicious processes
ps aux | grep -E "(nc|netcat|nmap|tcpdump)"

# Review failed login attempts
grep "Failed password" /var/log/auth.log | tail -20

# Check disk usage
df -h | grep -E "9[0-9]%|100%"

# Backup security logs
tar -czf /backups/security-logs-$(date +%Y%m%d).tar.gz /var/log/bim/
```

This comprehensive security configuration guide provides all the necessary tools and procedures for securing the BIM Wall System in production environments.