FROM node:20-alpine
WORKDIR /app

# Install native dependencies required for sharp/libvips if needed
RUN apk add --no-cache vips-dev

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "src/app.js"]
