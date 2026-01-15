# Python 3.12 Migration Guide

## Overview

This guide provides step-by-step instructions for downgrading from Python 3.14.2 to Python 3.12.x to resolve ChromaDB compatibility issues. ChromaDB 1.4.1 uses Pydantic V1, which does not support Python 3.14+.

**Estimated Time**: 15-20 minutes

## Prerequisites

- Administrator access on Windows
- Active internet connection
- Backup of any important work (optional but recommended)

---

## Phase 1: Download and Install Python 3.12

### Step 1.1: Download Python 3.12

1. Visit the official Python downloads page: https://www.python.org/downloads/
2. Download **Python 3.12.8** (latest 3.12.x release as of Jan 2026)
   - Direct link: https://www.python.org/ftp/python/3.12.8/python-3.12.8-amd64.exe
3. Save the installer to your Downloads folder

### Step 1.2: Install Python 3.12

1. Run the downloaded installer (`python-3.12.8-amd64.exe`)
2. **IMPORTANT**: Check these boxes:
   - ✅ "Add python.exe to PATH"
   - ✅ "Install launcher for all users (recommended)"
3. Click "Customize installation"
4. Optional Features (keep all checked):
   - ✅ Documentation
   - ✅ pip
   - ✅ tcl/tk and IDLE
   - ✅ Python test suite
   - ✅ py launcher
5. Advanced Options:
   - ✅ Install for all users
   - ✅ Associate files with Python
   - ✅ Create shortcuts for installed applications
   - ✅ Add Python to environment variables
   - ✅ Precompile standard library
6. Installation location: `C:\Program Files\Python312\` (default)
7. Click "Install"
8. Wait for installation to complete
9. Click "Close"

### Step 1.3: Verify Python 3.12 Installation

Open a **NEW** Command Prompt (not the current one) and run:

```cmd
py -0p
```

You should see both Python 3.14 and Python 3.12 listed:
```
 -V:3.14          C:\Users\user\AppData\Local\Programs\Python\Python314\python.exe
 -V:3.12          C:\Program Files\Python312\python.exe
