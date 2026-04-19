FROM python:3.12-slim

# Use the AWS Lambda Web Adapter as a binary
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter

ENV LAMBDA_TASK_ROOT=/var/task
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY scripts/ ./scripts/
COPY model/ ./model/

# Set the environment variable for LWA to enable streaming
ENV AWS_LWA_INVOKE_MODE=response_stream

# Run standard uvicorn server (LWA will translate Lambda events to HTTP)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
