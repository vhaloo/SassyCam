# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[('C:\\Users\\Vhaloo\\SassyCam\\venv\\Lib\\site-packages\\torch\\lib\\libiomp5md.dll', '.')],
    datas=[],
    hiddenimports=['scipy.special.cython_special', 'tiktoken_ext.openai_public', 'tiktoken_ext', 'win32timezone', 'whisper'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=['rthook_torch.py'],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='SassyCam',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='NONE',
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='SassyCam',
)
