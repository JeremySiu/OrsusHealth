FROM public.ecr.aws/lambda/python:3.12

# Copy requirements and install dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Copy application code
COPY app/ ${LAMBDA_TASK_ROOT}/app/
COPY scripts/ ${LAMBDA_TASK_ROOT}/scripts/
COPY model/ ${LAMBDA_TASK_ROOT}/model/

# Set the Lambda handler
CMD ["app.handler.handler"]
