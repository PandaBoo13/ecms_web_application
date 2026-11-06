package com.ecms_web_application.OC01.event;

/**
 * Phát ra sau khi request được duyệt hoặc từ chối.
 * Listener sẽ gửi notification cho requester.
 */
public record RequestReviewedEvent(Long requestId, boolean approved) { }