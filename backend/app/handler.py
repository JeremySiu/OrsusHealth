from mangum import Mangum
from app.main import app

# Mangum translates API Gateway events into ASGI requests for FastAPI
handler = Mangum(app, lifespan="off")
