import os
import zipfile

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ANDROID_DIR = os.path.join(ROOT_DIR, "android")
PUBLIC_DIR = os.path.join(ROOT_DIR, "public")
ZIP_OUTPUT = os.path.join(PUBLIC_DIR, "solar_iot_android_source.zip")

print("Building Android project source zip...")

if not os.path.exists(ANDROID_DIR):
    print("Warning: android/ folder does not exist.")
else:
    with zipfile.ZipFile(ZIP_OUTPUT, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(ANDROID_DIR):
            for file in files:
                full_path = os.path.join(root, file)
                arcname = os.path.relpath(full_path, ROOT_DIR)
                zipf.write(full_path, arcname)

    print(f"Android source zip created: {ZIP_OUTPUT} ({os.path.getsize(ZIP_OUTPUT)} bytes)")
