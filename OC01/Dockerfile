# ==========================================
# GIAI ĐOẠN 1: BUILD ỨNG DỤNG
# ==========================================
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy file pom.xml trước để tận dụng cache của Docker cho các dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy toàn bộ source code và tiến hành build (bỏ qua test để build nhanh hơn)
COPY src ./src
RUN mvn clean package -DskipTests

# ==========================================
# GIAI ĐOẠN 2: CHẠY ỨNG DỤNG (IMAGE NHẸ)
# ==========================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Cài đặt font chữ (Cần thiết nếu bạn dùng Apache POI để export Excel)
RUN apk add --no-cache fontconfig ttf-dejavu

# Copy file JAR từ giai đoạn build sang
COPY --from=build /app/target/*.jar app.jar

# Render sẽ inject biến PORT, nhưng ta mở cổng 8080 mặc định
EXPOSE 8080

# Cấu hình RAM cho gói Free của Render (512MB) để tránh bị OOM (Out of Memory) Kill
ENTRYPOINT ["java", "-Xmx380m", "-jar", "app.jar"]