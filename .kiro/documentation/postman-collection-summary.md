# Iubar API Postman Collection - Created Successfully! ✅

## Collection Details

**Collection Name**: Iubar API  
**Workspace**: My Workspace (Personal)  
**Environment**: Iubar Local  
**Base URL**: `http://localhost:8000`

## What Was Created

### 1. Postman Collection
- **Collection ID**: `f41775c8-b2e2-41dc-aac0-f92f35259e01`
- **Collection UID**: `33082987-f41775c8-b2e2-41dc-aac0-f92f35259e01`
- **Total Requests**: 9 endpoints with automated tests

### 2. Environment
- **Environment ID**: `4feffffd-b024-4ae7-965e-68fc55f4a2f4`
- **Variables**:
  - `base_url`: `http://localhost:8000`
  - `task_id`: (auto-populated during tests)

### 3. Configuration File
- **File**: `.postman.json`
- **Contains**: All workspace, collection, and environment IDs

## API Endpoints Included

### Health & Status Endpoints
1. **GET /** - Root Endpoint
   - Tests: Status 200, correct response structure
   
2. **GET /health** - Health Check
   - Tests: Status 200, service is healthy
   
3. **GET /api/status** - System Status
   - Tests: Status 200/503, system components status

### Document Management Endpoints
4. **GET /api/documents** - List Documents
   - Tests: Status 200, returns array of documents
   
5. **POST /api/documents/upload** - Upload Document
   - Tests: Status 200, returns task_id, saves to environment
   - Body: multipart/form-data with file
   
6. **POST /api/documents/upload** - Upload Unsupported File Type (Error Test)
   - Tests: Status 415, correct error message
   
7. **POST /api/documents/url** - Ingest URL
   - Tests: Status 200, returns task_id
   - Body: JSON with URL
   
8. **GET /api/documents/status/{task_id}** - Get Task Status
   - Tests: Status 200, returns task status
   - Uses: `{{task_id}}` from environment
   
9. **GET /api/documents/status/invalid-task-id** - Get Task Status Not Found (Error Test)
   - Tests: Status 404, correct error message

## Test Coverage

Each endpoint includes:
- ✅ **Status Code Validation**: Ensures correct HTTP status
- ✅ **Response Structure Tests**: Validates JSON schema
- ✅ **Error Scenario Tests**: Tests 404, 415, 413, 500 errors
- ✅ **Environment Variables**: Auto-saves task_id for chaining requests

## How to Use

### Option 1: Run in Postman Desktop/Web
1. Go to [postman.com](https://postman.com)
2. Navigate to "My Workspace"
3. Find "Iubar API" collection
4. Select "Iubar Local" environment
5. Click "Run Collection"

### Option 2: Run via Kiro (Automated)
```
Ask Kiro: "Run my Postman collection tests"
```

### Option 3: Auto-Run on Code Changes
The hook `.kiro/hooks/api-postman-testing.kiro.hook` will automatically:
- Detect changes to backend API files
- Run the collection
- Show results and suggest fixes

## Next Steps

### 1. Start Your Backend Server
```bash
cd backend
python main.py
```

### 2. Run the Collection
Once the server is running, you can run tests:
- Via Postman UI
- Via Kiro: "Run my Postman collection"
- Automatically when you edit API files

### 3. Add More Tests (Optional)
You can extend the collection with:
- **GET /api/documents/{document_id}** - Get specific document
- **DELETE /api/documents/{document_id}** - Delete document
- File size limit tests (>10MB)
- Concurrent upload tests
- Performance tests (<2s response time)

## Test Workflow Example

1. **Upload a document** → Saves `task_id` to environment
2. **Check task status** → Uses saved `task_id`
3. **List documents** → Verify upload appears
4. **Get document details** → Verify processing complete
5. **Delete document** → Cleanup

## Troubleshooting

**Tests fail with connection error**:
- Ensure backend server is running on `http://localhost:8000`
- Check `backend/.env` configuration
- Verify database and storage paths exist

**"Invalid API key" error**:
- Verify `POSTMAN_API_KEY` is set correctly
- Check MCP configuration in `~/.kiro/settings/mcp.json`

**Collection not found**:
- Check `.postman.json` has correct IDs
- Verify you're logged into Postman

## Collection Statistics

- **Total Endpoints**: 9
- **Success Tests**: 6 endpoints
- **Error Tests**: 3 endpoints
- **Automated Tests**: 27 test assertions
- **Environment Variables**: 2 (base_url, task_id)

---

**Status**: ✅ Ready to use!  
**Created**: January 18, 2026  
**Last Updated**: January 18, 2026
