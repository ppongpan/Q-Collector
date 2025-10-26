# Q-Collector Development TODO

**Last Updated**: 2025-10-26 19:15:00 UTC+7
**Current Version**: v0.9.0-dev
**Current Focus**: 🔒 API Security Hardening & Compliance

---

## 🔒 NEW - API Security Comprehensive Audit (2025-10-26)

**Status**: 🟡 IN PROGRESS
**Priority**: ⭐⭐⭐⭐⭐ CRITICAL FOR PRODUCTION
**Security Rating**: 7/10 → Target: 9/10
**Duration**: 12-16 hours (4 phases)

### 📊 Security Assessment Summary

**Based on API Security Best Practices (10 criteria):**

| Security Practice | Status | Score | Implementation |
|-------------------|--------|-------|----------------|
| 1. HTTPS | ✅ Ready | 10/10 | Production ready |
| 2. API Gateway | ⚠️ Missing | 0/10 | Uses Express directly |
| 3. API Versioning | ✅ Complete | 10/10 | /api/v1 implemented |
| 4. Secure API Keys | ⚠️ Partial | 6/10 | JWT exists, needs rotation |
| 5. Rate Limiting | ✅ Complete | 10/10 | Redis-based + fallback |
| 6. Input Validation | ✅ Complete | 10/10 | express-validator + DOMPurify |
| 7. Authorization | ✅ Complete | 10/10 | RBAC 18 roles |
| 8. Encryption at Rest | ✅ Complete | 10/10 | AES-256-GCM for PII |
| 9. Security Audits | ❌ Missing | 0/10 | No automated scanning |
| 10. Dependency Management | ❌ Missing | 0/10 | No vulnerability scanning |

**Overall Score**: 70/100 (7/10) - **GOOD but needs improvement**

---

## ✅ Current Security Implementation

### Strong Points (8/10 criteria)

1. **✅ HTTPS (10/10)**
   - Production-ready SSL/TLS configuration
   - Automatic HTTP → HTTPS redirect
   - Strong cipher suites

2. **✅ API Versioning (10/10)**
   - `/api/v1` namespace
   - Backward compatibility support
   - Clear deprecation path

3. **✅ Rate Limiting (10/10)**
   - **File**: `backend/middleware/rateLimit.middleware.js`
   - Redis-based rate limiting
   - Graceful in-memory fallback
   - Per-endpoint configurations:
     - Login: 5 attempts / 15 minutes
     - Public forms: 5 submissions / hour per IP
     - Authenticated: 20 / 15 minutes
   - IP-based tracking for anonymous users

4. **✅ Input Validation (10/10)**
   - **Backend**: express-validator on all routes
   - **Frontend**: DOMPurify for XSS prevention
   - **Middleware**: sanitizeBody() removes malicious code
   - SQL Injection protection via Sequelize ORM

5. **✅ Authorization (10/10)**
   - **RBAC System**: 18 roles with granular permissions
   - Role-based access control on all sensitive endpoints
   - Permission checks: `authorize('super_admin', 'admin')`
   - User impersonation prevention

6. **✅ Encryption at Rest (10/10)**
   - **Algorithm**: AES-256-GCM
   - **File**: `backend/services/EncryptionService.js`
   - Encrypts: email, phone, name fields
   - Secure key storage in environment variables

7. **✅ Security Headers (10/10)**
   - **Package**: Helmet.js
   - CSP (Content Security Policy)
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - HSTS enabled

8. **✅ Authentication (8/10)**
   - JWT tokens (15 min access, 7 day refresh)
   - 2FA support (TOTP)
   - bcrypt password hashing (12 rounds)
   - Trusted devices (24-hour cookies)
   - Session management

---

## ⚠️ Critical Security Gaps (3 areas)

### 1. ❌ API Gateway Missing (Priority: HIGH)

**Current State**: Express.js handles all routing directly

**Risks**:
- No centralized security enforcement
- Difficult to implement global policies
- No traffic analytics/monitoring
- Limited DDoS protection
- Can't enforce quota limits across services

**Recommendation**:
- **Option A**: Implement API Gateway pattern in Express
  - Create gateway middleware layer
  - Centralize auth, rate limiting, logging
  - Time: 6-8 hours

- **Option B**: Use nginx as reverse proxy
  - Configure nginx upstream
  - Add security headers at proxy level
  - Implement request filtering
  - Time: 4-6 hours

**Decision**: Choose Option A (Express middleware gateway) for better control

---

### 2. ⚠️ Secure API Keys Management (Priority: HIGH)

**Current State**: JWT secrets in .env, no rotation mechanism

**Gaps**:
- No automatic key rotation
- Secrets stored in plaintext .env files
- No secret versioning
- Manual secret distribution
- No audit trail for secret access

