package com.ecms_web_application.OC01.generic;

import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountRepository;
import lombok.Getter;
import lombok.Setter;
import org.passay.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;


import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

@Service
public class GeneralService {

    private final AccountRepository accountRepository;

    // Inject AccountRepository qua constructor
    public GeneralService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

//    // ============================================================
//    // Lấy tài khoản hiện tại từ Security Context
//    // ============================================================
//    public Account getCurrentAccount() {
//        // Lấy email (username) từ Security Context hiện tại
//        String email = SecurityContextHolder.getContext()
//                .getAuthentication()
//                .getName();
//
//        // Tìm account theo email trong DB
//        // Nếu không tìm thấy → trả về 401 Unauthorized
//        return accountRepository.findByEmail(email)
//                .orElseThrow(() -> new ErrorHandler(
//                        HttpStatus.UNAUTHORIZED,
//                        "Account not found"
//                ));
//    }
//
//    // ============================================================
//    // Lấy UserProfile gắn với Account
//    // ============================================================
//    public UserProfile getAssociatedUser(Account account) {
//        // Kiểm tra account có UserProfile hay không
//        if (account.getUserProfile() == null) {
//            throw new ErrorHandler(
//                    HttpStatus.BAD_REQUEST,
//                    "UserProfile not associated with the account"
//            );
//        }
//        // Trả về UserProfile tương ứng
//        return account.getUserProfile();
//    }

    // ============================================================
    // Lưu file vào thư mục chỉ định
    // ============================================================
    public String saveFile(MultipartFile file, String subDirectory) throws IOException {
        // Lấy tên file gốc + làm sạch path (tránh path traversal)
        String fileName = StringUtils.cleanPath(file.getOriginalFilename());

        // Xác định thư mục upload tuyệt đối trong project
        String uploadDir = System.getProperty("user.dir")
                + "/src/main/resources/static/"
                + subDirectory;
        // Tạo thư mục nếu chưa tồn tại
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }
        // Xác định đường dẫn đầy đủ của file đích
        Path filePath = uploadPath.resolve(fileName);
        // Lưu file từ request vào ổ đĩa
        file.transferTo(filePath.toFile());
        // Trả về đường dẫn tương đối để client truy cập
        return "/" + subDirectory + "/" + fileName;
    }

    // ============================================================
    // Xác thực mật khẩu theo policy
    // ============================================================
    public void validatePassword(String password) {
        // Cấu hình validator với các rule bảo mật
        PasswordValidator validator = new PasswordValidator(
                List.of(
                        new LengthRule(6, 128),                                 // 6-128 ký tự
                        new CharacterRule(EnglishCharacterData.UpperCase, 1),   // ≥1 hoa
                        new CharacterRule(EnglishCharacterData.LowerCase, 1),   // ≥1 thường
                        new CharacterRule(EnglishCharacterData.Digit, 1),       // ≥1 số
                        new CharacterRule(EnglishCharacterData.Special, 1),     // ≥1 ký tự đặc biệt
                        new WhitespaceRule()                                    // Không khoảng trắng
                )
        );
        // Chạy validate trên password
        RuleResult result = validator.validate(new PasswordData(password));
        // Nếu không hợp lệ → ném lỗi kèm danh sách message
        if (!result.isValid()) {
            throw new ErrorHandler(
                    HttpStatus.BAD_REQUEST,
                    String.join(", ", validator.getMessages(result))
            );
        }
    }

    // ============================================================
    // Lấy đường dẫn đầy đủ từ link tương đối
    // ============================================================
    public Path getFullPathFromLink(String link) {
        // Ghép path tuyệt đối tới thư mục static
        String filePath = System.getProperty("user.dir")
                + "/src/main/resources/static"
                + link;

        // Trả về Path object
        return Paths.get(filePath);
    }

    // ============================================================
    // Validate file tồn tại
    // ============================================================
    public void validateFileExists(Path path) {
        // Nếu file không tồn tại → ném 404
        if (!Files.exists(path)) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND, "File not found");
        }
    }

    // ============================================================
    // Đọc nội dung file + MIME type
    // ============================================================
    public FileData getFileData(Path path) throws IOException {
        // Xác định MIME type của file
        String mimeType = Files.probeContentType(path);

        // Fallback nếu OS không xác định được MIME
        if (mimeType == null) {
            mimeType = "application/octet-stream";
        }

        // Đọc toàn bộ nội dung file thành byte[]
        byte[] fileContent = Files.readAllBytes(path);

        // Trả về object chứa mimeType + content + fileName
        return new FileData(mimeType, fileContent, path.getFileName().toString());
    }

    // ============================================================
    // Inner class: FileData
    // ============================================================
    @Getter
    @Setter
    public static final class FileData {
        private final String mimeType;
        private final byte[] content;
        private final String fileName;

        public FileData(String mimeType, byte[] content, String fileName) {
            this.mimeType = mimeType;
            this.content = content;
            this.fileName = fileName;
        }

        public String mimeType() {
            return mimeType;
        }

        public byte[] content() {
            return content;
        }

        public String fileName() {
            return fileName;
        }

        // So sánh 2 FileData: mimeType + content + fileName
        @Override
        public boolean equals(Object obj) {
            if (obj == this) return true;
            if (obj == null || obj.getClass() != this.getClass()) return false;
            var that = (FileData) obj;
            return Objects.equals(this.mimeType, that.mimeType) &&
                    Arrays.equals(this.content, that.content) &&
                    Objects.equals(this.fileName, that.fileName);
        }

        // Hash dựa trên mimeType + content + fileName
        @Override
        public int hashCode() {
            return Objects.hash(mimeType, Arrays.hashCode(content), fileName);
        }

        @Override
        public String toString() {
            return "FileData[" +
                    "mimeType=" + mimeType + ", " +
                    "content=" + Arrays.toString(content) + ", " +
                    "fileName=" + fileName + ']';
        }
    }
}