```

Verify Python 3.12 works:
```cmd
py -3.12 --version
```

Expected output: `Python 3.12.8`

---

## Phase 2: Clean Up Existing Virtual Environment

### Step 2.1: Deactivate Current Virtual Environment

In your current terminal (inside the project directory):

```cmd
deactivate
```

You should see the `(.venv)` prefix disappear from your prompt.

### Step 2.2: Delete Old Virtual Environment

**IMPORTANT**: Make sure you're in the project root directory first:

```cmd
cd C:\Users\user\Desktop\Projects\kiro-hackaton
```

Delete the old virtual environment:

```cmd
rmdir /s /q .venv
```

Verify it's deleted:

```cmd
dir .venv
```

Expected output: `File Not Found`

### Step 2.3: Clean Up Python Cache Files

Remove all Python bytecode cache files:

```cmd
for /d /r . %d in (__pycache__) do @if exist "%d" rmdir /s /q "%d"
```

Remove all `.pyc` files:

```cmd
del /s /q *.pyc
```

### Step 2.4: Clean Up Build Artifacts (Optional)

If you have any build artifacts:

```cmd
rmdir /s /q build
rmdir /s /q dist
rmdir /s /q *.egg-info
```

---

## Phase 3: Create New Virtual Environment with Python 3.12

### Step 3.1: Create Virtual Environment

Create a new virtual environment using Python 3.12:

```cmd
py -3.12 -m venv .venv
```

Wait for the virtual environment to be created (should take 10-30 seconds).

### Step 3.2: Activate Virtual Environment

Activate the new virtual environment:

```cmd
.venv\Scripts\activate
```

You should see `(.venv)` appear at the start of your prompt.

### Step 3.3: Verify Python Version

Verify you're using Python 3.12:

```cmd
python --version
```

Expected output: `Python 3.12.8`

Also verify pip is available:

```cmd
python -m pip --version
```

Expected output: `pip 24.x.x from C:\Users\user\Desktop\Projects\kiro-hackaton\.venv\Lib\site-packages\pip (python 3.12)`

### Step 3.4: Upgrade pip

Upgrade pip to the latest version:

```cmd
python -m pip install --upgrade pip
```

---

## Phase 4: Reinstall Dependencies

### Step 4.1: Install Core Dependencies First

Install numpy with constraints first (to avoid build-from-source issues):

```cmd
python -m pip install numpy==2.4.1
```

### Step 4.2: Install All Backend Dependencies

Install all dependencies from requirements.txt:

```cmd
python -m pip install -r backend\requirements.txt
```

This will install:
- FastAPI and related packages
- ChromaDB (should work now with Python 3.12)
- VoyageAI
- Docling
- SQLAlchemy with async support
- Testing frameworks (pytest, hypothesis)
- All other dependencies

**Expected time**: 3-5 minutes

### Step 4.3: Verify Critical Dependencies

Verify ChromaDB works:

```cmd
python -c "import chromadb; print('ChromaDB OK'); client = chromadb.Client(); print('ChromaDB Client OK')"
```

Expected output:
```
ChromaDB OK
ChromaDB Client OK
```

Verify VoyageAI:

```cmd
python -c "import voyageai; print('VoyageAI OK')"
```

Expected output: `VoyageAI OK`

Verify Docling:

```cmd
python -c "import docling; print('Docling OK')"
```

Expected output: `Docling OK`

### Step 4.4: Verify FastAPI Application

Test that the FastAPI application can start:

```cmd
python -c "from backend.main import app; print('FastAPI app loaded successfully')"
```

Expected output: `FastAPI app loaded successfully`

---

## Phase 5: Update Project Configuration

### Step 5.1: Update Python Version in Documentation

Update the Python version reference in project documentation:

**File**: `README.md`

Change:
```markdown
- Python 3.14.2
```

To:
```markdown
- Python 3.12.8
```

**File**: `.kiro/specs/foundation-phase/tasks.md`

Change:
```markdown
**Target Language**: Python 3.11+ (backend), TypeScript (frontend)
```

To:
```markdown
**Target Language**: Python 3.12+ (backend), TypeScript (frontend)
```

### Step 5.2: Update Constraints File (Optional)

The `constraints.txt` file can remain as-is since numpy==2.4.1 works with Python 3.12.

---

## Phase 6: Verify Installation

### Step 6.1: Run Backend Tests

Run the backend test suite to ensure everything works:

```cmd
cd backend
python -m pytest tests/ -v
```

All tests should pass (or show the same results as before).

### Step 6.2: Start Backend Server (Quick Test)

Start the backend server to verify it runs:

```cmd
python -m uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using WatchFiles
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

Press `CTRL+C` to stop the server.

### Step 6.3: Verify Frontend (Optional)

The frontend uses Node.js, so it should be unaffected. But verify it still works:

```cmd
cd ..\frontend
npm run dev
```

You should see the Vite dev server start. Press `CTRL+C` to stop.

---

## Phase 7: Update IDE/Editor Configuration

### Step 7.1: Update Kiro IDE Python Interpreter

If Kiro IDE has a Python interpreter setting:

1. Open Kiro settings
2. Navigate to Python interpreter settings
3. Select the new virtual environment: `C:\Users\user\Desktop\Projects\kiro-hackaton\.venv\Scripts\python.exe`
4. Restart Kiro IDE if necessary

### Step 7.2: Update VS Code (If Used)

If you use VS Code:

1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "Python: Select Interpreter"
3. Select: `Python 3.12.8 64-bit ('.venv': venv)`
4. Reload window if prompted

---

## Phase 8: Final Verification

### Step 8.1: Run Complete Test Suite

Run all tests to ensure everything works:

```cmd
cd C:\Users\user\Desktop\Projects\kiro-hackaton
.kiro\scripts\run-all-tests.cmd
```

Expected: All 114 tests should pass (55 backend + 59 frontend).

