package com.ecms_web_application.OC01.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ecms_web_application.OC01.dto.request.SpecializationAddRequest;
import com.ecms_web_application.OC01.dto.response.InstructorSpecializationResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Category;
import com.ecms_web_application.OC01.entity.InstructorSpecialization;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.CategoryRepository;
import com.ecms_web_application.OC01.repository.InstructorSpecializationRepository;
import com.ecms_web_application.OC01.service.InstructorSpecializationService;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class InstructorSpecializationServiceImpl implements InstructorSpecializationService {

    private final InstructorSpecializationRepository specializationRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;

    private static final String INSTRUCTOR_ROLE = "INSTRUCTOR";

    // ============================================================
    // QUERY
    // ============================================================

    @Override
    @Transactional(readOnly = true)
    public List<InstructorSpecializationResponse> getByAccount(Long accountId) {
        ensureAccountExists(accountId);
        return specializationRepository.findWithCategoryByAccountId(accountId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<InstructorSpecializationResponse> getByCategory(Long categoryId) {
        if (!categoryRepository.existsById(categoryId)) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Category không tồn tại");
        }
        return specializationRepository.findWithAccountByCategoryId(categoryId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<InstructorSpecializationResponse> getPrimaryOfAccount(Long accountId) {
        ensureAccountExists(accountId);
        return specializationRepository.findByAccount_IdAndIsPrimaryTrue(accountId)
                .map(s -> List.of(toResponse(s)))
                .orElse(List.of());
    }

    // ============================================================
    // ADD
    // ============================================================

    @Override
    @Transactional
    public InstructorSpecializationResponse add(Long accountId, SpecializationAddRequest request) {
        // 1. Validate account
        Account account = ensureInstructor(accountId);

        // 2. Validate category
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Category không tồn tại"));

        if (Boolean.FALSE.equals(category.getIsActive())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Category đã bị vô hiệu hóa");
        }

        // 3. Check đã gán chưa
        if (specializationRepository.existsByAccount_IdAndCategory_Id(accountId, category.getId())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chuyên môn này đã được gán cho giảng viên");
        }

        // 4. Nếu isPrimary = true → unset primary cũ
        boolean makePrimary = Boolean.TRUE.equals(request.getIsPrimary());
        if (makePrimary) {
            specializationRepository.resetPrimaryFlag(accountId);
        }

        // 5. Tạo bản ghi mới
        InstructorSpecialization spec = new InstructorSpecialization();
        spec.setAccount(account);
        spec.setCategory(category);
        spec.setIsPrimary(makePrimary);
        spec.setYearsOfExp(request.getYearsOfExp());

        InstructorSpecialization saved = specializationRepository.save(spec);
        log.info("Gán chuyên môn {} cho giảng viên {} (primary={})",
                category.getName(), account.getEmail(), makePrimary);

        return toResponse(saved);
    }

    // ============================================================
    // REMOVE
    // ============================================================

    @Override
    @Transactional
    public void remove(Long accountId, Long categoryId) {
        InstructorSpecialization spec = specializationRepository
                .findByAccount_IdAndCategory_Id(accountId, categoryId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Giảng viên chưa có chuyên môn này"));

        specializationRepository.delete(spec);
        log.info("Xóa chuyên môn categoryId={} khỏi giảng viên accountId={}", categoryId, accountId);
    }

    @Override
    @Transactional
    public void removeAll(Long accountId) {
        ensureAccountExists(accountId);
        specializationRepository.deleteAllByAccountId(accountId);
        log.info("Xóa tất cả chuyên môn của accountId={}", accountId);
    }

    // ============================================================
    // SET PRIMARY
    // ============================================================

    @Override
    @Transactional
    public void setPrimary(Long accountId, Long categoryId) {
        InstructorSpecialization spec = specializationRepository
                .findByAccount_IdAndCategory_Id(accountId, categoryId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Giảng viên chưa có chuyên môn này"));

        if (Boolean.TRUE.equals(spec.getIsPrimary())) {
            return;  // đã là primary rồi
        }

        // 1. Reset cờ primary cũ
        specializationRepository.resetPrimaryFlag(accountId);

        // 2. Set cờ primary mới
        spec.setIsPrimary(true);
        specializationRepository.save(spec);
        log.info("Đặt chuyên môn chính: accountId={}, categoryId={}", accountId, categoryId);
    }

    @Override
    @Transactional
    public void clearPrimary(Long accountId) {
        ensureAccountExists(accountId);
        specializationRepository.resetPrimaryFlag(accountId);
        log.info("Bỏ cờ chuyên môn chính cho accountId={}", accountId);
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private Account ensureAccountExists(Long accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Account không tồn tại"));
    }

    private Account ensureInstructor(Long accountId) {
        Account a = ensureAccountExists(accountId);
        if (a.getRole() == null || !INSTRUCTOR_ROLE.equals(a.getRole().getCode())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Chỉ giảng viên mới có chuyên môn");
        }
        return a;
    }

    private InstructorSpecializationResponse toResponse(InstructorSpecialization spec) {
        InstructorSpecializationResponse res = new InstructorSpecializationResponse();

        if (spec.getAccount() != null) {
            res.setAccountId(spec.getAccount().getId());
            res.setInstructorEmail(spec.getAccount().getEmail());
            if (spec.getAccount().getUserProfile() != null) {
                res.setInstructorName(spec.getAccount().getUserProfile().getFullName());
            }
        }

        if (spec.getCategory() != null) {
            res.setCategoryId(spec.getCategory().getId());
            res.setCategoryName(spec.getCategory().getName());
            res.setCategorySlug(spec.getCategory().getSlug());
        }

        res.setIsPrimary(spec.getIsPrimary());
        res.setYearsOfExp(spec.getYearsOfExp());
        res.setCreatedAt(spec.getCreatedAt());

        return res;
    }
}