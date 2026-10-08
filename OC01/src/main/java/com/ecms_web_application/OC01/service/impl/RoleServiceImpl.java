package com.ecms_web_application.OC01.service.impl.rbac;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ecms_web_application.OC01.config.security.PermissionManager;
import com.ecms_web_application.OC01.dto.request.rbac.RoleRequest;
import com.ecms_web_application.OC01.dto.response.rbac.RoleResponse;
import com.ecms_web_application.OC01.entity.Role;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.RoleRepository;
import com.ecms_web_application.OC01.service.RoleService;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;
    private final AccountRepository accountRepository;
    private final PermissionManager permissionManager;

    @Override
    @Transactional(readOnly = true)
    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAllByOrderByCodeAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public RoleResponse getRoleById(Long roleId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Role không tồn tại"));
        return toResponse(role);
    }

    @Override
    @Transactional
    public RoleResponse createRole(RoleRequest request) {
        if (roleRepository.existsByCode(request.getCode())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Mã role đã tồn tại: " + request.getCode());
        }

        Role role = new Role();
        role.setCode(request.getCode());
        role.setDescription(request.getDescription());

        Role saved = roleRepository.save(role);
        log.info("Tạo role mới: {}", saved.getCode());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public RoleResponse updateRole(Long roleId, RoleRequest request) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Role không tồn tại"));

        if (!role.getCode().equals(request.getCode())
                && roleRepository.existsByCode(request.getCode())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Mã role đã tồn tại: " + request.getCode());
        }

        role.setCode(request.getCode());
        role.setDescription(request.getDescription());

        Role saved = roleRepository.save(role);
        permissionManager.clearAllCache();
        log.info("Cập nhật role id={}", roleId);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void deleteRole(Long roleId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Role không tồn tại"));

        long count = accountRepository.findByRoleId(roleId).size();
        if (count > 0) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Không thể xóa role — còn " + count + " account đang sử dụng");
        }

        roleRepository.delete(role);
        permissionManager.clearAllCache();
        log.info("Xóa role: {}", role.getCode());
    }

    private RoleResponse toResponse(Role role) {
        RoleResponse res = new RoleResponse();
        res.setId(role.getId());
        res.setCode(role.getCode());
        res.setDescription(role.getDescription());
        res.setCreatedAt(role.getCreatedAt());
        res.setUpdatedAt(role.getUpdatedAt());
        return res;
    }
}