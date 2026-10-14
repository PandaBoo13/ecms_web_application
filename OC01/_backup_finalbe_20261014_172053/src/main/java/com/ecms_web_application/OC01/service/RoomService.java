package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.RoomRequest;
import com.ecms_web_application.OC01.dto.response.RoomResponse;
import java.util.List;

public interface RoomService {
    List<RoomResponse> listActive();
    List<RoomResponse> listAll();
    RoomResponse getById(Long id);
    RoomResponse create(RoomRequest request);
    RoomResponse update(Long id, RoomRequest request);
    void delete(Long id);
}