package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Room;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends IRepository<Room, Long> {
    Optional<Room> findByCode(String code);
    boolean existsByCode(String code);
    boolean existsByCodeAndIdNot(String code, Long id);
    List<Room> findByIsActiveTrue();
}