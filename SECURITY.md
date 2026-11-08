# Security & Deployment Guide

## 🔒 Security Features

### Authentication & Authorization
- **Dual Authentication**: Supports both cookie-based (web) and API token authentication
- **Secure Sessions**: HTTP-only cookies with JWT encryption
- **Token Management**: 64-character cryptographically secure API tokens
- **Hashed Tokens**: API token values are stored as SHA-256 digests and shown only once
- **Token Revocation**: Ability to revoke tokens instantly
- **MCP OAuth**: Authorization code + PKCE, scoped note access, expiring tokens, and client revocation

### SQL Injection Prevention
- ✅ All database queries use parameterized queries via template literals
- ✅ No string concatenation in SQL queries
- ✅ Input validation on all endpoints

### Rate Limiting
- Default: 100 requests per minute per user/token
- Prevents brute force attacks
- Prevents API abuse
- In-memory implementation (consider Redis for production scaling)

### Input Validation
- ✅ All required fields validated
- ✅ Type checking on all inputs
- ✅ Length constraints enforced
- ✅ Email format validation
- ✅ Date validation with business logic

### Security Headers
Recommended headers (configure in middleware):
```javascript
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### Password Security
- Minimum 6 characters (recommend 12+ for production)
- Encrypted using AES with session secret
- Consider bcrypt for password hashing in production

## ⚠️ Critical Security Recommendations

### Before Going to Production:

1. **Change Default Password**
   - Default password is in `schema.sql`
   - Change immediately after first deployment
   - Use strong password (12+ characters, mixed case, numbers, symbols)

2. **Environment Variables**
   - Never commit `.env.local` to version control
   - Use strong, random `SESSION_SECRET` (minimum 32 characters)
   - Keep `DATABASE_URL` secure
   ```bash
   # Generate a strong secret
   openssl rand -base64 32
   ```

3. **Database Security**
   - Use SSL/TLS for database connections
   - Restrict database access by IP
   - Regular backups
   - Use read-only replicas for reporting

4. **HTTPS Only**
   - Always use HTTPS in production
   - Enable HSTS (HTTP Strict Transport Security)
   - Redirect HTTP to HTTPS

5. **CORS Configuration**
   - Set specific allowed origins (not `*`)
   - Configure in environment variables
   ```env
   ALLOWED_ORIGIN=https://your-domain.com
   ```

6. **Rate Limiting Enhancement**
   - Consider Redis-based rate limiting for multi-instance deployments
   - Different limits for different endpoints
   - IP-based rate limiting for public endpoints

7. **API Token Security**
   - Store tokens securely on client side (encrypted storage)
   - Never expose tokens in logs or error messages
   - Implement token expiration (add expiry field to database)
   - Regular token rotation policy

8. **Monitoring & Logging**
   - Log all authentication attempts
   - Monitor for suspicious activity
   - Set up alerts for:
     - Multiple failed login attempts
     - Unusual API usage patterns
     - Database errors
   - Use application monitoring (Sentry, LogRocket, etc.)

9. **Database Indexes**
   - ✅ Already configured in schema.sql
   - Ensure they're created in production

10. **Regular Security Updates**
    - Keep dependencies updated
    - Run `npm audit` regularly
    - Subscribe to security advisories

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Change default admin password
- [ ] Generate strong SESSION_SECRET
- [ ] Configure ALLOWED_ORIGIN for CORS
- [ ] Set up production database (Neon, Supabase, etc.)
- [ ] Run database schema (`schema.sql`)
- [ ] Test all API endpoints
- [ ] Configure environment variables in deployment platform
- [ ] Set up SSL certificate
- [ ] Configure custom domain

### Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Environment Variables**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add:
     - `DATABASE_URL`
     - `SESSION_SECRET`
     - `ALLOWED_ORIGIN`

4. **Domain Configuration**
   - Add custom domain in Vercel dashboard
   - Configure DNS records
   - SSL is automatic with Vercel

### Database Setup

1. **Create Database**
   - Neon (recommended): https://neon.tech
   - Supabase: https://supabase.com
   - Other PostgreSQL providers

2. **Run Schema**
   ```bash
   psql $DATABASE_URL < schema.sql
   ```

3. **Verify Tables**
   ```sql
   \dt -- List all tables
   SELECT id, name, created_at, last_used, revoked FROM api_tokens;
   SELECT * FROM notes LIMIT 5;
   ```

### Post-Deployment

- [ ] Test authentication (web and API token)
- [ ] Create first API token via web interface
- [ ] Test API endpoints with token
- [ ] Verify rate limiting works
- [ ] Check error logging
- [ ] Monitor application performance
- [ ] Set up uptime monitoring
- [ ] Configure backups

## 🔍 Security Testing

### Manual Testing

1. **Authentication**
   ```bash
   # Should fail without auth
   curl https://your-domain.com/api/notes
   
   # Should succeed with token
   curl -H "X-API-Token: YOUR_TOKEN" https://your-domain.com/api/notes
   ```

2. **Rate Limiting**
   ```bash
   # Run multiple requests quickly
   for i in {1..150}; do
     curl -H "X-API-Token: YOUR_TOKEN" https://your-domain.com/api/notes
   done
   # Should see 429 errors after 100 requests
   ```

3. **Input Validation**
   ```bash
   # Test missing required fields
   curl -X POST https://your-domain.com/api/notes \
     -H "X-API-Token: YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"title": ""}'
   # Should return 400 error
   ```

4. **SQL Injection Attempts** (should all fail)
   ```bash
   curl -X POST https://your-domain.com/api/notes \
     -H "X-API-Token: YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"title": "Test", "body": "'; DROP TABLE notes; --"}'
   # Should be safely escaped
   ```

## 📊 Monitoring & Maintenance

### What to Monitor

1. **Application Metrics**
   - Response times
   - Error rates
   - API usage patterns
   - Most used endpoints

2. **Database Performance**
   - Query execution times
   - Connection pool usage
   - Database size
   - Slow queries

3. **Security Events**
   - Failed authentication attempts
   - Rate limit violations
   - Unusual API patterns
   - Token creation/revocation

### Regular Maintenance

**Weekly:**
- Review error logs
- Check API usage statistics
- Monitor disk space

**Monthly:**
- Update dependencies
- Review security logs
- Backup verification
- Performance optimization

**Quarterly:**
- Security audit
- Token rotation policy review
- Database cleanup (old notifications, etc.)
- Disaster recovery testing

## 🐛 Common Security Issues & Fixes

### Issue: Rate Limit Not Working
**Solution**: Rate limiting uses in-memory storage. With multiple server instances, use Redis:
```javascript
// lib/ratelimit-redis.js
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
```

### Issue: CORS Errors
**Solution**: Configure allowed origins in environment variables and middleware

### Issue: Token Exposed in Logs
**Solution**: Sanitize logs to remove sensitive data

### Issue: Slow API Response
**Solution**: 
- Check database indexes
- Implement caching for frequently accessed data
- Use database connection pooling

## 📞 Support & Resources

- GitHub Issues: Report bugs and security vulnerabilities
- Documentation: README.md
- Database: Check schema.sql for structure

## 🔐 Vulnerability Disclosure

If you discover a security vulnerability, please email security@your-domain.com instead of creating a public issue.

---

**Last Updated**: January 2026
**Version**: 1.0.0
