FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    gnucobol \
    libcob4-dev \
    gcc \
    libc6-dev \
    make \
    xxd \
    netcat-openbsd \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY core/ /app/core/

RUN cd /app/core && make clean && make all

EXPOSE 9999

CMD ["/app/core/bin/bankcore_cli", "server", "/tmp/bankcore.sock", "9999"]
