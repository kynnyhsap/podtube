FROM node:18

# Install bun with curl
RUN curl -fsSL https://bun.sh/install | bash

# Ensure bun is in the PATH
ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

# Install ffmpeg with apt-get
RUN apt-get update \
    && apt-get install -y ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp with curl
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Verify installations
RUN bun --version && \
    yt-dlp --version && \
    ffmpeg -version && \
    ffprobe -version

# Set up a directory for your application
WORKDIR /app

# Copy your application files into the container
COPY . .

# Install application dependencies
RUN bun install

# Default command to keep container running
CMD ["bun", "run", "start"]