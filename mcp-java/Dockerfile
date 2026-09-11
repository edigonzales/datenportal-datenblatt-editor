# syntax=docker/dockerfile:1
FROM gradle:9.7.1-jdk25 AS build
WORKDIR /app
COPY settings.gradle build.gradle gradle.properties ./
COPY src ./src
RUN gradle bootJar --no-daemon

FROM eclipse-temurin:25-jre-noble
RUN useradd --system --create-home --uid 10001 app
WORKDIR /app
COPY --from=build /app/build/libs/datasheet-mcp.jar app.jar
ENV DATASHEET_HOST=0.0.0.0 DATASHEET_PORT=8000
USER app
EXPOSE 8000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
