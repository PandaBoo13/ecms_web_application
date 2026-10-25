package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Permission;
import com.ecms_web_application.OC01.entity.RolePermission;
import com.ecms_web_application.OC01.entity.RolePermissionId;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RolePermissionRepository extends IRepository<RolePermission, RolePermissionId> {
    List<RolePermission> findByRole_Id(Long roleId);
    List<RolePermission> findByRole_IdAndIsEnabledTrue(Long roleId);
    Optional<RolePermission> findByRole_IdAndPermission_Id(Long roleId, Long permissionId);
    boolean existsByRole_IdAndPermission_Id(Long roleId, Long permissionId);

    @Query("""
        SELECT rp FROM RolePermission rp
        JOIN FETCH rp.permission p
        WHERE rp.role.id = :roleId
        ORDER BY p.module ASC, p.endpointPattern ASC
    """)
    List<RolePermission> findWithPermissionDetailByRoleId(@Param("roleId") Long roleId);

    @Query("""
        SELECT p FROM RolePermission rp
        JOIN rp.permission p
        WHERE rp.role.id = :roleId AND rp.isEnabled = true
        ORDER BY p.module ASC, p.endpointPattern ASC
    """)
    List<Permission> findEnabledPermissionsByRoleId(@Param("roleId") Long roleId);

    @Modifying
    @Query("DELETE FROM RolePermission rp WHERE rp.role.id = :roleId")
    void deleteAllByRoleId(@Param("roleId") Long roleId);

    @Modifying
    @Query("DELETE FROM RolePermission rp WHERE rp.permission.id = :permissionId")
    void deleteAllByPermissionId(@Param("permissionId") Long permissionId);
}