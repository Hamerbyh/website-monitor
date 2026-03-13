FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DATABASE_URL=postgresql://build-placeholder:build-placeholder@localhost:5432/build_placeholder
ENV BETTER_AUTH_SECRET=build-placeholder-secret
ENV BETTER_AUTH_URL=http://localhost:3000

RUN npm run build

EXPOSE 3000

CMD ["./scripts/docker-entrypoint.sh"]
