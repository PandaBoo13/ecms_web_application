package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.certificate.CertificateType;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CertificateTypeRepository extends IRepository<CertificateType, Long> {
    Optional<CertificateType> findByCode(String code);
    boolean existsByCode(String code);
}
