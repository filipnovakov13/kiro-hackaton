# Postman Power Setup Guide for Iubar

## Overview
The Postman Power is already installed and ready to use for automated API testing of your Iubar backend.

## Step 1: Get Your Postman API Key

1. Go to [postman.com](https://postman.com) and log in
2. Navigate to **Settings** → **API Keys**
3. Click **Generate API Key**
4. Give it a name like "Kiro Iubar Testing"
5. Select permissions:
   - ✅ Workspace management
   - ✅ Collection read/write
   - ✅ Environment read/write
   - ✅ Collection runs
6. Copy the generated API key

## Step 2: Configure the API Key

You have two options:

### Option A: Environment Variable (Recommended)
Set the environment variable on your system:
```bash
# Windows (PowerShell)
$env:POSTMAN_API_KEY="your_api_key_here"

# Windows (CMD)
set POSTMAN_API_KEY=your_api_key_here

# Add to your system environment variables permanently:
# Settings → System → About → Advanced system settings → Environment Variables
```

### Option B: Backend .env File
Edit `backend/.env` and replace:
```
POSTMAN_API_KEY=your_postman_api_key_here
```
with your actual API key.

## Step 3: Verify Setup

After setting the API key, restart Kiro IDE to load the new configuration.

## What's Already Configured

✅ **Postman Power**: Installed and connected to Postman's MCP server
✅ **Hook Created**: `.kiro/hooks/api-postman-testing.kiro.hook`
✅ **Config File**: `.postman.json` ready to store workspace/collection IDs
✅ **Auto-trigger**: Tests run automatically when you edit API files

## Your API Endpoints to Test

The following endpoints will be included in your Postman collection:

1. **POST /api/documents/upload**
   - Upload PDF, DOCX, TXT, MD files
   - Test file size limits (10MB)
   - Test unsupported file types (415 error)
   - Test file too large (413 error)

2. **POST /api/documents/url**
   - Ingest content from URLs
   - Test invalid URLs (400 error)

3. **GET /api/documents/status/{task_id}**
   - Poll processing status
   - Test task not found (404 error)

4. **GET /api/documents**
   - List all documents
   - Verify chunk counts

5. **GET /api/documents/{document_id}**
   - Get document details
   - Test document not found (404 error)

6. **DELETE /api/documents/{document_id}**
   - Delete document and associated data
   - Test deletion failed (500 error)

7. **GET /**
   - Root endpoint health check

8. **GET /health**
   - Health check endpoint

9. **GET /api/status**
   - System status (database, vector store, API keys, storage)

## Next Steps

Once you've configured your API key, you can:

1. **Create the Postman Collection**:
   ```
   Ask Kiro: "Create a Postman collection for my Iubar API with all endpoints and tests"
   ```

2. **Run Tests Manually**:
   ```
   Ask Kiro: "Run my Postman collection tests"
   ```

3. **Automatic Testing**:
   - Edit any file in `backend/app/api/`, `backend/app/services/`, etc.
   - The hook will automatically trigger and run tests
   - Results will appear in chat with fix suggestions

## Troubleshooting

**"Collection not found"**
- Make sure `.postman.json` has valid IDs
- Run: "Create a Postman collection for my API"

**"Invalid API key"**
- Verify the key is set correctly
- Check permissions include workspace, collection, and environment access
- Try regenerating the key

**Tests fail**
- Ensure backend server is running: `python backend/main.py`
- Check environment variables in `backend/.env`
- Verify database and storage paths exist

## Benefits of Postman Power

✅ **Automated Testing**: Tests run on every code change
✅ **Comprehensive Coverage**: All endpoints, error cases, and workflows
✅ **Fast Feedback**: Know immediately if changes break the API
✅ **Documentation**: Collection serves as living API documentation
✅ **CI/CD Ready**: Can be integrated into deployment pipelines
✅ **Cost Tracking**: Monitor API performance and response times

## Advanced Usage

### Environment Variables
Create different environments for:
- **Local**: `http://localhost:8000`
- **Staging**: Your staging server URL
- **Production**: Your production server URL

### Test Scripts
Add custom test scripts to:
- Validate response schemas
- Check performance thresholds
- Verify data integrity
- Test edge cases

### Mock Servers
Create mock servers for:
- Frontend development without backend
- Testing error scenarios
- Load testing

---

**Ready to start?** Just say: "Create my Postman collection" and I'll set everything up!
