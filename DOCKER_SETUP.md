# Docker Setup Guide for Email Sorting AI

This guide will help you set up and run the Email Sorting AI application using Docker with MongoDB Atlas.

## Prerequisites

- Docker and Docker Compose installed
- MongoDB Atlas account (free tier available at https://www.mongodb.com/cloud/atlas)
- Google Cloud Console project with OAuth credentials
- Anthropic API key for Claude AI

## Quick Start

```bash
# 1. Copy environment variables template
cp .env.example .env

# 2. Edit .env file with your credentials (see Configuration section below)
nano .env  # or use your preferred editor

# 3. Configure MongoDB Atlas IP whitelist (IMPORTANT - see section below)

# 4. Build and start containers
docker-compose up --build

# 5. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
```

## MongoDB Atlas Configuration (CRITICAL)

The most common error when running this application in Docker is:
```
MongooseServerSelectionError: Could not connect to any servers in your MongoDB Atlas cluster
```

This happens because **MongoDB Atlas blocks connections from IP addresses that aren't whitelisted**.

### Solution 1: Allow All IPs (Development Only)

⚠️ **For development/testing only** - Not recommended for production

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Select your cluster
3. Click on "Network Access" in the left sidebar
4. Click "Add IP Address"
5. Choose "Allow Access from Anywhere"
6. Or manually enter: `0.0.0.0/0`
7. Click "Confirm"

### Solution 2: Whitelist Your Public IP (Recommended)

For better security:

1. Find your public IP address:
   ```bash
   curl ifconfig.me
   ```
2. Go to MongoDB Atlas → Network Access
3. Click "Add IP Address"
4. Enter your public IP address
5. Click "Confirm"

**Note:** If you're behind a dynamic IP (home internet), you may need to update this periodically.

### Solution 3: VPC Peering (Production)

For production deployments on AWS, GCP, or Azure:
- Use VPC Peering or Private Endpoints
- See [MongoDB Atlas VPC Peering Documentation](https://www.mongodb.com/docs/atlas/security-vpc-peering/)

## Environment Configuration

### 1. Create .env File

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

### 2. Configure Required Variables

#### MongoDB (REQUIRED)

```env
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/email-sorter?retryWrites=true&w=majority
```

**How to get this:**
1. Go to MongoDB Atlas
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<username>` and `<password>` with your database credentials

#### Google OAuth (REQUIRED)

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

**How to get these:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Gmail API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: Web application
6. Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
7. Copy Client ID and Client Secret

#### Claude AI (REQUIRED)

```env
CLAUDE_API_KEY=sk-ant-api03-your-api-key
```

**How to get this:**
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an account or sign in
3. Go to API Keys
4. Create a new API key

#### Security Secrets (REQUIRED)

Generate random secrets:

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate session secret
openssl rand -base64 32
```

Add to `.env`:
```env
JWT_SECRET=your-generated-jwt-secret
SESSION_SECRET=your-generated-session-secret
```

## Docker Commands

### Start the Application

```bash
# Build and start in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Stop the Application

```bash
# Stop containers
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Rebuild After Code Changes

```bash
# Rebuild specific service
docker-compose up -d --build backend

# Rebuild all services
docker-compose up -d --build
```

### Access Container Shell

```bash
# Backend shell
docker exec -it email-sorter-backend sh

# Frontend shell
docker exec -it email-sorter-frontend sh
```

## Troubleshooting

### MongoDB Connection Issues

**Error:** `MongooseServerSelectionError`

**Solutions:**
1. ✅ Check MongoDB Atlas IP whitelist (see section above)
2. ✅ Verify DATABASE_URL in .env is correct
3. ✅ Test connection string with MongoDB Compass
4. ✅ Check MongoDB Atlas cluster is running (not paused)

```bash
# Test from container
docker exec -it email-sorter-backend sh
curl -v telnet://your-cluster.mongodb.net:27017
```

### Port Conflicts

**Error:** `Bind for 0.0.0.0:5000 failed: port is already allocated`

**Solution:**
```bash
# Find process using port
lsof -i :5000  # or :3000

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "5001:5000"  # Change external port
```

### Permission Issues

**Error:** `Permission denied` when building

**Solution:**
```bash
# Fix permissions
sudo chown -R $USER:$USER .

# Or run with sudo (not recommended)
sudo docker-compose up --build
```

### Container Keeps Restarting

**Check logs:**
```bash
docker-compose logs backend
```

**Common causes:**
- Missing environment variables
- MongoDB connection failure
- Invalid Google OAuth credentials
- Port conflicts

### Health Check Failures

**Check health status:**
```bash
docker ps

# Test health endpoint
curl http://localhost:5000/health
```

## Production Deployment

For production deployment:

1. **Use proper secrets management**
   - AWS Secrets Manager, GCP Secret Manager, or Azure Key Vault
   - Never commit .env files to git

2. **Configure MongoDB Atlas properly**
   - Use VPC Peering or Private Endpoints
   - Restrict IP access to your server IPs only
   - Enable authentication and encryption

3. **Use environment-specific settings**
   - Set `NODE_ENV=production`
   - Enable HTTPS with SSL certificates
   - Configure proper CORS origins
   - Use production-grade session store (Redis)

4. **Monitor your application**
   - Set up logging (ELK stack, CloudWatch, etc.)
   - Configure alerts for errors
   - Monitor container health

5. **Optimize Docker images**
   - Use multi-stage builds (already configured)
   - Minimize image size
   - Scan for vulnerabilities

## Additional Resources

- [MongoDB Atlas Documentation](https://www.mongodb.com/docs/atlas/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Anthropic API Documentation](https://docs.anthropic.com/)

## Support

If you encounter issues:

1. Check logs: `docker-compose logs -f`
2. Verify environment variables in `.env`
3. Test MongoDB connection separately
4. Ensure all required ports are available
5. Check Docker daemon is running

For MongoDB Atlas specific issues, refer to their [troubleshooting guide](https://www.mongodb.com/docs/atlas/troubleshoot-connection/).
