package com.ecms_web_application.OC01.generic;

import com.ecms_web_application.OC01.exception.ErrorHandler;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;


import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final String UPLOADS_PREFIX = "/uploads/";
    private static final int UPLOADS_PREFIX_LEN = UPLOADS_PREFIX.length();

    /** Root tuyệt đối, đã normalize — mọi path phải nằm dưới đây. */
    private final Path fileStorageLocation;

    public FileStorageService() {
        this.fileStorageLocation = Paths.get("uploads")
                .toAbsolutePath()
                .normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (IOException ex) {
            throw new RuntimeException("Could not create upload directory", ex);
        }
    }

    // ============================================================
    // PATH SAFETY — 4 LỚP DEFENSE
    // ============================================================

    /**
     * Resolve path an toàn từ input của client.
     *
     *  1. Reject null/empty.
     *  2. Reject absolute path (vì resolve() sẽ bỏ qua root).
     *  3. Resolve + normalize (xử lý ../, ./ , //, %2e, ...).
     *  4. Check kết quả PHẢI nằm dưới fileStorageLocation.
     *
     * @param input đường dẫn tương đối (có thể bắt đầu bằng "/uploads/")
     * @throws ErrorHandler nếu input không hợp lệ hoặc traversal
     */
    private Path resolveSafePath(String input) {
        if (input == null || input.trim().isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Đường dẫn không hợp lệ");
        }

        String cleanPath = stripUploadsPrefix(input.trim());

        // Lớp 1: reject absolute path
        Path raw = Paths.get(cleanPath);
        if (raw.isAbsolute()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Không chấp nhận đường dẫn tuyệt đối");
        }

        // Lớp 2: resolve + normalize
        Path target = this.fileStorageLocation.resolve(raw).normalize();

        // Lớp 3: PHẢI nằm dưới root
        if (!target.startsWith(this.fileStorageLocation)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Đường dẫn vượt quá phạm vi cho phép");
        }

        // Lớp 4: reject symlink (nếu file đã tồn tại)
        if (Files.exists(target) && Files.isSymbolicLink(target)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Symlink không được phép");
        }

        return target;
    }

    /** Xoá prefix "/uploads/" nếu có để tránh double-prefix. */
    private String stripUploadsPrefix(String path) {
        if (path.startsWith(UPLOADS_PREFIX)) {
            return path.substring(UPLOADS_PREFIX_LEN);
        }
        return path;
    }

    /** Resolve thư mục con (dùng cho subFolder/targetFolder) — cũng qua resolveSafePath. */
    private Path resolveSafeDirectory(String subFolder) {
        if (subFolder == null || subFolder.trim().isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Thư mục không được để trống");
        }
        return resolveSafePath(subFolder);
    }

    // ============================================================
    // STORE
    // ============================================================

    /**
     * Lưu file vào thư mục con.
     * File name dùng UUID → không dùng input của client.
     * subFolder vẫn phải qua resolveSafeDirectory.
     */
    public String storeFile(MultipartFile file, String subFolder) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }

        String originalFileName = file.getOriginalFilename();
        String fileExtension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
            // Giới hạn độ dài extension để tránh tên file kỳ quặc
            if (fileExtension.length() > 10) {
                fileExtension = "";
            }
        }

        // Không dùng client filename — dùng UUID
        String fileName = UUID.randomUUID() + fileExtension;

        Path targetDir;
        if (subFolder != null && !subFolder.isEmpty()) {
            targetDir = resolveSafeDirectory(subFolder);
            Files.createDirectories(targetDir);
        } else {
            targetDir = this.fileStorageLocation;
        }

        Path targetLocation = targetDir.resolve(fileName);
        Files.copy(file.getInputStream(), targetLocation,
                StandardCopyOption.REPLACE_EXISTING);

        // Trả relative path (không có "/uploads/" prefix)
        String relative = this.fileStorageLocation.relativize(targetLocation)
                .toString().replace("\\", "/");
        return relative;
    }

    /** Lưu file và trả về đường dẫn đầy đủ với prefix /uploads/. */
    public String storeFileWithPrefix(MultipartFile file, String subFolder) throws IOException {
        String relativePath = storeFile(file, subFolder);
        return relativePath != null ? UPLOADS_PREFIX + relativePath : null;
    }

    /** Xóa file cũ và lưu file mới. */
    public String replaceFile(MultipartFile newFile, String oldFilePath,
                              String subFolder) throws IOException {
        if (oldFilePath != null && !oldFilePath.isEmpty()) {
            deleteFile(oldFilePath);
        }
        return storeFileWithPrefix(newFile, subFolder);
    }

    // ============================================================
    // DELETE
    // ============================================================

    /**
     * Xóa file.
     * FIXED: dùng resolveSafePath → chặn traversal.
     * Trả false nếu path không hợp lệ (giữ behavior cũ của caller).
     */
    public boolean deleteFile(String filePath) {
        try {
            if (filePath == null || filePath.isEmpty()) {
                return false;
            }
            Path fileToDelete = resolveSafePath(filePath);
            return Files.deleteIfExists(fileToDelete);
        } catch (ErrorHandler | IOException ex) {
            return false;
        }
    }

    /** Xóa file an toàn (chỉ xóa nếu là file nội bộ). */
    public boolean deleteFileSafely(String filePath) {
        if (isExternalUrl(filePath)) {
            return false;
        }
        return deleteFile(filePath);
    }

    /**
     * Xóa thư mục và tất cả file bên trong.
     * FIXED: dùng resolveSafeDirectory.
     */
    public boolean deleteDirectory(String subFolder) {
        try {
            if (subFolder == null || subFolder.isEmpty()) {
                return false;
            }
            Path dirPath = resolveSafeDirectory(subFolder);

            // Bảo vệ: không cho xóa root
            if (dirPath.equals(this.fileStorageLocation)) {
                return false;
            }

            if (Files.exists(dirPath)) {
                Files.walk(dirPath)
                        .sorted(java.util.Comparator.reverseOrder())
                        .forEach(path -> {
                            try {
                                Files.deleteIfExists(path);
                            } catch (IOException ignored) {
                            }
                        });
                return true;
            }
            return false;
        } catch (ErrorHandler | IOException e) {
            return false;
        }
    }

    // ============================================================
    // DIRECTORY
    // ============================================================

    /**
     * Tạo thư mục con.
     * FIXED: dùng resolveSafeDirectory.
     */
    public Path createDirectory(String subFolder) throws IOException {
        Path dirPath = resolveSafeDirectory(subFolder);
        return Files.createDirectories(dirPath);
    }

    // ============================================================
    // PATH QUERIES
    // ============================================================

    /**
     * Lấy Path từ đường dẫn tương đối.
     * FIXED: dùng resolveSafePath → throw ErrorHandler nếu traversal.
     */
    public Path getFilePath(String relativePath) {
        return resolveSafePath(relativePath);
    }

    public boolean fileExists(String relativePath) {
        try {
            Path filePath = getFilePath(relativePath);
            return Files.exists(filePath) && Files.isReadable(filePath);
        } catch (Exception e) {
            return false;
        }
    }

    public long getFileSize(String relativePath) throws IOException {
        Path filePath = getFilePath(relativePath);
        return Files.size(filePath);
    }

    public String getMimeType(String relativePath) {
        try {
            Path filePath = getFilePath(relativePath);
            return Files.probeContentType(filePath);
        } catch (IOException e) {
            return "application/octet-stream";
        }
    }

    // ============================================================
    // COPY / MOVE
    // ============================================================

    /**
     * Copy file từ sourcePath → targetFolder.
     * FIXED: cả sourcePath và targetFolder đều qua resolveSafe*.
     */
    public String copyFile(String sourcePath, String targetFolder) throws IOException {
        if (sourcePath == null || sourcePath.isEmpty()) {
            return null;
        }

        Path sourceFile = resolveSafePath(sourcePath);
        if (!Files.exists(sourceFile)) {
            return null;
        }

        Path targetDir = resolveSafeDirectory(targetFolder);
        Files.createDirectories(targetDir);

        String fileName = sourceFile.getFileName().toString();
        Path targetFile = targetDir.resolve(fileName);

        // Defense-in-depth: target cuối cùng vẫn phải trong root
        if (!targetFile.normalize().startsWith(this.fileStorageLocation)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Đường dẫn đích không hợp lệ");
        }

        Files.copy(sourceFile, targetFile, StandardCopyOption.REPLACE_EXISTING);

        String relative = this.fileStorageLocation.relativize(targetFile.normalize())
                .toString().replace("\\", "/");
        return relative;
    }

    /**
     * Move file = copy + delete source.
     * FIXED: kế thừa safety từ copyFile và deleteFile.
     */
    public String moveFile(String sourcePath, String targetFolder) throws IOException {
        String newPath = copyFile(sourcePath, targetFolder);
        if (newPath != null) {
            deleteFile(sourcePath);
        }
        return newPath;
    }

    // ============================================================
    // UTILITY
    // ============================================================

    public boolean isExternalUrl(String filePath) {
        return filePath != null
                && (filePath.startsWith("http://") || filePath.startsWith("https://"));
    }

    public String sanitizeFileName(String fileName) {
        if (fileName == null) return null;
        return fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    public String getFileExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) return "";
        return fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
    }

    public String generateUniqueFileName(String originalFileName) {
        String extension = getFileExtension(originalFileName);
        return UUID.randomUUID() + extension;
    }

    // ============================================================
    // SUB-FOLDER PATH HELPERS (server-generated — an toàn)
    // ============================================================

    public String getLessonResourcePath(Integer courseId, Integer lessonId) {
        return String.format("lessons/%d/%d", courseId, lessonId);
    }

    public String getCourseThumbnailPath() {
        return "courses/thumbnails";
    }

    public String getAvatarPath(Integer accountId) {
        return String.format("avatars/%d", accountId);
    }

    public String getCertificatePath(Integer lecturerProfileId) {
        return String.format("certificates/%d", lecturerProfileId);
    }

    public String getCourseResourcePath(Integer courseId) {
        return String.format("resources/%d", courseId);
    }

    /**
     * Lấy tên file từ đường dẫn.
     * Chỉ dùng để hiển thị, không dùng để resolve path.
     */
    public String getFileNameFromPath(String filePath) {
        if (filePath == null || filePath.isEmpty()) return null;
        String cleanPath = stripUploadsPrefix(filePath);
        Path fileName = Paths.get(cleanPath).getFileName();
        return fileName != null ? fileName.toString() : null;
    }

    /**
     * Lấy thư mục cha từ đường dẫn.
     * Chỉ dùng để hiển thị.
     */
    public String getParentFolder(String filePath) {
        if (filePath == null || filePath.isEmpty()) return null;
        String cleanPath = stripUploadsPrefix(filePath);
        Path parent = Paths.get(cleanPath).getParent();
        return parent != null ? parent.toString().replace("\\", "/") : null;
    }
}