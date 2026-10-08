package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Role;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleRepository extends IRepository<Role, Long> {

    // Tìm role theo code (ADMIN, INSTRUCTOR, STUDENT)
    Optional<Role> findByCode(String code);

    // Kiểm tra code đã tồn tại chưa
    boolean existsByCode(String code);

    // Danh sách role sorted theo code (dropdown admin)
    List<Role> findAllByOrderByCodeAsc();

    // Batch lookup
    List<Role> findByCodeIn(List<String> codes);
}