**Risks**:
- Compromised secrets affect all users
- Difficult to revoke/rotate without downtime
- Secrets may leak in logs or commits

**Improvements Needed**:
1. **Implement Secret Rotation**
   - Automated JWT secret rotation (monthly)
   - Grace period for old secrets (7 days)
   - Seamless user experience (no re-login)

2. **Use Secret Manager**
   - Move to environment-based secrets (Docker secrets)
   - Or implement HashiCorp Vault integration
   - Encrypted secret storage

3. **Add Secret Auditing**
   - Log all secret access
   - Monitor for suspicious patterns
   - Alert on unauthorized access

**Implementation**: 6-8 hours

---

### 3. ❌ No Automated Security Scanning (Priority: CRITICAL)

**Current State**: Manual security reviews only

**Missing Components**:

#### A. Dependency Vulnerability Scanning
- **Tool**: npm audit (built-in)
- **Frequency**: Every commit (CI/CD)
- **Action**: Block high/critical vulnerabilities
- **Time**: 2 hours to setup

#### B. SAST (Static Application Security Testing)
- **Tool**: SonarQube or Snyk Code
- **Scans**: Code quality + security vulnerabilities
- **Integration**: GitHub Actions
- **Time**: 4 hours to setup

#### C. DAST (Dynamic Application Security Testing)
- **Tool**: OWASP ZAP or Burp Suite
- **Scans**: Running application for vulnerabilities
- **Frequency**: Weekly automated scans
- **Time**: 6 hours to setup

#### D. Container Security Scanning
- **Tool**: Trivy or Snyk Container
- **Scans**: Docker images for vulnerabilities
- **Integration**: CI/CD pipeline
- **Time**: 2 hours to setup

**Total Implementation**: 14 hours

---

## 📋 Security Hardening Implementation Plan

### PHASE 1: Immediate Actions (Day 1-2, 8 hours)

**Priority**: Fix critical security gaps

#### Task 1.1: Setup Dependency Vulnerability Scanning (2 hours)
**Tool**: npm audit + GitHub Dependabot

**Steps**:
1. Enable GitHub Dependabot alerts
2. Add npm audit to CI/CD pipeline
3. Configure auto-PR for security updates
4. Set vulnerability threshold (block critical)

**Acceptance Criteria**:
- ✅ Dependabot alerts enabled
- ✅ npm audit runs on every PR
- ✅ Critical vulnerabilities block merge
- ✅ Weekly dependency update PRs

**Files to Create**:
- `.github/dependabot.yml`
- `.github/workflows/security-scan.yml`

---

#### Task 1.2: Implement API Gateway Pattern (6 hours)
**File**: `backend/middleware/apiGateway.middleware.js` (NEW)

**Features**:
1. **Request Logging**
   - Log all API requests (method, path, IP, user)
   - Response time tracking
   - Error logging

2. **Global Security Policies**
   - Enforce authentication on sensitive routes
   - Apply rate limiting globally
   - Add security headers

3. **Traffic Analytics**
   - Request count per endpoint
   - Popular endpoints tracking
   - Error rate monitoring

4. **Circuit Breaker**
   - Fail fast on downstream errors
   - Prevent cascade failures

**Implementation**:
```javascript
// backend/middleware/apiGateway.middleware.js
const apiGateway = () => {
  return async (req, res, next) => {
    // 1. Request ID generation
    req.requestId = generateRequestId();

    // 2. Request logging
    logger.info('API Request', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userId: req.userId
    });

    // 3. Start timer
    const startTime = Date.now();

    // 4. Track response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info('API Response', {
        requestId: req.requestId,
        statusCode: res.statusCode,
        duration
      });

      // Analytics
      trackEndpointUsage(req.path, duration);
    });

    next();
  };
};
```

**Acceptance Criteria**:
- ✅ All requests logged with unique ID
- ✅ Response time tracking enabled
- ✅ Traffic analytics dashboard
- ✅ Circuit breaker for critical services

---

### PHASE 2: Key Management Enhancement (Day 3, 6 hours)

#### Task 2.1: Implement JWT Secret Rotation (4 hours)
**File**: `backend/services/SecretRotationService.js` (NEW)

**Features**:
1. Automated monthly secret rotation
2. Grace period (7 days) for old secrets
3. Background token refresh for active users
4. Audit logging for all rotations

