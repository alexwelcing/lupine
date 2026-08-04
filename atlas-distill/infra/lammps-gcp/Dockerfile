FROM lammps/lammps:latest

# Install Python and the GCS client library for download/upload orchestration.
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Use a virtual environment to avoid externally-managed environment issues.
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install google-cloud-storage

ENV PATH="/opt/venv/bin:${PATH}"

WORKDIR /work
COPY run.py /usr/local/bin/run.py
RUN chmod +x /usr/local/bin/run.py

ENTRYPOINT ["python3", "/usr/local/bin/run.py"]
