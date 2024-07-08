FROM node:18

# expose envs
ARG BASE_URL
ARG TURSO_DATABASE_URL
ARG TURSO_AUTH_TOKEN
ARG R2_ACCOUNT_ID
ARG R2_ACCESS_KEY_ID
ARG R2_SECRET_ACCESS_KEY
ARG R2_BUCKET_NAME
ARG REDIS_URL

# install bun
RUN curl -fsSL https://bun.sh/install | bash

# ensure bun is in the PATH
ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

# install ffmpeg
RUN apt-get update \
    && apt-get install -y ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# verify installations
RUN bun --version && \
    yt-dlp --version && \
    ffmpeg -version && \
    ffprobe -version

# set up a dir
WORKDIR /app

# copy app files into the container
COPY . .

RUN bun install

CMD ["bun", "start"]