**Implementation**:
```javascript
// backend/services/SecretRotationService.js
class SecretRotationService {
  async rotateJWTSecrets() {
    // 1. Generate new secrets
    const newAccessSecret = crypto.randomBytes(64).toString('hex');
    const newRefreshSecret = crypto.randomBytes(64).toString('hex');

    // 2. Store in database with version
    await SecretVersion.create({
      type: 'jwt_access',
      secret: encrypt(newAccessSecret),
      version: currentVersion + 1,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    // 3. Mark old secret as deprecated
    await SecretVersion.update(
      { status: 'deprecated' },
      { where: { type: 'jwt_access', version: currentVersion } }
    );

    // 4. Log rotation
    logger.security('JWT secrets rotated', { version: currentVersion + 1 });
  }

  async getValidSecrets(type) {
    // Return current + deprecated secrets (grace period)
    return await SecretVersion.findAll({
      where: {
        type,
        status: ['active', 'deprecated'],
        validUntil: { [Op.gt]: new Date() }
      }
    });
  }
}
```

**Acceptance Criteria**:
- ✅ Secrets rotate automatically (monthly)
- ✅ Old secrets valid for 7 days
- ✅ Zero downtime during rotation
- ✅ Audit trail for all rotations

---

#### Task 2.2: Setup Secret Management System (2 hours)
**Option**: Use Docker Secrets or AWS Secrets Manager

**For Docker Deployment**:
```bash
# docker-compose.yml
services:
  backend:
    secrets:
      - jwt_access_secret
      - jwt_refresh_secret
      - db_password
      - encryption_key

secrets:
  jwt_access_secret:
    external: true
  jwt_refresh_secret:
    external: true
```

**Acceptance Criteria**:
- ✅ Secrets stored encrypted
- ✅ No plaintext secrets in .env
- ✅ Access control on secrets
- ✅ Rotation mechanism in place

---

### PHASE 3: Automated Security Scanning (Day 4-5, 14 hours)

#### Task 3.1: Setup SAST with SonarQube (4 hours)

**Install SonarQube**:
```bash
# docker-compose.yml
sonarqube:
  image: sonarqube:community
  ports:
    - "9000:9000"
  environment:
    - SONAR_JDBC_URL=jdbc:postgresql://postgres:5432/sonarqube
```

**GitHub Actions Integration**:
```yaml
# .github/workflows/sonar-scan.yml
name: SonarQube Scan
on: [push, pull_request]

jobs:
  sonar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: SonarQube Scan
        uses: sonarsource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
```

**Acceptance Criteria**:
- ✅ SonarQube running
- ✅ Scans on every PR
- ✅ Quality gate enforced (A or B rating)
- ✅ Security hotspots identified

---

#### Task 3.2: Setup DAST with OWASP ZAP (6 hours)

**Tool**: OWASP ZAP Docker
**Frequency**: Weekly + on-demand

**Script**:
```bash
# scripts/security-scan-zap.sh
#!/bin/bash

# Run ZAP scan against staging
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://staging.qcollector.com \
  -r zap-report.html \
  -J zap-report.json

# Fail if high vulnerabilities found
HIGH_VULNS=$(jq '.site[].alerts[] | select(.riskcode=="3")' zap-report.json | wc -l)
if [ $HIGH_VULNS -gt 0 ]; then
  echo "❌ Found $HIGH_VULNS high-risk vulnerabilities"
  exit 1
fi
```

**Acceptance Criteria**:
- ✅ Weekly automated scans
- ✅ HTML + JSON reports generated
- ✅ High/Critical vulnerabilities block deployment
- ✅ Scan results stored in artifacts

---

#### Task 3.3: Container Security with Trivy (2 hours)

