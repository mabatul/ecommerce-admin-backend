# Local development image. Optimised for fast iteration (bind-mounted source,
# `next dev`) rather than image size — see infrastructure/README for the
# production build path used by the AWS pipeline.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"]
