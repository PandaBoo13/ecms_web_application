package com.ecms_web_application.OC01.service.request.handler;

import com.ecms_web_application.OC01.entity.enums.RequestType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Registry map RequestType → Handler.
 *
 * Spring inject tất cả bean implements RequestHandler.
 * Handler có supportedType() == null bị loại khỏi map (chỉ dùng làm fallback).
 * Loại nào không có Handler → dùng GenericHandler (không side-effect).
 */
@Slf4j
@Component
public class RequestHandlerRegistry {

    private final Map<RequestType, RequestHandler> handlers;
    private final GenericHandler genericHandler;

    public RequestHandlerRegistry(List<RequestHandler> all,
                                  GenericHandler genericHandler) {
        this.genericHandler = genericHandler;
        this.handlers = all.stream()
                .filter(h -> h.supportedType() != null)
                .collect(Collectors.toMap(RequestHandler::supportedType, h -> h));
        log.info("[RequestHandlerRegistry] Đã đăng ký {} handler: {}",
                handlers.size(),
                handlers.keySet().stream().map(Enum::name).sorted().collect(Collectors.toList()));
    }

    public RequestHandler get(RequestType type) {
        return handlers.getOrDefault(type, genericHandler);
    }

    public boolean hasHandler(RequestType type) {
        return handlers.containsKey(type);
    }
}