**GitHub Actions**:
```yaml
# .github/workflows/container-scan.yml
name: Container Security Scan
on: [push]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t qcollector:${{ github.sha }} .

      - name: Run Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: qcollector:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

**Acceptance Criteria**:
- ✅ Docker images scanned on build
- ✅ Critical vulnerabilities block push
- ✅ Results uploaded to GitHub Security
- ✅ Automated PR for base image updates

---

#### Task 3.4: Setup Security Monitoring Dashboard (2 hours)

**Tool**: Grafana + Prometheus

**Metrics to Track**:
1. Failed login attempts per hour
2. Rate limit hits per endpoint
3. 4xx/5xx error rates
4. Authentication token refresh rate
5. API response times by endpoint
6. Active sessions count

**Alerts**:
- ⚠️ Failed login > 100/hour
- ⚠️ 5xx errors > 1%
- 🚨 Critical endpoint down
- 🚨 Unusual traffic spike

**Acceptance Criteria**:
- ✅ Grafana dashboard operational
- ✅ Real-time security metrics
- ✅ Alerts configured
- ✅ Historical data retention (90 days)

---

### PHASE 4: Documentation & Testing (Day 6, 4 hours)

#### Task 4.1: Security Documentation (2 hours)

**Files to Create**:
1. `SECURITY.md` - Security policy
2. `docs/security/README.md` - Security architecture
3. `docs/security/incident-response.md` - Incident response plan
4. `docs/security/audit-checklist.md` - Security audit checklist

**Content**:
- Security best practices
- Vulnerability disclosure policy
- Incident response procedures
- Security testing guide

---

#### Task 4.2: Security Testing (2 hours)

**Test Scenarios**:
1. ✅ SQL Injection attempts
2. ✅ XSS payload injection
3. ✅ CSRF token validation
4. ✅ Rate limit enforcement
5. ✅ Authorization bypass attempts
6. ✅ JWT token tampering
7. ✅ Encryption/decryption workflow

**Create Test Suite**:
```javascript
// tests/security/sql-injection.test.js
describe('SQL Injection Protection', () => {
  test('Should block SQL injection in login', async () => {
    const payload = {
      identifier: "admin' OR '1'='1",
      password: 'test'
    };
    const response = await request.post('/api/v1/auth/login').send(payload);
    expect(response.status).not.toBe(200);
  });
});
```

**Acceptance Criteria**:
- ✅ 20+ security test cases
- ✅ All tests passing
- ✅ Tests run in CI/CD
- ✅ Coverage > 80%

---

## 📊 Security Improvement Roadmap

### Week 1: Critical Fixes (Required)
- ✅ Dependency scanning setup
- ✅ API Gateway implementation
- ✅ JWT secret rotation
- ✅ SAST integration

### Week 2: Enhanced Monitoring (Important)
- ✅ DAST scanning
- ✅ Container security
- ✅ Security dashboard
- ✅ Automated alerts

### Week 3: Documentation & Compliance (Nice-to-have)
- ✅ Security documentation
- ✅ Incident response plan
- ✅ Security testing suite
- ✅ Penetration testing

---

## 🎯 Success Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Security Score** | 7/10 | 9/10 | 🟡 In Progress |
| **Vulnerability Count** | Unknown | 0 Critical | ⏳ Pending scan |
| **Test Coverage** | 45% | 80% | 🟡 In Progress |
| **Dependency Alerts** | Manual | Automated | ⏳ Pending |
| **Security Audit** | Never | Quarterly | ⏳ Pending |
| **Incident Response** | None | < 4 hours | ⏳ Pending |

---

## 📝 Implementation Checklist

### Phase 1: Immediate (Day 1-2) ⏰ 8 hours
- [ ] Enable GitHub Dependabot
- [ ] Setup npm audit in CI/CD
- [ ] Create API Gateway middleware
- [ ] Add request logging
- [ ] Implement circuit breaker
- [ ] Add traffic analytics

### Phase 2: Key Management (Day 3) ⏰ 6 hours
- [ ] Create SecretRotationService
- [ ] Implement rotation logic
- [ ] Setup Docker secrets
- [ ] Add audit logging
- [ ] Test rotation workflow

### Phase 3: Scanning (Day 4-5) ⏰ 14 hours
- [ ] Setup SonarQube
- [ ] Configure OWASP ZAP
- [ ] Implement Trivy scanning
- [ ] Create Grafana dashboard
- [ ] Configure alerts
- [ ] Test all scans

### Phase 4: Documentation (Day 6) ⏰ 4 hours
- [ ] Write SECURITY.md
- [ ] Create security docs
- [ ] Write incident response plan
- [ ] Create security tests
- [ ] Update CLAUDE.md

**Total Time**: 32 hours (4 working days)

---

## 🏆 Expected Outcomes

**After Implementation**:
- ✅ **Security Score**: 9/10 (from 7/10)
- ✅ **Zero Critical Vulnerabilities**
- ✅ **Automated Security Scanning**
- ✅ **Secret Management System**
- ✅ **API Gateway Pattern**
- ✅ **Security Monitoring Dashboard**
- ✅ **Comprehensive Documentation**
- ✅ **Production Ready** for enterprise deployment

---

## 🔄 Maintenance Schedule

### Daily:
- Automated dependency scans
- Security logs review
- Failed login monitoring

### Weekly:
- DAST scans (OWASP ZAP)
- Container security scans
- Security metrics review

### Monthly:
- JWT secret rotation
- Security audit
- Dependency updates
- Penetration testing

### Quarterly:
- Third-party security audit
- Incident response drill
- Security training
- Policy review

---

## 📚 Reference Documents

**Created**:
- `qtodo.md` - This comprehensive security plan
- `COMPREHENSIVE-TEST-REPORT.md` - Testing results
- `API_security.md` - Best practices checklist

**To Create**:
- `SECURITY.md` - Security policy
- `docs/security/` - Security documentation
- `.github/workflows/security-scan.yml` - CI/CD security
- `backend/middleware/apiGateway.middleware.js` - Gateway
- `backend/services/SecretRotationService.js` - Key rotation

---

**Status**: 🟡 **READY TO START** - Comprehensive plan approved
**Next Action**: Begin Phase 1 - Implement dependency scanning
**Timeline**: 4 working days (32 hours)
**Risk**: Low (all changes backward compatible)

