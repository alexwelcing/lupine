ARG CUDA_IMAGE=nvidia/cuda:12.6.3-runtime-ubuntu22.04
FROM ${CUDA_IMAGE}

ARG BACKEND=chgnet
ENV PYTHONUNBUFFERED=1
ENV MLIP_BACKEND=${BACKEND}

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

COPY gcp/mlip-cell-runner/requirements-common.txt ./
COPY gcp/mlip-cell-runner/requirements-${BACKEND}.txt ./requirements-backend.txt

RUN python3 -m pip install --no-cache-dir --upgrade pip \
    && python3 -m pip install --no-cache-dir -r requirements-backend.txt

COPY gcp/mlip-cell-runner/mlip_cell_runner.py ./

RUN useradd -m -u 1000 mlip
USER mlip

ENTRYPOINT ["python3", "/app/mlip_cell_runner.py"]
CMD ["--help"]
