---
inclusion: manual
---

# Shell Commands (Windows CMD)

## Known Bug: executePwsh cwd Parameter
The `executePwsh` tool generates PowerShell syntax even in CMD shell, causing failures.

**Workaround**: Use `cmd /c` with `&` separator instead of `cwd` parameter.

## Command Format
```
command: "cmd /c cd /d <directory> & <command>"
```

## Templates

### Frontend Tests
```bash
# Unit tests
cmd /c cd /d frontend & npm test

# Playwright
cmd /c cd /d frontend & npx playwright test

# Specific Playwright file
cmd /c cd /d frontend & npx playwright test tests/ux-validation.spec.ts
```

### Backend Tests
```bash
cmd /c cd /d backend & python -m pytest
```

### Dependencies
```bash
# Frontend
cmd /c cd /d frontend & npm install

# Backend
cmd /c cd /d backend & pip install -r requirements.txt
```

### Dev Server (use controlPwshProcess)
```bash
cmd /c cd /d frontend & npm run dev
```

### Build
```bash
cmd /c cd /d frontend & npm run build
```

## Syntax Rules
1. **Always prefix with `cmd /c`** - ensures CMD interpreter
2. **Use `cd /d`** - `/d` flag allows changing drives
3. **Use `&` as separator** - CMD command separator (not `;` which is PowerShell)
4. **Use relative paths** - `frontend`, `backend`, not absolute
5. **Do NOT use `cwd` parameter** - it's broken

## Multiple Commands
Chain with `&`:
```bash
cmd /c cd /d frontend & npm install & npm test
```

