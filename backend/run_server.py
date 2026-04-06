import uvicorn
from main import app

if __name__ == "__main__":
    print("Starting Option Seeker Backend on port 8000...")
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)
