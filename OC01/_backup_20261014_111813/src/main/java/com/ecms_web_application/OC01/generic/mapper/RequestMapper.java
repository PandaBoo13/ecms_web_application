//package com.ecms_web_application.OC01.generic.mapper;
//
//import com.fasterxml.jackson.core.JsonProcessingException;
//import com.fasterxml.jackson.databind.ObjectMapper;
//import lombok.RequiredArgsConstructor;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.stereotype.Component;
//import org.wisdom.oc01.dto.response.request.RequestDetailResponse;
//import org.wisdom.oc01.entity.Account;
//import org.wisdom.oc01.entity.Request;
//import org.wisdom.oc01.entity.UserProfile;
//
//@Slf4j
//@Component
//@RequiredArgsConstructor
//public class RequestMapper {
//
//    private final ObjectMapper objectMapper;
//
//    public RequestDetailResponse toResponse(Request request) {
//        if (request == null) return null;
//
//        RequestDetailResponse res = new RequestDetailResponse();
//        res.setId(request.getId());
//        res.setCode(request.getCode());
//        res.setRequestType(request.getRequestType());
//        res.setTitle(request.getTitle());
//        res.setDescription(request.getDescription());
//        res.setPayload(request.getPayload());
//        res.setRejectReason(request.getRejectReason());
//        res.setProcessedAt(request.getProcessedAt());
//        res.setCreatedAt(request.getCreatedAt());
//        res.setUpdatedAt(request.getUpdatedAt());
//        res.setIsApproved(request.getIsApproved());
//
//        // Status string
//        res.setStatus(request.isPending() ? "PENDING"
//                : request.isApprovedRequest() ? "APPROVED"
//                : "REJECTED");
//
//        Account sender = request.getSender();
//        if (sender != null) {
//            res.setSenderId(sender.getId());
//            res.setSenderEmail(sender.getEmail());
//            UserProfile profile = sender.getUserProfile();
//            if (profile != null) res.setSenderFullName(profile.getFullName());
//        }
//
//        Account receiver = request.getReceiver();
//        if (receiver != null) {
//            res.setReceiverId(receiver.getId());
//            res.setReceiverEmail(receiver.getEmail());
//        }
//
//        Account processedBy = request.getProcessedBy();
//        if (processedBy != null) {
//            res.setProcessedById(processedBy.getId());
//            res.setProcessedByEmail(processedBy.getEmail());
//        }
//
//        return res;
//    }
//
//    public String toJsonString(Object obj) {
//        if (obj == null) return null;
//        try {
//            return objectMapper.writeValueAsString(obj);
//        } catch (JsonProcessingException e) {
//            log.error("Không serialize được payload: {}", obj, e);
//            throw new RuntimeException("Payload không hợp lệ", e);
//        }
//    }
//}