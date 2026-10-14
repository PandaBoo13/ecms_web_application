package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Permission;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PermissionRepository extends IRepository<Permission, Long> {

    // ============================================================
    // Lookup cơ bản
    // ============================================================
    Optional<Permission> findByMethodAndEndpointPattern(String method, String endpointPattern);

    boolean existsByMethodAndEndpointPattern(String method, String endpointPattern);

    List<Permission> findByModule(String module);

    List<Permission> findByMethod(String method);

    // ============================================================
    // Pagination + filter (admin UI)
    // ============================================================
    @Query("""
        SELECT p FROM Permission p
        WHERE (:module IS NULL OR p.module = :module)
          AND (:search IS NULL
               OR LOWER(p.endpointPattern) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(p.description)     LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY p.module ASC, p.endpointPattern ASC
    """)
    Page<Permission> searchPermissions(
            @Param("module") String module,
            @Param("search") String search,
            Pageable pageable
    );

    // ============================================================
    // Distinct modules (dropdown filter)
    // ============================================================
    @Query("""
        SELECT DISTINCT p.module
        FROM Permission p
        WHERE p.module IS NOT NULL AND p.module <> ''
        ORDER BY p.module ASC
    """)
    List<String> findAllDistinctModules();
}