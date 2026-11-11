import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    reload = os.environ.get("RELOAD", "false").lower() in {"1", "true", "yes"}

    print("\n" + "=" * 60)
    print("ElectroPhone Store - Backend FastAPI")
    print(f"Swagger:     http://127.0.0.1:{port}/docs")
    print(f"ReDoc:       http://127.0.0.1:{port}/redoc")
    print(f"Health:      http://127.0.0.1:{port}/health")
    print("Frontend:    http://localhost:5173")
    print("=" * 60 + "\n")

    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=reload)