### Step 8.2: Verify Git Status

Check that no important files were accidentally modified:

```cmd
git status
```

You should see:
- Modified: `README.md` (Python version update)
- Modified: `.kiro/specs/foundation-phase/tasks.md` (Python version update)
- Untracked: `.kiro/documentation/python-3.12-migration-guide.md` (this guide)

The `.venv` directory should be ignored by `.gitignore`.

### Step 8.3: Create Checkpoint Commit

Commit the Python version updates:

```cmd
git add README.md .kiro/specs/foundation-phase/tasks.md
git commit -m "chore: migrate to Python 3.12 for ChromaDB compatibility"
```

---

## Troubleshooting

### Issue: Python 3.12 not found after installation

**Solution**: 
1. Close ALL terminal windows
2. Open a NEW terminal
3. Run `py -0p` again
4. If still not found, restart your computer

### Issue: ChromaDB still fails to import

**Solution**:
1. Verify you're in the virtual environment: `python --version` should show 3.12.x
2. Reinstall ChromaDB: `python -m pip uninstall chromadb -y && python -m pip install chromadb==1.4.1`
3. Clear pip cache: `python -m pip cache purge`

### Issue: "Access Denied" when deleting .venv

**Solution**:
1. Close all terminals and IDEs
2. Open a NEW Command Prompt as Administrator
3. Navigate to project directory
4. Run: `rmdir /s /q .venv`

### Issue: Dependencies fail to install

**Solution**:
1. Upgrade pip: `python -m pip install --upgrade pip`
2. Install dependencies one by one to identify the problematic package
3. Check internet connection
4. Try using `--no-cache-dir` flag: `python -m pip install --no-cache-dir -r backend\requirements.txt`

### Issue: Tests fail after migration

**Solution**:
1. Delete all `__pycache__` directories: `for /d /r . %d in (__pycache__) do @if exist "%d" rmdir /s /q "%d"`
2. Reinstall test dependencies: `python -m pip install pytest pytest-asyncio hypothesis pytest-mock`
3. Run tests with verbose output: `python -m pytest tests/ -vv`

---

## Rollback Plan (If Needed)

If you need to rollback to Python 3.14:

1. Deactivate virtual environment: `deactivate`
2. Delete .venv: `rmdir /s /q .venv`
3. Create new venv with Python 3.14: `py -3.14 -m venv .venv`
4. Activate: `.venv\Scripts\activate`
5. Reinstall dependencies: `python -m pip install -r backend\requirements.txt`

**Note**: ChromaDB will still not work with Python 3.14.

---

## Post-Migration Checklist

- [ ] Python 3.12.8 installed successfully
- [ ] Old virtual environment deleted
- [ ] New virtual environment created with Python 3.12
- [ ] All dependencies installed successfully
- [ ] ChromaDB imports without errors
- [ ] Backend tests pass
- [ ] Backend server starts successfully
- [ ] Frontend still works
- [ ] IDE/Editor configured with new Python interpreter
- [ ] Documentation updated with Python 3.12 version
- [ ] Changes committed to git

---

## Summary

After completing this migration:

- ✅ Python 3.12.8 installed and configured
- ✅ Virtual environment recreated with Python 3.12
- ✅ All dependencies reinstalled and verified
- ✅ ChromaDB now works without Pydantic V1 errors
- ✅ Ready to continue with Task 2.1 (Database Layer implementation)

**Next Steps**: Return to `.kiro/specs/foundation-phase/tasks.md` and continue with Task 2.1.

---

## Additional Resources

- [Python 3.12 Release Notes](https://docs.python.org/3.12/whatsnew/3.12.html)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Pydantic V1 vs V2 Compatibility](https://docs.pydantic.dev/latest/migration/)
- [Virtual Environments in Python](https://docs.python.org/3/library/venv.html)

---

**Document Version**: 1.0  
**Last Updated**: January 15, 2026  
**Author**: Kiro AI Assistant  
**Status**: Ready for execution
