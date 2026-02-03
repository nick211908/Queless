from fastapi import FastAPI
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://queueless2026.netlify.app", "http://localhost:5173"], # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Placeholder for router inclusion
from app.routers import queue, presence, service_flow, admin, organizations, auth
app.include_router(queue.router, prefix=f"{settings.API_V1_STR}/queue", tags=["Queue"])
app.include_router(presence.router, prefix=f"{settings.API_V1_STR}/presence", tags=["Presence"])
app.include_router(service_flow.router, prefix=f"{settings.API_V1_STR}/flow", tags=["Service Flow"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Admin"])
app.include_router(organizations.router, prefix=f"{settings.API_V1_STR}/organizations", tags=["Organizations"])
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])

@app.get("/")
async def root():
    return {"message": "QueueLess+ System Active", "version": "0.1.0"}
