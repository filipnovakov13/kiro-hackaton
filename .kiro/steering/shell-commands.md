# Shell Command Guidelines for Windows CMD

## Known Bug: executePwsh cwd Parameter

The `executePwsh` tool has a bug where it generates PowerShell syntax (`cd "path" ; command`) even when running in CMD shell, causing commands to fail.

**Workaround: Use `cmd /c` with `&` separator**

## Correct Command Format

### ALWAYS use this pattern:
```
command: "cmd /c cd /d frontend & npm test"
```

Do NOT use the `cwd` parameter - it's broken. Instead, include the directory change in the command itself using CMD syntax.

## Command Templates

### Frontend Tests (Unit)
```
command: "cmd /c cd /d frontend & npm test"
```

### Frontend Tests (Playwright)
```
command: "cmd /c cd /d frontend & npx playwright test"
```

### Frontend Tests (Specific Playwright file)
```
command: "cmd /c cd /d frontend & npx playwright test tests/ux-validation.spec.ts"
```

### Backend Tests (pytest)
```
command: "cmd /c cd /d backend & python -m pytest"
```

### Install Dependencies (Frontend)
```
command: "cmd /c cd /d frontend & npm install"
```

### Install Dependencies (Backend)
```
command: "cmd /c cd /d backend & pip install -r requirements.txt"
```

### Start Dev Server (use controlPwshProcess for long-running)
```
command: "cmd /c cd /d frontend & npm run dev"
```

### Build Frontend
```
command: "cmd /c cd /d frontend & npm run build"
```

## Syntax Rules

1. **Always prefix with `cmd /c`** - ensures CMD interpreter is used
2. **Use `cd /d`** - the `/d` flag allows changing drives if needed
3. **Use `&` as separator** - CMD command separator (not `;` which is PowerShell)
4. **Use relative paths** - `frontend`, `backend`, not absolute paths
5. **Do NOT use `cwd` parameter** - it's broken, ignore it

## Multiple Commands

Chain multiple commands with `&`:
```
command: "cmd /c cd /d frontend & npm install & npm test"
```

## Troubleshooting

If you see errors like:
- `The system cannot find the path specified`
- Commands with `cd "path" ;` failing

You're hitting the bug. Use the `cmd /c cd /d path &` workaround instead.
