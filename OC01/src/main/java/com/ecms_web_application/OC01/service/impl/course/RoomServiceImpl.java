package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.dto.request.RoomRequest;
import com.ecms_web_application.OC01.dto.response.RoomResponse;
import com.ecms_web_application.OC01.entity.Room;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.RoomRepository;
import com.ecms_web_application.OC01.service.RoomService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;

    @Override
    @Transactional(readOnly = true)
    public List<RoomResponse> listActive() {
        return roomRepository.findByIsActiveTrue().stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomResponse> listAll() {
        return roomRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public RoomResponse getById(Long id) {
        return toResponse(getOrThrow(id));
    }

    @Override
    @Transactional
    public RoomResponse create(RoomRequest request) {
        if (request.getCode() != null && roomRepository.existsByCode(request.getCode())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Mã phòng đã tồn tại: " + request.getCode());
        }
        Room r = new Room();
        applyRequest(r, request);
        return toResponse(roomRepository.save(r));
    }

    @Override
    @Transactional
    public RoomResponse update(Long id, RoomRequest request) {
        Room r = getOrThrow(id);
        if (request.getCode() != null
                && !request.getCode().equals(r.getCode())
                && roomRepository.existsByCodeAndIdNot(request.getCode(), id)) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Mã phòng đã tồn tại");
        }
        applyRequest(r, request);
        return toResponse(roomRepository.save(r));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Room r = getOrThrow(id);
        roomRepository.delete(r);
        log.info("Xóa phòng id={}", id);
    }

    private Room getOrThrow(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Phòng không tồn tại"));
    }

    private void applyRequest(Room r, RoomRequest req) {
        if (req.getCode() != null) r.setCode(req.getCode().trim());
        if (req.getName() != null) r.setName(req.getName().trim());
        if (req.getCapacity() != null) r.setCapacity(req.getCapacity());
        if (req.getLocation() != null) r.setLocation(req.getLocation());
        if (req.getIsActive() != null) r.setIsActive(req.getIsActive());
    }

    private RoomResponse toResponse(Room r) {
        RoomResponse res = new RoomResponse();
        res.setId(r.getId());
        res.setCode(r.getCode());
        res.setName(r.getName());
        res.setCapacity(r.getCapacity());
        res.setLocation(r.getLocation());
        res.setIsActive(r.getIsActive());
        res.setCreatedAt(r.getCreatedAt());
        res.setUpdatedAt(r.getUpdatedAt());
        return res;
    }
}